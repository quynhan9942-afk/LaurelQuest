/// <reference types="vite/client" />
import { auth } from './firebase';

export async function prepareImageBlob(
  fileOrBlobOrDataUrl: File | Blob | string,
  maxDimension = 1600,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể đọc file ảnh. Định dạng không hợp lệ.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Khởi tạo canvas nén ảnh thất bại.'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Chuyển đổi nén ảnh thất bại.'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      if (typeof fileOrBlobOrDataUrl === 'string') {
        img.src = fileOrBlobOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Lỗi đọc file từ đĩa.'));
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(fileOrBlobOrDataUrl);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Upload student photo to Cloudinary and return HTTPS secure_url.
 * Folder path structure: studentPhotos/{teacherUid}/{schoolYear}/{classId}
 * Public ID: {studentId}_{timestamp}
 */
export async function uploadStudentPhotoToCloudinary(
  fileOrBlobOrDataUrl: File | Blob | string,
  studentId: string | number = 'student',
  classId: string = 'thcs_nguyenvancu_6a3',
  teacherUidParam?: string
): Promise<string> {
  const env = (import.meta as any).env || {};
  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Thiếu cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET). Vui lòng thêm hai biến này vào môi trường.'
    );
  }

  const currentUser = auth.currentUser;
  const teacherUid = currentUser?.uid || teacherUidParam || 'public_teacher';
  const schoolYear = '2025-2026';
  const timestamp = Date.now();
  const folderPath = `studentPhotos/${teacherUid}/${schoolYear}/${classId}`;
  const publicId = `${studentId}_${timestamp}`;

  // 1. Resize & compress image (max 1600px edge)
  const compressedBlob = await prepareImageBlob(fileOrBlobOrDataUrl, 1600, 0.85);

  // 2. Prepare Cloudinary FormData
  const formData = new FormData();
  formData.append('file', compressedBlob, `${publicId}.jpg`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folderPath);
  formData.append('public_id', publicId);

  // 3. Upload to Cloudinary Unsigned Upload API
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || response.statusText || 'Lỗi không xác định';
      throw new Error(`Cloudinary upload thất bại: ${errorMsg}`);
    }

    if (!data.secure_url) {
      throw new Error('Không nhận được secure_url từ Cloudinary.');
    }

    return data.secure_url;
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    throw new Error(err?.message || 'Không thể tải ảnh lên Cloudinary.');
  }
}
