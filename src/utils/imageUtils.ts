import { ClassData } from '../types';

/**
 * Resizes and compresses a Data URL image to maxDim (default 120px) and JPEG quality (default 0.65).
 * A 120x120 JPEG image at 0.65 quality is typically ~3KB - 5KB, preventing Firestore document size limit issues.
 */
export function compressDataUrl(dataUrl: string, maxDim = 120, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    if (dataUrl.length < 5000) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Calculates actual UTF-8 byte size of an object/string to enforce Firestore 1MB limit.
 */
export function getUtf8ByteSize(obj: any): number {
  try {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length;
    }
    return str.length * 1.2;
  } catch {
    return 1_000_000;
  }
}

/**
 * Synchronous optimization of ClassData before saving to Firestore to enforce 1MB document limit.
 * Hard limit: Firestore maximum document size is 1,048,576 bytes (1MB).
 */
export function sanitizeAndOptimizeClassData(data: ClassData): ClassData {
  if (!data) return data;

  // Deep clone
  const cloned: ClassData = JSON.parse(JSON.stringify(data));

  // Helper to check if a URL is a valid remote HTTP/HTTPS URL (e.g. Firebase Storage)
  const isRemoteUrl = (url?: string) => !!url && (url.startsWith('http://') || url.startsWith('https://'));

  // 1. Align photoUrl and avatarUrl without deleting valid remote URLs
  if (Array.isArray(cloned.students)) {
    cloned.students = cloned.students.map((student) => {
      const s = { ...student };
      // Ensure avatarUrl is set if photoUrl is available
      if (!s.avatarUrl && isRemoteUrl(s.photoUrl)) {
        s.avatarUrl = s.photoUrl;
      }
      return s;
    });
  }

  // Initial array limits
  if (Array.isArray(cloned.pointLogs) && cloned.pointLogs.length > 250) {
    cloned.pointLogs = cloned.pointLogs.slice(-250);
  }

  if (Array.isArray(cloned.attendanceRecords) && cloned.attendanceRecords.length > 80) {
    cloned.attendanceRecords = cloned.attendanceRecords.slice(-80);
  }

  // Target size limit in UTF-8 bytes (750KB is safely below Firestore's 1MB hard limit)
  const TARGET_MAX_BYTES = 750_000;
  let currentBytes = getUtf8ByteSize(cloned);

  if (currentBytes > TARGET_MAX_BYTES) {
    console.warn(`[ClassData Optimization] Payload size is ${currentBytes} bytes. Applying Level 1 pruning...`);

    // Prune pointLogs further
    if (Array.isArray(cloned.pointLogs) && cloned.pointLogs.length > 120) {
      cloned.pointLogs = cloned.pointLogs.slice(-120);
    }
    // Prune attendanceRecords
    if (Array.isArray(cloned.attendanceRecords) && cloned.attendanceRecords.length > 40) {
      cloned.attendanceRecords = cloned.attendanceRecords.slice(-40);
    }
    // Prune weeklySnapshots
    if (Array.isArray(cloned.weeklySnapshots) && cloned.weeklySnapshots.length > 12) {
      cloned.weeklySnapshots = cloned.weeklySnapshots.slice(-12);
    }
    // Prune monthlySnapshots
    if (Array.isArray(cloned.monthlySnapshots) && cloned.monthlySnapshots.length > 8) {
      cloned.monthlySnapshots = cloned.monthlySnapshots.slice(-8);
    }

    currentBytes = getUtf8ByteSize(cloned);
  }

  // Level 2 pruning: if still exceeds 750KB, strip ONLY base64 data URLs > 3000 chars (NEVER HTTP/HTTPS URLs)
  if (currentBytes > TARGET_MAX_BYTES) {
    console.warn(`[ClassData Optimization] Payload size is ${currentBytes} bytes. Applying Level 2 pruning (large base64 avatars)...`);

    if (Array.isArray(cloned.students)) {
      cloned.students = cloned.students.map((s) => {
        const clean = { ...s };
        if (clean.avatarUrl && clean.avatarUrl.startsWith('data:image/') && clean.avatarUrl.length > 3000) {
          delete clean.avatarUrl;
        }
        if (clean.photoUrl && clean.photoUrl.startsWith('data:image/') && clean.photoUrl.length > 3000) {
          delete clean.photoUrl;
        }
        return clean;
      });
    }

    currentBytes = getUtf8ByteSize(cloned);
  }

  // Level 3 emergency pruning: if still near limit, prune pointLogs/attendance further, NEVER delete remote HTTP/HTTPS image URLs
  if (currentBytes > TARGET_MAX_BYTES) {
    console.warn(`[ClassData Optimization] Payload size is ${currentBytes} bytes. Applying Emergency Level 3 pruning...`);

    if (Array.isArray(cloned.pointLogs) && cloned.pointLogs.length > 60) {
      cloned.pointLogs = cloned.pointLogs.slice(-60);
    }
    if (Array.isArray(cloned.attendanceRecords) && cloned.attendanceRecords.length > 20) {
      cloned.attendanceRecords = cloned.attendanceRecords.slice(-20);
    }
    if (Array.isArray(cloned.students)) {
      cloned.students = cloned.students.map((s) => {
        const clean = { ...s };
        if (clean.avatarUrl && clean.avatarUrl.startsWith('data:image/')) {
          delete clean.avatarUrl;
        }
        if (clean.photoUrl && clean.photoUrl.startsWith('data:image/')) {
          delete clean.photoUrl;
        }
        return clean;
      });
    }
  }

  return cloned;
}
