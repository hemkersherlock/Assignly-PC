'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Interface for the serializable file data passed from the client.
 */
export interface SerializableFile {
  name: string;
  type: string;
  size: number;
  data: number[];
}

/**
 * Uploads a file to Cloudinary
 * @param {SerializableFile} fileData - The serializable file object from the client.
 * @param {string} orderId - The order ID to organize files.
 * @returns {Promise<{id: string, url: string}>} An object containing the public ID and URL.
 * @throws {Error} If file upload fails.
 */
export async function uploadFileToCloudinary(
  fileData: SerializableFile,
  orderId: string
): Promise<{ id: string; url: string }> {
  try {
    console.log(`[Cloudinary] Starting upload: ${fileData.name} (${fileData.size} bytes)`);
    
    // Convert the data array back to Buffer
    const buffer = Buffer.from(new Uint8Array(fileData.data));
    console.log(`[Cloudinary] Buffer size: ${buffer.length} bytes`);
    
    // Create a unique public ID
    const publicId = `assignly/orders/${orderId}/${Date.now()}_${fileData.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    console.log(`[Cloudinary] Uploading with public ID: ${publicId}`);
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'auto', // Automatically detect file type
          folder: `assignly/orders/${orderId}`,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error(`[Cloudinary] Upload error:`, error);
            reject(error);
          } else {
            console.log(`[Cloudinary] Upload successful:`, result);
            resolve(result);
          }
        }
      ).end(buffer);
    });
    
    const uploadResult = result as any;
    
    console.log(`[Cloudinary] File uploaded successfully: ${uploadResult.public_id}`);
    console.log(`[Cloudinary] URL: ${uploadResult.secure_url}`);
    
    return { 
      id: uploadResult.public_id, 
      url: uploadResult.secure_url 
    };
    
  } catch (error: any) {
    console.error(`[Cloudinary] Upload failed for ${fileData.name}:`, error);
    throw new Error(`Failed to upload file "${fileData.name}" to Cloudinary: ${error.message}`);
  }
}

/**
 * Creates a folder reference for an order (Cloudinary organizes by folder path)
 * @param {string} orderId - The unique ID of the order.
 * @returns {Promise<string>} The folder path for the order.
 */
export async function createOrderFolder(orderId: string): Promise<string> {
  const folderPath = `assignly/orders/${orderId}`;
  console.log(`[Cloudinary] Created folder path: ${folderPath}`);
  return folderPath;
}

