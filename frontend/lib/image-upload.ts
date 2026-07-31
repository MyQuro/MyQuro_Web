/**
 * Image Upload Utility for ImgBB
 * Handles image uploads with drag & drop support
 */

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '8d0e92e8c1f7e9f32e6c43c1d9e8b7a1';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload image to ImgBB
 */
export async function uploadToImgBB(file: File): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please upload an image file' };
    }

    // Check size (max 32MB for ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      return { success: false, error: 'Image must be less than 32MB' };
    }

    // Convert to base64
    const base64 = await fileToBase64(file);
    const base64Data = base64.split(',')[1]; // Remove data:image/... prefix

    // Upload to ImgBB
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Data);

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success && data.data?.url) {
      return { success: true, url: data.data.url };
    } else {
      return { success: false, error: data.error?.message || 'Upload failed' };
    }
  } catch (error: any) {
    console.error('ImgBB upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Convert File to Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Validate image dimensions (optional)
 */
export async function validateImageDimensions(
  file: File,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const { width, height } = img;
      
      if (maxWidth && width > maxWidth) {
        resolve({ valid: false, width, height, error: `Width must be less than ${maxWidth}px` });
      } else if (maxHeight && height > maxHeight) {
        resolve({ valid: false, width, height, error: `Height must be less than ${maxHeight}px` });
      } else {
        resolve({ valid: true, width, height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, width: 0, height: 0, error: 'Invalid image file' });
    };

    img.src = url;
  });
}
