import { format, formatDistanceToNow } from 'date-fns';

/**
 * Safely formats a date that could be a Date object or Firestore Timestamp
 * @param date - The date to format (Date object or Firestore Timestamp)
 * @param formatString - The format string for date-fns
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export function safeFormat(
  date: Date | any, 
  formatString: string, 
  fallback: string = 'Unknown'
): string {
  try {
    if (!date) return fallback;
    
    const dateObj = date instanceof Date ? date : date.toDate();
    
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return fallback;
  }
}

/**
 * Safely formats a date as a relative time (e.g., "2 hours ago")
 * @param date - The date to format (Date object or Firestore Timestamp)
 * @param options - Options for formatDistanceToNow
 * @param fallback - Fallback text if date is invalid
 * @returns Relative time string or fallback
 */
export function safeFormatDistance(
  date: Date | any,
  options?: { addSuffix?: boolean },
  fallback: string = 'Unknown'
): string {
  try {
    if (!date) return fallback;
    
    const dateObj = date instanceof Date ? date : date.toDate();
    
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    return formatDistanceToNow(dateObj, options);
  } catch (error) {
    console.warn('Date distance formatting error:', error);
    return fallback;
  }
}

