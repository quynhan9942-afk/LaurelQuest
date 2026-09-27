export type TabType = 
  | 'home' 
  | 'students' 
  | 'profile'
  | 'teams' 
  | 'seating'
  | 'scoring' 
  | 'summary'
  | 'attendance'
  | 'rules' 
  | 'settings';

export type ConductRank = 'Xuất Sắc' | 'Tốt' | 'Khá' | 'Đạt' | 'Chưa Đạt';

export interface WeeklyStudentRecord {
  studentId: string;
  studentName: string;
  teamId: string;
  points: number;
  speechCount: number;
  conductRank: ConductRank;
}

export interface WeeklySnapshot {
  id: string; // e.g. "week_1"
  weekNumber: number; // 1 to 35
  weekName: string; // "Tuần 1"
  timestamp: string;
  studentRecords: WeeklyStudentRecord[];
  notes?: string;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late';

export interface StudentAttendanceItem {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  deductedPoints?: number;
  note?: string;
}

export interface DailyAttendanceRecord {
  id: string; // "att_2026-08-23"
  date: string; // "YYYY-MM-DD"
  timestamp: string;
  items: StudentAttendanceItem[];
}

export interface PointCriteria {
  id: string;
  name: string;
  points: number; // positive or negative
  category: 'hoc_tap' | 'ne_nep' | 'phong_trao' | 'ren_luyen';
  icon: string;
  isSpeech?: boolean;
}

export interface PointLog {
  id: string;
  studentId: string;
  studentName: string;
  points: number;
  criteriaName: string;
  category: 'hoc_tap' | 'ne_nep' | 'phong_trao' | 'ren_luyen';
  timestamp: string;
  note?: string;
  teacherName?: string;
}

export interface Student {
  id: string | number;
  name: string;
  gender: 'nam' | 'nu' | 'Nam' | 'Nữ' | string;
  teamId?: string; // 'to_1' | 'to_2' | 'to_3' | 'to_4'
  avatarStyle?: number; // 1-12
  avatarUrl?: string; // Đường dẫn / Data URL ảnh học sinh
  photoUrl?: string;  // Trường ảnh phụ
  points: number;
  score?: number;
  speechCount: number; // số lần phát biểu
  totalPositive?: number;
  totalNegative?: number;
  badges?: string[]; // array of badge IDs
  notes?: string;
  deductionNotes?: string[]; // Danh sách các lỗi / ghi chú trừ điểm
  // Hồ sơ học sinh
  dob?: string;          // Ngày sinh (e.g., "10/03/2014")
  ethnicity?: string;    // Dân tộc (e.g., "Kinh", "Ê-đê")
  place?: string;        // Nơi sinh (e.g., "Đắk Lắk")
  hometown?: string;     // Quê quán
  address?: string;      // Địa chỉ thường trú
  familyStatus?: string; // Hoàn cảnh gia đình
  fatherName?: string;   // Họ tên Bố
  motherName?: string;   // Họ tên Mẹ
  phone?: string;        // SĐT Liên hệ
}

export interface Team {
  id: string;
  name: string; // e.g. "Tổ 1 - Rồng Vàng"
  code: string; // "to_1"
  color: string; // CSS color string or gradient
  icon: string;
  slogan: string;
  leaderStudentId?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredPoints: number;
  category: 'academic' | 'diligence' | 'leadership' | 'special';
  color: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  icon: string;
  stock?: number;
  category: 'privilege' | 'gift' | 'score_boost';
}

export interface RewardRedemption {
  id: string;
  studentId: string;
  studentName: string;
  rewardId: string;
  rewardTitle: string;
  pointsUsed: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'used';
}

export interface ClassSettings {
  schoolName: string;
  className: string;
  teacherName: string;
  teacherEmail: string;
  academicYear: string;
  laurelTargetPoints: number; // Milestone points to reach Laurel Wreath Crown (e.g. 100)
  enableSound: boolean;
  enableBgm: boolean;
}

export interface WeekDateRange {
  startDate?: string;
  endDate?: string;
}

export interface SchoolRanking {
  id: string;
  classId?: string;
  className: string;
  week: number;
  schoolYear: string;
  rank: number;
  totalClasses: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface MonthlyStudentRecord {
  studentId: string;
  studentName: string;
  teamId: string;
  week1Score?: number | null;
  week2Score?: number | null;
  week3Score?: number | null;
  week4Score?: number | null;
  monthlyScore?: number | null;
  rank?: number | string | null;
  classification?: ConductRank | string | null;
  hasFullData: boolean;
  totalSpeech?: number;
}

export interface MonthlySnapshot {
  id: string;
  monthKey: string;
  schoolYear: string;
  weeks: string[];
  studentRecords: MonthlyStudentRecord[];
  updatedAt: string;
  updatedBy?: string;
}

export interface ClassData {
  settings: ClassSettings;
  students: Student[];
  teams: Team[];
  pointLogs: PointLog[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  customBadges?: Badge[];
  criteriaList?: PointCriteria[];
  weeklySnapshots?: WeeklySnapshot[];
  attendanceRecords?: DailyAttendanceRecord[];
  weekDates?: Record<number, WeekDateRange>;
  schoolRankings?: SchoolRanking[];
  seatingMap?: Record<string, string | number>;
  weeklyHistory?: Record<string, any>;
  monthlySnapshots?: MonthlySnapshot[];
  monthlyHistory?: Record<string, MonthlySnapshot>;
}

export interface UserAuth {
  role: 'admin' | 'guest';
  email?: string;
  name?: string;
}
