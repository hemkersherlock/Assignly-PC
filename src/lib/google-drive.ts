
'use server';

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

/**
 * Interface for the serializable file data passed from the client.
 */
export interface SerializableFile {
  name: string;
  type: string;
  size: number;
  data: number[];
}

type ServiceAccountCreds = { client_email: string; private_key: string };

function tryParseJson(text: string): any {
  try { return JSON.parse(text); } catch { return null; }
}

function maybeBase64Decode(text: string): string {
  try {
    if (!text.trim().startsWith('{')) {
      return Buffer.from(text, 'base64').toString('utf8');
    }
  } catch {}
  return text;
}

/**
 * Retrieves and validates Google Drive credentials from environment variables.
 * @returns {ServiceAccountCreds} The validated credentials.
 * @throws {Error} If required environment variables are not set or invalid.
 */
function getCredentials(): ServiceAccountCreds {
    if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
        throw new Error('Google Drive is not configured. Missing required environment variable: GOOGLE_DRIVE_PARENT_FOLDER_ID.');
    }

    const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    const emailEnv = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
    const keyEnvRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

    if (jsonEnv && jsonEnv !== '{}') {
        const text = maybeBase64Decode(jsonEnv);
        const parsed = tryParseJson(text);
        if (parsed) {
            const client_email = parsed.client_email as string | undefined;
            const private_key_raw = parsed.private_key as string | undefined;
            if (client_email && private_key_raw) {
                return { client_email, private_key: private_key_raw.replace(/\\n/g, '\n') };
            }
        }
    }

    if (emailEnv && keyEnvRaw) {
        const private_key = keyEnvRaw.replace(/\\n/g, '\n');
        return { client_email: emailEnv, private_key };
    }

    throw new Error('Credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON or base64) or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY.');
}

// Log diagnostic info once at server start
const credsForLog = getCredentials();
console.info(`[Assignly] Google Drive integration loaded. Using SA: ${credsForLog.client_email}, Parent Folder ID Prefix: ${process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID?.substring(0, 6)}...`);


/**
 * Creates and returns an authenticated Google Drive API client for each request.
 * @returns {object} An object containing the drive client and the service account email.
 */
function getDriveClient(): { drive: drive_v3.Drive, saEmail: string } {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    saEmail: credentials.client_email,
  };
}


/**
 * Verifies that the service account has access to the parent folder and it's a valid folder.
 * @param drive - The authenticated Google Drive client.
 * @param parentId - The ID of the parent folder.
 * @param saEmail - The service account email address.
 * @throws {Error} If the parent folder is not accessible or invalid.
 */
async function verifyParentFolderAccess(drive: drive_v3.Drive, parentId: string, saEmail: string) {
    try {
        const response = await drive.files.get({
            fileId: parentId,
            fields: 'id, name, mimeType, trashed',
            supportsAllDrives: true,
        });

        // Check if it's a regular folder or shared drive
        if (response.data.mimeType !== 'application/vnd.google-apps.folder' && 
            response.data.mimeType !== 'application/vnd.google-apps.shared-drive') {
            throw new Error(`The specified GOOGLE_DRIVE_PARENT_FOLDER_ID does not point to a folder or shared drive.`);
        }

        if (response.data.trashed) {
            throw new Error(`The specified parent folder is in the trash. Please restore it.`);
        }
    } catch (err: any) {
        const status = err?.code || err?.response?.status;
        console.error('Parent folder access check failed:', { status, parentId, saEmail });
        
        if (status === 404 || status === 403) {
            throw new Error(`Parent folder not accessible (API Status: ${status}). Please verify that GOOGLE_DRIVE_PARENT_FOLDER_ID is correct and that the folder is shared with the service account email "${saEmail}" as an "Editor".`);
        }
        throw new Error(`Failed to access parent folder. Ensure it exists and the service account has permissions. API Status: ${status}`);
    }
}


/**
 * Handles API errors and maps them to user-friendly, actionable messages.
 * @param {any} error - The error object caught from the Google API call.
 * @param {string} context - A string describing the operation that failed.
 * @returns {Error} A new Error with a user-friendly message.
 */
function handleGoogleApiError(error: any, context: string): Error {
  const status = error?.code || error?.response?.status;
  const originalMessage = error.message || 'An unknown error occurred.';

  console.error(`Google Drive API Error during ${context}:`, {
      status: status,
      message: originalMessage,
      errors: error.errors
  });

  if (status === 401) {
    return new Error(
      'Google Drive authentication failed (Unauthorized). Please check if the service account credentials in your environment variables are correct and valid.'
    );
  }
  if (status === 403) {
    console.error('403 Permission Denied Details:', {
      context,
      originalMessage,
      error: error.errors
    });
    return new Error(
      `Permission denied (403). This could be:\n1. Google Drive API not enabled in GCP project\n2. Shared drive not shared with service account: ${process.env.GOOGLE_DRIVE_CLIENT_EMAIL}\n3. Service account needs "Content manager" role in shared drive\n4. Original error: ${originalMessage}`
    );
  }
  if (status === 404) {
    return new Error(
      `Resource not found (404). If creating a folder, verify that the GOOGLE_DRIVE_PARENT_FOLDER_ID is correct. If uploading a file, this could indicate a temporary issue.`
    );
  }
  if (status === 429) {
    return new Error('Google Drive API rate limit exceeded. Please try again later.');
  }

  return new Error(`A Google Drive API error occurred while ${context}. Status: ${status || 'unknown'}. Message: ${originalMessage}`);
}


/**
 * Creates a new folder for an order in Google Drive.
 * @param {string} orderId - The unique ID of the order.
 * @returns {Promise<string>} The ID of the newly created folder.
 * @throws {Error} If folder creation fails.
 */
export async function createOrderFolder(orderId: string): Promise<string> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
  
  try {
    const { drive, saEmail } = getDriveClient();
    await verifyParentFolderAccess(drive, parentFolderId, saEmail);

    const fileMetadata = {
      name: `Order_${orderId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true, // Changed back to true for shared drives
    });
    
    return folder.data.id!;
  } catch (error) {
    // If it's one of our specific verification errors, just re-throw it.
    if (error instanceof Error && (error.message.includes('(API Status: 404)') || error.message.includes('(API Status: 403)'))) {
        throw error;
    }
    // Otherwise, wrap it in the generic handler.
    throw handleGoogleApiError(error, `creating folder for order ${orderId}`);
  }
}

/**
 * Uploads a file to a specified folder in Google Drive.
 * @param {SerializableFile} fileData - The serializable file object from the client.
 * @param {string} folderId - The ID of the parent folder in Google Drive.
 * @returns {Promise<{id: string, webViewLink: string}>} An object containing the new file's ID and public view link.
 * @throws {Error} If file upload fails.
 */
export async function uploadFileToDrive(
  fileData: SerializableFile,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  let fileId: string | null = null;
  const { drive, saEmail } = getDriveClient();
  try {
    console.log(`[Google Drive] Starting upload: ${fileData.name} (${fileData.size} bytes, ${fileData.data.length} array elements)`);
    console.log(`[Google Drive] Service Account: ${saEmail}`);
    console.log(`[Google Drive] Target folder: ${folderId}`);
    
    // First, verify we can access the folder and check if it's a shared drive
    try {
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, driveId',
        supportsAllDrives: true,
      });
      console.log(`[Google Drive] Folder info:`, folderInfo.data);
      
      // Check if this is actually a shared drive
      if (folderInfo.data.mimeType === 'application/vnd.google-apps.folder' && !folderInfo.data.driveId) {
        throw new Error(`This is a regular folder, not a shared drive! Regular folders don't work with service accounts. You need to use a shared drive ID. Current ID: ${folderId}`);
      }
      
      if (folderInfo.data.mimeType === 'application/vnd.google-apps.shared-drive') {
        console.log(`[Google Drive] ✅ Confirmed: This is a shared drive`);
      } else if (folderInfo.data.driveId) {
        console.log(`[Google Drive] ✅ Confirmed: This is a folder within a shared drive (driveId: ${folderInfo.data.driveId})`);
      }
      
    } catch (accessError: any) {
      console.error(`[Google Drive] Cannot access folder ${folderId}:`, accessError.message);
      throw new Error(`Cannot access folder ${folderId}. Make sure the shared drive is shared with service account ${saEmail} as "Content manager". Error: ${accessError.message}`);
    }
    
    const fileMetadata = {
      name: fileData.name,
      parents: [folderId],
    };

    // Convert the data array back to Buffer
    const buffer = Buffer.from(new Uint8Array(fileData.data));
    console.log(`[Google Drive] Buffer size: ${buffer.length} bytes`);
    
    const media = {
      mimeType: fileData.type,
      body: Readable.from(buffer),
    };

    console.log(`[Google Drive] Creating file in folder: ${folderId}`);
    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true, // Changed back to true for shared drives
    });

    fileId = uploadedFile.data.id!;
    console.log(`[Google Drive] File created with ID: ${fileId}`);
    
    if (!fileId) {
      throw new Error('File ID was not returned from Google Drive API.');
    }

    // Skip public permissions for now to avoid quota issues
    console.log(`[Google Drive] File uploaded successfully: ${fileId}`);
    
    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return { id: fileId, webViewLink };

  } catch (error) {
    throw handleGoogleApiError(error, `uploading file "${fileData.name}"`);
  }
}

/**
 * Interface for test results
 */
export interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

/**
 * Tests the Google Drive integration setup
 */
export async function testGoogleDriveSetup(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Test 1: Credentials
    const { drive, saEmail } = getDriveClient();
    results.push({
      name: 'Credentials Validation',
      success: true,
      message: `Service account: ${saEmail}`
    });

    // Test 2: Parent folder access
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
    await verifyParentFolderAccess(drive, parentId, saEmail);
    results.push({
      name: 'Parent Folder Access',
      success: true,
      message: `Parent folder accessible: ${parentId.substring(0, 8)}...`
    });

    // Test 3: Create test folder
    const testFolder = await drive.files.create({
      requestBody: {
        name: `Test_Folder_${Date.now()}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    
    results.push({
      name: 'Folder Creation',
      success: true,
      message: `Test folder created: ${testFolder.data.id}`
    });

    // Test 4: Upload test file
    const testFileData = Buffer.from('Test file content for Google Drive integration');
    const testFile = await drive.files.create({
      requestBody: {
        name: 'test-file.txt',
        parents: [testFolder.data.id!],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(testFileData),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    results.push({
      name: 'File Upload',
      success: true,
      message: `Test file uploaded: ${testFile.data.id}`
    });

    // Cleanup test folder
    await drive.files.delete({
      fileId: testFolder.data.id!,
      supportsAllDrives: true,
    });

    results.push({
      name: 'Cleanup',
      success: true,
      message: 'Test folder cleaned up successfully'
    });

  } catch (error: any) {
    results.push({
      name: 'Google Drive Test',
      success: false,
      message: error.message || 'Unknown error occurred'
    });
  }

  return results;
}
