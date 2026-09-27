import { ClassData, Student } from '../types';
import { DEFAULT_CLASS_DATA } from '../data/defaultData';

export const PRIMARY_STORAGE_KEY = 'vong_nguyet_que_6a3_data';
export const LEGACY_STORAGE_KEY = 'vong_nguyet_que_class_data';

export function loadClassData(): ClassData {
  try {
    let raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (!raw) {
      // Check legacy storage key if primary is empty
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }

    if (!raw) {
      saveClassData(DEFAULT_CLASS_DATA);
      return DEFAULT_CLASS_DATA;
    }

    const parsed = JSON.parse(raw) as ClassData;

    // Use existing student list if available; otherwise fallback to default
    const hasValidStudents = Array.isArray(parsed.students) && parsed.students.length > 0;
    let rawStudents = hasValidStudents ? parsed.students : DEFAULT_CLASS_DATA.students;
    
    // Sanitize and ensure students have speechCount and full profile fields
    const sanitizedStudents = rawStudents.map((s, idx) => {
      const defaultMatch = (DEFAULT_CLASS_DATA.students.find((ds) => ds.id === s.id) || DEFAULT_CLASS_DATA.students[idx] || {}) as Partial<Student>;
      const cleanedStudent: Student = {
        ...defaultMatch,
        ...s,
        dob: s.dob || defaultMatch.dob || '',
        ethnicity: s.ethnicity || defaultMatch.ethnicity || '',
        place: s.place || defaultMatch.place || '',
        hometown: s.hometown || defaultMatch.hometown || '',
        address: s.address || defaultMatch.address || '',
        familyStatus: s.familyStatus || defaultMatch.familyStatus || '',
        fatherName: s.fatherName || defaultMatch.fatherName || '',
        motherName: s.motherName || defaultMatch.motherName || '',
        phone: s.phone || defaultMatch.phone || '',
        speechCount: typeof s.speechCount === 'number' ? s.speechCount : (defaultMatch.speechCount || 0),
        points: typeof s.points === 'number' ? s.points : (defaultMatch.points || 100),
      };
      if (cleanedStudent.photoUrl && cleanedStudent.avatarUrl === cleanedStudent.photoUrl) {
        delete cleanedStudent.photoUrl;
      }
      return cleanedStudent;
    });

    const result = {
      ...DEFAULT_CLASS_DATA,
      ...parsed,
      settings: {
        ...DEFAULT_CLASS_DATA.settings,
        ...(parsed.settings || {}),
      },
      students: sanitizedStudents,
      teams: parsed.teams || DEFAULT_CLASS_DATA.teams,
      pointLogs: parsed.pointLogs || DEFAULT_CLASS_DATA.pointLogs,
      rewards: parsed.rewards || DEFAULT_CLASS_DATA.rewards,
      redemptions: parsed.redemptions || DEFAULT_CLASS_DATA.redemptions,
      customBadges: parsed.customBadges || DEFAULT_CLASS_DATA.customBadges,
      criteriaList: parsed.criteriaList || DEFAULT_CLASS_DATA.criteriaList,
      weeklySnapshots: parsed.weeklySnapshots || [],
      attendanceRecords: parsed.attendanceRecords || [],
      weekDates: parsed.weekDates || {},
      schoolRankings: parsed.schoolRankings || DEFAULT_CLASS_DATA.schoolRankings || [],
      seatingMap: parsed.seatingMap || (() => {
        try {
          const s = localStorage.getItem('vong_nguyet_que_6a3_seating');
          return s ? JSON.parse(s) : undefined;
        } catch { return undefined; }
      })(),
      weeklyHistory: parsed.weeklyHistory || (() => {
        try {
          const h = localStorage.getItem('vong_nguyet_que_6a3_history');
          return h ? JSON.parse(h) : undefined;
        } catch { return undefined; }
      })(),
    };

    return result;
  } catch (error) {
    console.error('Error loading class data from LocalStorage:', error);
    return DEFAULT_CLASS_DATA;
  }
}

export function saveClassData(data: ClassData): void {
  try {
    const jsonStr = JSON.stringify(data);
    localStorage.setItem(PRIMARY_STORAGE_KEY, jsonStr);
    // Keep legacy synchronized just in case
    localStorage.setItem(LEGACY_STORAGE_KEY, jsonStr);
  } catch (error) {
    console.error('Error saving class data to LocalStorage:', error);
  }
}

export function resetClassData(): ClassData {
  try {
    localStorage.removeItem(PRIMARY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    saveClassData(DEFAULT_CLASS_DATA);
  } catch (error) {
    console.error('Error resetting class data:', error);
  }
  return DEFAULT_CLASS_DATA;
}
