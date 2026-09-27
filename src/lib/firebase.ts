import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  deleteDoc,
  disableNetwork,
  setLogLevel,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ClassData,
  Student,
  PointLog,
  WeeklySnapshot,
  DailyAttendanceRecord,
  SchoolRanking,
  RewardRedemption,
  MonthlySnapshot,
} from '../types';
import { sanitizeAndOptimizeClassData } from '../utils/imageUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Silence internal verbose Firebase Firestore SDK console warnings/errors
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore
const dbId = (firebaseConfig as any).firestoreDatabaseId || (firebaseConfig as any).databaseId || 'ai-studio-laurelquest-83903549-030f-482a-8f71-523ffd7c4c9e';
export const db = getFirestore(app, dbId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { FirebaseUser };

// Initialize Firebase Storage
export const storage = getStorage(app);
try {
  storage.maxUploadRetryTime = 10000;
  storage.maxOperationRetryTime = 10000;
} catch {}

/**
 * Timeout helper to prevent infinite promise hangs on storage uploads
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 20000, errorMsg: string = 'Thao tác quá thời gian (Timeout).'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Client-side image compression helper to optimize photos before uploading to Firebase Storage
 */
export async function compressImageFile(
  fileOrBlob: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => resolve(fileOrBlob);
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => resolve(fileOrBlob);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(fileOrBlob);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  resolve(fileOrBlob);
                }
              },
              'image/jpeg',
              quality
            );
          } catch {
            resolve(fileOrBlob);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(fileOrBlob);
    } catch {
      resolve(fileOrBlob);
    }
  });
}

/**
 * Convert any File, Blob, or DataURL into a lightweight compressed Data URL (base64 JPEG)
 * for fallback persistence if Cloud Storage is temporarily unreachable.
 */
export async function convertToCompressedDataUrl(
  fileOrBlobOrDataUrl: File | Blob | string,
  maxWidth = 240,
  maxHeight = 240,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (typeof fileOrBlobOrDataUrl === 'string' && fileOrBlobOrDataUrl.startsWith('data:image/')) {
        const img = new Image();
        img.onerror = () => resolve(fileOrBlobOrDataUrl);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(fileOrBlobOrDataUrl);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = fileOrBlobOrDataUrl;
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => resolve(typeof fileOrBlobOrDataUrl === 'string' ? fileOrBlobOrDataUrl : '');
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
      };

      if (typeof fileOrBlobOrDataUrl === 'string') {
        fetch(fileOrBlobOrDataUrl)
          .then((res) => res.blob())
          .then((blob) => reader.readAsDataURL(blob))
          .catch(() => resolve(fileOrBlobOrDataUrl));
      } else {
        reader.readAsDataURL(fileOrBlobOrDataUrl);
      }
    } catch {
      resolve(typeof fileOrBlobOrDataUrl === 'string' ? fileOrBlobOrDataUrl : '');
    }
  });
}

import { uploadStudentPhotoToCloudinary } from './cloudinary';

/**
 * Upload student photo to Cloudinary and return HTTPS secure_url.
 * Redirected from Firebase Storage to Cloudinary for maximum speed & reliability.
 */
export async function uploadStudentPhotoToStorage(
  fileOrBlobOrDataUrl: File | Blob | string,
  studentId: string | number = 'student',
  classId: string = DEFAULT_CLASS_DOC_ID,
  teacherUidParam?: string
): Promise<string> {
  return await uploadStudentPhotoToCloudinary(fileOrBlobOrDataUrl, studentId, classId, teacherUidParam);
}


export const DEFAULT_CLASS_DOC_ID = 'thcs_nguyenvancu_6a3';

export function getClassDocRef(docId?: string) {
  const targetId = docId && docId.trim() ? docId.trim() : DEFAULT_CLASS_DOC_ID;
  return doc(db, 'classes', targetId);
}

// Validate connection on boot as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline.');
      return false;
    }
    return true;
  }
}
testFirestoreConnection().catch(() => {});

import { getVietnamDate } from '../utils/dateUtils';

const TODAY_DATE_KEY = getVietnamDate();
const QUOTA_STORAGE_KEY = `firestore_quota_exceeded_${TODAY_DATE_KEY}`;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Always start with false and clear any stale quota lock in localStorage to prioritize live Firestore sync
let isQuotaExceeded = false;
try {
  localStorage.removeItem(QUOTA_STORAGE_KEY);
  localStorage.removeItem('firestore_quota_exceeded');
} catch {}

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function markQuotaExceeded(): void {
  if (!isQuotaExceeded) {
    isQuotaExceeded = true;
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, 'true');
      localStorage.setItem('firestore_quota_exceeded', 'true');
    } catch {
      // Ignore storage errors
    }
    try {
      disableNetwork(db).catch(() => {});
    } catch {
      // Ignore network errors
    }
    console.warn('[Firestore] Quota exceeded detected. Pausing cloud auto-sync for today.');
  }
}

/**
 * Subscribe to real-time changes on the class document.
 * Calls callback whenever data changes on Cloud.
 */
export function subscribeToClassData(
  docId: string,
  onData: (data: ClassData) => void,
  onError?: (err: Error) => void
) {
  if (isQuotaExceeded) {
    onError?.(new Error('Quota limit exceeded. Firestore sync paused.'));
    return () => {};
  }

  const targetRef = getClassDocRef(docId);
  let unsub: (() => void) | null = null;

  try {
    unsub = onSnapshot(
      targetRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ClassData;
          onData(data);
        } else {
          onError?.(new Error('Document does not exist yet'));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `classes/${docId || DEFAULT_CLASS_DOC_ID}`);
        const isQuotaErr =
          error?.code === 'resource-exhausted' ||
          error?.message?.toLowerCase().includes('quota') ||
          String(error).toLowerCase().includes('quota');

        if (isQuotaErr) {
          markQuotaExceeded();
          if (unsub) {
            try {
              unsub();
            } catch {}
          }
        }
        onError?.(error);
      }
    );
    return () => {
      if (unsub) {
        try {
          unsub();
        } catch {}
      }
    };
  } catch (err: any) {
    markQuotaExceeded();
    onError?.(err);
    return () => {};
  }
}

/**
 * Safely merge local ClassData with latest server ClassData to prevent
 * stale local state from overwriting newer server entries or wiping out fields.
 */
function mergeClassDataSafely(serverData: Partial<ClassData>, localData: ClassData): ClassData {
  if (!serverData) return localData;

  // 1. Merge Students array
  const serverStudents = Array.isArray(serverData.students) ? serverData.students : [];
  const localStudents = Array.isArray(localData.students) ? localData.students : [];

  const serverStudentMap = new Map<string | number, Student>();
  serverStudents.forEach((s) => {
    if (s && s.id != null) serverStudentMap.set(String(s.id), s);
  });

  const mergedStudents: Student[] = localStudents.map((localS) => {
    const serverS = serverStudentMap.get(String(localS.id));
    if (!serverS) return localS;

    // Merge student properties: retain avatarUrl, photoUrl, or profile details from server if empty locally
    return {
      ...serverS,
      ...localS,
      avatarUrl: localS.avatarUrl || serverS.avatarUrl || '',
      photoUrl: localS.photoUrl || serverS.photoUrl || '',
      dob: localS.dob || serverS.dob || '',
      ethnicity: localS.ethnicity || serverS.ethnicity || '',
      place: localS.place || serverS.place || '',
      hometown: localS.hometown || serverS.hometown || '',
      address: localS.address || serverS.address || '',
      familyStatus: localS.familyStatus || serverS.familyStatus || '',
      fatherName: localS.fatherName || serverS.fatherName || '',
      motherName: localS.motherName || serverS.motherName || '',
      phone: localS.phone || serverS.phone || '',
      notes: localS.notes || serverS.notes || '',
      deductionNotes: localS.deductionNotes || serverS.deductionNotes || [],
    };
  });

  // Preserve any student that exists on server but not in local array
  serverStudents.forEach((serverS) => {
    if (serverS && serverS.id != null && !mergedStudents.some((m) => String(m.id) === String(serverS.id))) {
      mergedStudents.push(serverS);
    }
  });

  // 2. Merge pointLogs by ID (union of server + local)
  const serverPointLogs = Array.isArray(serverData.pointLogs) ? serverData.pointLogs : [];
  const localPointLogs = Array.isArray(localData.pointLogs) ? localData.pointLogs : [];
  const pointLogMap = new Map<string, PointLog>();
  serverPointLogs.forEach((log) => { if (log && log.id) pointLogMap.set(log.id, log); });
  localPointLogs.forEach((log) => { if (log && log.id) pointLogMap.set(log.id, log); });
  const mergedPointLogs = Array.from(pointLogMap.values());

  // 3. Merge weeklySnapshots by ID
  const serverWeeklySnapshots = Array.isArray(serverData.weeklySnapshots) ? serverData.weeklySnapshots : [];
  const localWeeklySnapshots = Array.isArray(localData.weeklySnapshots) ? localData.weeklySnapshots : [];
  const weeklySnapMap = new Map<string, WeeklySnapshot>();
  serverWeeklySnapshots.forEach((snap) => { if (snap && snap.id) weeklySnapMap.set(snap.id, snap); });
  localWeeklySnapshots.forEach((snap) => { if (snap && snap.id) weeklySnapMap.set(snap.id, snap); });
  const mergedWeeklySnapshots = Array.from(weeklySnapMap.values());

  // 4. Merge attendanceRecords by ID
  const serverAttRecords = Array.isArray(serverData.attendanceRecords) ? serverData.attendanceRecords : [];
  const localAttRecords = Array.isArray(localData.attendanceRecords) ? localData.attendanceRecords : [];
  const attMap = new Map<string, DailyAttendanceRecord>();
  serverAttRecords.forEach((att) => { if (att && att.id) attMap.set(att.id, att); });
  localAttRecords.forEach((att) => { if (att && att.id) attMap.set(att.id, att); });
  const mergedAttendanceRecords = Array.from(attMap.values());

  // 5. Merge schoolRankings by ID
  const serverRankings = Array.isArray(serverData.schoolRankings) ? serverData.schoolRankings : [];
  const localRankings = Array.isArray(localData.schoolRankings) ? localData.schoolRankings : [];
  const rankingMap = new Map<string, SchoolRanking>();
  serverRankings.forEach((r) => { if (r && r.id) rankingMap.set(r.id, r); });
  localRankings.forEach((r) => { if (r && r.id) rankingMap.set(r.id, r); });
  const mergedSchoolRankings = Array.from(rankingMap.values());

  // 6. Merge redemptions by ID
  const serverRedemptions = Array.isArray(serverData.redemptions) ? serverData.redemptions : [];
  const localRedemptions = Array.isArray(localData.redemptions) ? localData.redemptions : [];
  const redemptionMap = new Map<string, RewardRedemption>();
  serverRedemptions.forEach((red) => { if (red && red.id) redemptionMap.set(red.id, red); });
  localRedemptions.forEach((red) => { if (red && red.id) redemptionMap.set(red.id, red); });
  const mergedRedemptions = Array.from(redemptionMap.values());

  // 7. Merge monthlySnapshots by ID
  const serverMonthlySnapshots = Array.isArray(serverData.monthlySnapshots) ? serverData.monthlySnapshots : [];
  const localMonthlySnapshots = Array.isArray(localData.monthlySnapshots) ? localData.monthlySnapshots : [];
  const monthlySnapMap = new Map<string, MonthlySnapshot>();
  serverMonthlySnapshots.forEach((ms) => { if (ms && ms.id) monthlySnapMap.set(ms.id, ms); });
  localMonthlySnapshots.forEach((ms) => { if (ms && ms.id) monthlySnapMap.set(ms.id, ms); });
  const mergedMonthlySnapshots = Array.from(monthlySnapMap.values());

  // 8. Key-value maps merging
  const mergedWeeklyHistory = {
    ...(serverData.weeklyHistory || {}),
    ...(localData.weeklyHistory || {}),
  };

  const mergedMonthlyHistory = {
    ...(serverData.monthlyHistory || {}),
    ...(localData.monthlyHistory || {}),
  };

  const mergedSeatingMap = {
    ...(serverData.seatingMap || {}),
    ...(localData.seatingMap || {}),
  };

  const mergedWeekDates = {
    ...(serverData.weekDates || {}),
    ...(localData.weekDates || {}),
  };

  // 9. Other array/object fields: retain server if local is empty/missing
  const mergedTeams = (Array.isArray(localData.teams) && localData.teams.length > 0) ? localData.teams : (serverData.teams || []);
  const mergedRewards = (Array.isArray(localData.rewards) && localData.rewards.length > 0) ? localData.rewards : (serverData.rewards || []);
  const mergedCustomBadges = (Array.isArray(localData.customBadges) && localData.customBadges.length > 0) ? localData.customBadges : (serverData.customBadges || []);
  const mergedCriteriaList = (Array.isArray(localData.criteriaList) && localData.criteriaList.length > 0) ? localData.criteriaList : (serverData.criteriaList || []);

  const mergedSettings: ClassData['settings'] = {
    schoolName: localData.settings?.schoolName || serverData.settings?.schoolName || 'THCS Nguyễn Văn Cừ',
    className: localData.settings?.className || serverData.settings?.className || '6A3',
    teacherName: localData.settings?.teacherName || serverData.settings?.teacherName || 'Lê Thị Quỳnh An',
    teacherEmail: localData.settings?.teacherEmail || serverData.settings?.teacherEmail || '',
    academicYear: localData.settings?.academicYear || serverData.settings?.academicYear || '2025-2026',
    laurelTargetPoints: localData.settings?.laurelTargetPoints ?? serverData.settings?.laurelTargetPoints ?? 100,
    enableSound: localData.settings?.enableSound ?? serverData.settings?.enableSound ?? true,
    enableBgm: localData.settings?.enableBgm ?? serverData.settings?.enableBgm ?? false,
  };

  return {
    ...serverData,
    ...localData,
    settings: mergedSettings,
    students: mergedStudents,
    teams: mergedTeams,
    pointLogs: mergedPointLogs,
    rewards: mergedRewards,
    redemptions: mergedRedemptions,
    customBadges: mergedCustomBadges,
    criteriaList: mergedCriteriaList,
    weeklySnapshots: mergedWeeklySnapshots,
    attendanceRecords: mergedAttendanceRecords,
    weekDates: mergedWeekDates,
    schoolRankings: mergedSchoolRankings,
    seatingMap: mergedSeatingMap,
    weeklyHistory: mergedWeeklyHistory,
    monthlySnapshots: mergedMonthlySnapshots,
    monthlyHistory: mergedMonthlyHistory,
  };
}

/**
 * Save / sync class data to Firestore cloud document.
 */
export async function saveClassDataToCloud(docId: string, data: ClassData): Promise<boolean> {
  if (isQuotaExceeded) {
    return false;
  }

  // Guard: Absolutely refuse to write empty data or unhydrated data (0 students)
  if (!data || !Array.isArray(data.students) || data.students.length === 0) {
    console.warn('[Firestore Save Guard] Refused to save empty classData (0 students) to Cloud.');
    return false;
  }

  try {
    const targetRef = getClassDocRef(docId);

    // Read current server document to perform intelligent merge before writing
    let payloadToSave = data;
    try {
      const snap = await getDoc(targetRef);
      if (snap.exists()) {
        const serverData = snap.data() as Partial<ClassData>;
        payloadToSave = mergeClassDataSafely(serverData, data);
      }
    } catch (readErr) {
      console.warn('[Firestore Save Guard] Non-fatal error reading server doc before save:', readErr);
    }

    const optimized = sanitizeAndOptimizeClassData(payloadToSave);
    await setDoc(targetRef, optimized, { merge: true });
    return true;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, `classes/${docId || DEFAULT_CLASS_DOC_ID}`);
    if (
      error?.code === 'resource-exhausted' ||
      error?.message?.toLowerCase().includes('quota') ||
      String(error).toLowerCase().includes('quota')
    ) {
      markQuotaExceeded();
    }
    return false;
  }
}

/**
 * Debounced save to Firestore Cloud (1.5s delay to prevent quota exhaustion)
 */
export function debouncedSaveClassDataToCloud(
  docId: string,
  data: ClassData,
  delayMs = 1500,
  onComplete?: (success: boolean) => void
): void {
  if (isQuotaExceeded) {
    onComplete?.(false);
    return;
  }

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(async () => {
    const success = await saveClassDataToCloud(docId, data);
    onComplete?.(success);
  }, delayMs);
}

/**
 * Fetch class data once from Firestore.
 */
export async function getClassDataFromCloud(docId?: string): Promise<ClassData | null> {
  if (isQuotaExceeded) return null;

  try {
    const targetRef = getClassDocRef(docId);
    const snap = await getDoc(targetRef);
    if (snap.exists()) {
      return snap.data() as ClassData;
    }
    return null;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.GET, `classes/${docId || DEFAULT_CLASS_DOC_ID}`);
    if (
      error?.code === 'resource-exhausted' ||
      error?.message?.toLowerCase().includes('quota') ||
      String(error).toLowerCase().includes('quota')
    ) {
      markQuotaExceeded();
    }
    return null;
  }
}

/**
 * Delete a specific school ranking record from Firestore immediately.
 */
export async function deleteSchoolRankingFromCloud(docId: string, rankingId: string, updatedClassData: ClassData): Promise<boolean> {
  if (isQuotaExceeded) {
    return false;
  }

  if (!updatedClassData || !Array.isArray(updatedClassData.students) || updatedClassData.students.length === 0) {
    console.warn('[Firestore Save Guard] Refused to save empty classData during ranking deletion.');
    return false;
  }

  try {
    try {
      const rankingDocRef = doc(db, 'schoolRankings', rankingId);
      await deleteDoc(rankingDocRef);
    } catch {}

    return await saveClassDataToCloud(docId, updatedClassData);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `classes/${docId || DEFAULT_CLASS_DOC_ID}/schoolRankings/${rankingId}`);
    if (
      error?.code === 'resource-exhausted' ||
      error?.message?.toLowerCase().includes('quota') ||
      String(error).toLowerCase().includes('quota')
    ) {
      markQuotaExceeded();
    }
    return false;
  }
}
