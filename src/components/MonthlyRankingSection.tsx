import React, { useState } from 'react';
import { Student, UserAuth, ClassSettings, ConductRank, MonthlySnapshot, MonthlyStudentRecord } from '../types';
import { getConductRank, getConductRankInfo } from '../utils/conduct';
import {
  Calendar,
  Award,
  Sparkles,
  Search,
  Filter,
  Trophy,
  Users,
  TrendingUp,
  Printer,
  Download,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
  Medal,
  HelpCircle,
} from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';

interface MonthlyRankingSectionProps {
  students: Student[];
  weeklyHistory?: Record<string, any>;
  weeklySnapshots?: any[];
  monthlySnapshots?: MonthlySnapshot[];
  monthlyHistory?: Record<string, MonthlySnapshot>;
  userAuth?: UserAuth;
  settings?: ClassSettings;
  onSaveMonthlySnapshot?: (snapshot: MonthlySnapshot) => void;
  onOpenTeacherLogin?: () => void;
}

export const MONTH_OPTIONS = [
  { label: 'Tháng 08/2026', key: 'Tháng 08/2026', weeks: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] },
  { label: 'Tháng 09/2026', key: 'Tháng 09/2026', weeks: ['Tuần 5', 'Tuần 6', 'Tuần 7', 'Tuần 8'] },
  { label: 'Tháng 10/2026', key: 'Tháng 10/2026', weeks: ['Tuần 9', 'Tuần 10', 'Tuần 11', 'Tuần 12'] },
  { label: 'Tháng 11/2026', key: 'Tháng 11/2026', weeks: ['Tuần 13', 'Tuần 14', 'Tuần 15', 'Tuần 16'] },
  { label: 'Tháng 12/2026', key: 'Tháng 12/2026', weeks: ['Tuần 17', 'Tuần 18', 'Tuần 19', 'Tuần 20'] },
  { label: 'Tháng 01/2027', key: 'Tháng 01/2027', weeks: ['Tuần 21', 'Tuần 22', 'Tuần 23', 'Tuần 24'] },
  { label: 'Tháng 02/2027', key: 'Tháng 02/2027', weeks: ['Tuần 25', 'Tuần 26', 'Tuần 27', 'Tuần 28'] },
  { label: 'Tháng 03/2027', key: 'Tháng 03/2027', weeks: ['Tuần 29', 'Tuần 30', 'Tuần 31', 'Tuần 32'] },
  { label: 'Tháng 04/2027', key: 'Tháng 04/2027', weeks: ['Tuần 33', 'Tuần 34', 'Tuần 35', 'Tuần 36'] },
  { label: 'Tháng 05/2027', key: 'Tháng 05/2027', weeks: ['Tuần 37', 'Tuần 38', 'Tuần 39', 'Tuần 40'] },
];

export const formatScoreDecimal = (val?: number | null): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (Number.isInteger(val)) return `${val}`;
  return val.toFixed(2).replace('.', ',').replace(/,00$/, '').replace(/(\,\d)0$/, '$1');
};

export const MonthlyRankingSection: React.FC<MonthlyRankingSectionProps> = ({
  students = [],
  weeklyHistory = {},
  weeklySnapshots = [],
  monthlySnapshots = [],
  monthlyHistory = {},
  userAuth,
  settings,
  onSaveMonthlySnapshot,
  onOpenTeacherLogin,
}) => {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('Tháng 08/2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const selectedMonthObj = MONTH_OPTIONS.find((m) => m.key === selectedMonthKey) || MONTH_OPTIONS[0];
  const activeWeeks = selectedMonthObj.weeks;

  // Helper to retrieve score & speech for a student in a given week
  const getStudentWeekData = (studentId: string, weekName: string): { points: number | null; speechCount: number } => {
    // 1. Check weeklyHistory
    if (weeklyHistory && weeklyHistory[weekName]) {
      const data = weeklyHistory[weekName];
      if (Array.isArray(data)) {
        const found = data.find((s: any) => String(s.id) === String(studentId) || String(s.studentId) === String(studentId));
        if (found && (found.points !== undefined || found.score !== undefined)) {
          return {
            points: found.points ?? found.score ?? 100,
            speechCount: found.speechCount || 0,
          };
        }
      } else if (data && typeof data === 'object' && Array.isArray(data.studentRecords)) {
        const found = data.studentRecords.find((r: any) => String(r.studentId) === String(studentId) || String(r.id) === String(studentId));
        if (found && (found.points !== undefined || found.score !== undefined)) {
          return {
            points: found.points ?? found.score ?? 100,
            speechCount: found.speechCount || 0,
          };
        }
      }
    }

    // 2. Check weeklySnapshots
    if (Array.isArray(weeklySnapshots)) {
      const snap = weeklySnapshots.find((s: any) => s.weekName === weekName || `Tuần ${s.weekNumber}` === weekName);
      if (snap && Array.isArray(snap.studentRecords)) {
        const rec = snap.studentRecords.find((r: any) => String(r.studentId) === String(studentId) || String(r.id) === String(studentId));
        if (rec && rec.points !== undefined) {
          return {
            points: rec.points,
            speechCount: rec.speechCount || 0,
          };
        }
      }
    }

    // No data saved for this week
    return { points: null, speechCount: 0 };
  };

  // Check if a saved monthly snapshot exists in monthlyHistory map or monthlySnapshots array
  const savedSnapshot: MonthlySnapshot | undefined =
    monthlyHistory?.[selectedMonthKey] ||
    monthlySnapshots?.find((m) => m.monthKey === selectedMonthKey || m.id === `month_${selectedMonthKey}`);

  // Calculate live records from weekly data
  const computeLiveRecords = (): MonthlyStudentRecord[] => {
    return students.map((st) => {
      const w1 = getStudentWeekData(st.id, activeWeeks[0]);
      const w2 = getStudentWeekData(st.id, activeWeeks[1]);
      const w3 = getStudentWeekData(st.id, activeWeeks[2]);
      const w4 = getStudentWeekData(st.id, activeWeeks[3]);

      const hasW1 = w1.points !== null;
      const hasW2 = w2.points !== null;
      const hasW3 = w3.points !== null;
      const hasW4 = w4.points !== null;

      const hasFullData = hasW1 && hasW2 && hasW3 && hasW4;

      if (!hasFullData) {
        return {
          studentId: st.id,
          studentName: st.name,
          teamId: st.teamId,
          week1Score: w1.points,
          week2Score: w2.points,
          week3Score: w3.points,
          week4Score: w4.points,
          monthlyScore: null,
          rank: null,
          classification: 'Chưa đủ dữ liệu 4 tuần',
          hasFullData: false,
          totalSpeech: (w1.speechCount || 0) + (w2.speechCount || 0) + (w3.speechCount || 0) + (w4.speechCount || 0),
        };
      }

      const totalPoints = (w1.points as number) + (w2.points as number) + (w3.points as number) + (w4.points as number);
      const monthlyScore = totalPoints / 4;
      const totalSpeech = (w1.speechCount || 0) + (w2.speechCount || 0) + (w3.speechCount || 0) + (w4.speechCount || 0);
      const classification = getConductRank(monthlyScore, totalSpeech);

      return {
        studentId: st.id,
        studentName: st.name,
        teamId: st.teamId,
        week1Score: w1.points,
        week2Score: w2.points,
        week3Score: w3.points,
        week4Score: w4.points,
        monthlyScore,
        rank: null,
        classification,
        hasFullData: true,
        totalSpeech,
      };
    });
  };

  // Determine active student records (either from savedSnapshot or computed live)
  const currentRecords: MonthlyStudentRecord[] = savedSnapshot ? savedSnapshot.studentRecords : computeLiveRecords();

  // Sort and assign competition ranks to students with full 4-week data
  const validRecords = currentRecords.filter((r) => r.hasFullData && r.monthlyScore !== null);
  const invalidRecords = currentRecords.filter((r) => !r.hasFullData || r.monthlyScore === null);

  validRecords.sort((a, b) => {
    if ((b.monthlyScore ?? 0) !== (a.monthlyScore ?? 0)) {
      return (b.monthlyScore ?? 0) - (a.monthlyScore ?? 0);
    }
    return (b.totalSpeech || 0) - (a.totalSpeech || 0);
  });

  // Dense / Competition rank assignment (1, 1, 3, 4...)
  for (let i = 0; i < validRecords.length; i++) {
    if (i > 0 && validRecords[i].monthlyScore === validRecords[i - 1].monthlyScore) {
      validRecords[i].rank = validRecords[i - 1].rank;
    } else {
      validRecords[i].rank = i + 1;
    }
  }

  // Combine ranked valid records and unranked invalid records
  const allProcessedRecords = [...validRecords, ...invalidRecords];

  // Search & Filter
  const filteredRecords = allProcessedRecords.filter((rec) => {
    const matchesSearch = rec.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (rankFilter === 'all') return true;
    if (rankFilter === 'incomplete') return !rec.hasFullData;
    return rec.classification === rankFilter;
  });

  // Statistics
  const totalStudents = students.length;
  const fullDataCount = validRecords.length;
  const incompleteCount = invalidRecords.length;

  const totalMonthlySum = validRecords.reduce((sum, r) => sum + (r.monthlyScore || 0), 0);
  const classMonthlyAvg = fullDataCount > 0 ? (totalMonthlySum / fullDataCount).toFixed(2).replace('.', ',') : '—';

  const excellentCount = validRecords.filter((r) => r.classification === 'Xuất Sắc').length;
  const goodCount = validRecords.filter((r) => r.classification === 'Tốt').length;
  const fairCount = validRecords.filter((r) => r.classification === 'Khá').length;

  const highestScore = validRecords.length > 0 ? formatScoreDecimal(validRecords[0].monthlyScore) : '—';
  const lowestScore = validRecords.length > 0 ? formatScoreDecimal(validRecords[validRecords.length - 1].monthlyScore) : '—';

  // Top 3 Students
  const top1Rec = validRecords[0];
  const top2Rec = validRecords[1];
  const top3Rec = validRecords[2];

  const getStudentById = (id: string): Student | undefined => {
    return students.find((s) => String(s.id) === String(id));
  };

  // Team Statistics
  const teamIds = ['to_1', 'to_2', 'to_3', 'to_4'];
  const teamNames: Record<string, string> = {
    to_1: 'Tổ 1 - Rồng Vàng',
    to_2: 'Tổ 2 - Phượng Hoàng',
    to_3: 'Tổ 3 - Hổ Chiến',
    to_4: 'Tổ 4 - Đại Bàng',
  };

  const teamStats = teamIds
    .map((tid) => {
      const teamValidMembers = validRecords.filter((r) => r.teamId === tid);
      const memberCount = teamValidMembers.length;
      const pointsSum = teamValidMembers.reduce((sum, r) => sum + (r.monthlyScore || 0), 0);
      const avg = memberCount > 0 ? pointsSum / memberCount : 0;
      return {
        teamId: tid,
        name: teamNames[tid] || `Tổ ${tid.replace('to_', '')}`,
        memberCount,
        avg,
      };
    })
    .sort((a, b) => b.avg - a.avg);

  // Handle Save Monthly Snapshot
  const handleSave = () => {
    if (userAuth?.role !== 'admin') {
      onOpenTeacherLogin?.();
      return;
    }

    const liveRecords = computeLiveRecords();
    const liveValid = liveRecords.filter((r) => r.hasFullData && r.monthlyScore !== null);
    const liveInvalid = liveRecords.filter((r) => !r.hasFullData || r.monthlyScore === null);

    liveValid.sort((a, b) => (b.monthlyScore ?? 0) - (a.monthlyScore ?? 0));
    for (let i = 0; i < liveValid.length; i++) {
      if (i > 0 && liveValid[i].monthlyScore === liveValid[i - 1].monthlyScore) {
        liveValid[i].rank = liveValid[i - 1].rank;
      } else {
        liveValid[i].rank = i + 1;
      }
    }

    const snapshotToSave: MonthlySnapshot = {
      id: `month_${selectedMonthKey.replace(/\s+/g, '_').toLowerCase()}`,
      monthKey: selectedMonthKey,
      schoolYear: settings?.academicYear || '2026 - 2027',
      weeks: activeWeeks,
      studentRecords: [...liveValid, ...liveInvalid],
      updatedAt: new Date().toISOString(),
      updatedBy: userAuth.name || userAuth.email || 'Cô Quỳnh An',
    };

    if (onSaveMonthlySnapshot) {
      onSaveMonthlySnapshot(snapshotToSave);
      setSaveSuccessMsg(`💾 Đã lưu thành công kết quả thi đua ${selectedMonthKey} lên Đám Mây Firestore!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Handle Recalculate
  const handleConfirmRecalculate = () => {
    setShowRecalculateModal(false);
    handleSave();
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const csvRows = [
      ['STT', 'Họ và Tên', 'Tổ', activeWeeks[0], activeWeeks[1], activeWeeks[2], activeWeeks[3], 'Điểm Tháng', 'Thứ Hạng', 'Xếp Loại Thi Đua'],
    ];

    allProcessedRecords.forEach((rec, idx) => {
      const teamName = teamNames[rec.teamId || ''] || 'Tổ';
      const w1Str = rec.week1Score !== null && rec.week1Score !== undefined ? String(rec.week1Score) : '—';
      const w2Str = rec.week2Score !== null && rec.week2Score !== undefined ? String(rec.week2Score) : '—';
      const w3Str = rec.week3Score !== null && rec.week3Score !== undefined ? String(rec.week3Score) : '—';
      const w4Str = rec.week4Score !== null && rec.week4Score !== undefined ? String(rec.week4Score) : '—';
      const monthlyStr = rec.hasFullData ? formatScoreDecimal(rec.monthlyScore) : 'Chưa đủ 4 tuần';
      const rankStr = rec.rank ? `Hạng ${rec.rank}` : '—';
      const classStr = rec.classification || '—';

      csvRows.push([
        String(idx + 1),
        `"${rec.studentName}"`,
        `"${teamName}"`,
        w1Str,
        w2Str,
        w3Str,
        w4Str,
        `"${monthlyStr}"`,
        `"${rankStr}"`,
        `"${classStr}"`,
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bang_Xep_Hang_${selectedMonthKey.replace(/\s+/g, '_')}_Lop_6A3.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg border border-emerald-300 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-3xl shadow-md border-2 border-indigo-200 gap-4">
        <div>
          <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
            <Calendar className="w-6 h-6 text-amber-500" />
            <span>📅 XẾP HẠNG HỌC SINH THEO THÁNG</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h3>
          <p className="text-xs text-indigo-700 font-medium mt-1">
            Tính trung bình điểm 4 tuần thi đua: <code className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-lg font-bold border border-indigo-200">(Tuần 1 + Tuần 2 + Tuần 3 + Tuần 4) ÷ 4</code>
          </p>
        </div>

        {/* Controls: Month Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5 rounded-2xl border-2 border-indigo-300 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-700" />
            <span className="text-xs font-black text-indigo-950">Chọn Tháng:</span>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-transparent text-xs font-black text-indigo-900 outline-none cursor-pointer"
            >
              {MONTH_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.weeks[0]} - {opt.weeks[3]})
                </option>
              ))}
            </select>
          </div>

          {/* Recalculate or Save Buttons */}
          {userAuth?.role === 'admin' ? (
            savedSnapshot ? (
              <button
                type="button"
                onClick={() => setShowRecalculateModal(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-purple-950 font-black text-xs rounded-2xl shadow-md border border-amber-300 flex items-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Cập Nhật / Tính Lai</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-md border border-emerald-300 flex items-center gap-2 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Kết Quả Tháng</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onOpenTeacherLogin}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-2xl border border-indigo-200 flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Chế độ Xem (Giáo viên Đăng nhập để lưu)</span>
            </button>
          )}

          {/* Export & Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl border border-slate-300 shadow-sm transition-all"
            title="In báo cáo tháng"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-300 shadow-sm transition-all flex items-center gap-1 text-xs font-bold"
            title="Xuất CSV"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Snapshot status notification */}
      {savedSnapshot ? (
        <div className="p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Đã lưu kết quả thi đua {selectedMonthKey} lên Firestore (Cập nhật ngày:{' '}
              {new Date(savedSnapshot.updatedAt).toLocaleDateString('vi-VN')} bởi {savedSnapshot.updatedBy || 'Giáo viên'})
            </span>
          </div>
          <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg font-black shrink-0">
            ĐÃ LƯU CLOUD
          </span>
        </div>
      ) : (
        <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-950">
          <div className="flex items-center gap-2 font-bold">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Đang tính trực tiếp từ dữ liệu 4 tuần ({activeWeeks.join(', ')}). Bấm <strong>"Lưu Kết Quả Tháng"</strong> để lưu cố định.
            </span>
          </div>
          <span className="text-[11px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-lg font-black shrink-0">
            TÍNH TRỰC TIẾP
          </span>
        </div>
      )}

      {/* Active Weeks Badge */}
      <div className="bg-indigo-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border-2 border-yellow-400/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-400 text-purple-950 rounded-xl font-black text-sm shadow">
            {selectedMonthKey}
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-200">Danh sách 4 tuần được tính điểm:</div>
            <div className="text-sm font-black text-yellow-300 flex items-center gap-2">
              {activeWeeks.map((w) => (
                <span key={w} className="px-2.5 py-0.5 bg-white/10 rounded-lg border border-yellow-300/30 text-xs">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-indigo-200 font-medium max-w-sm">
          💡 Học sinh phải có đủ dữ liệu ở cả 4 tuần mới được tính điểm trung bình tháng chính thức.
        </div>
      </div>

      {/* Statistics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
            <span>Sĩ số lớp</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-950">{totalStudents} HS</div>
          <div className="text-[10px] text-slate-500 font-medium">Đủ 4 tuần: {fullDataCount}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
            <span>ĐTB Thi Đua</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-900">{classMonthlyAvg} đ</div>
          <div className="text-[10px] text-emerald-600 font-bold">Trung bình tháng</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-500 text-purple-950 rounded-2xl shadow-sm space-y-1 border border-amber-300">
          <div className="flex items-center justify-between text-xs font-black">
            <span>Xuất Sắc</span>
            <Trophy className="w-4 h-4 text-purple-950" />
          </div>
          <div className="text-2xl font-black">{excellentCount} HS</div>
          <div className="text-[10px] font-bold text-purple-900/80">≥100đ & phát biểu</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-sm space-y-1 border border-emerald-300">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Loại Tốt</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{goodCount} HS</div>
          <div className="text-[10px] font-medium text-emerald-100">95 - 99đ</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Cao Nhất</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{highestScore} đ</div>
          <div className="text-[10px] text-slate-500 font-medium">Điểm tháng</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold">
            <span>Thấp Nhất</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{lowestScore} đ</div>
          <div className="text-[10px] text-slate-500 font-medium">Điểm tháng</div>
        </div>
      </div>

      {/* Top 3 Honor Roll Podiums */}
      {validRecords.length >= 3 && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-blue-950 p-6 rounded-3xl border-2 border-yellow-400/50 shadow-xl space-y-4 text-white">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 rounded-xl border border-yellow-400/40 text-yellow-300 text-xs font-black uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>VINH DANH TOP 3 HỌC SINH XUẤT SẮC THÁNG</span>
            </div>
            <h3 className="text-lg font-black text-yellow-300 uppercase tracking-wider">
              BẢNG VÀNG THI ĐUA - {selectedMonthKey}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto pt-4">
            {/* Rank 2 - Silver */}
            {top2Rec && (
              <div className="order-2 md:order-1 bg-white/10 backdrop-blur-md p-5 rounded-2xl border-2 border-slate-300/60 shadow-lg text-center space-y-3 relative transform hover:-translate-y-1 transition-all">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-200 text-slate-900 font-black text-xs rounded-xl shadow border border-white">
                  🥈 HẠNG 2 THÁNG
                </div>
                <div className="flex justify-center pt-2">
                  <div className="p-1 bg-slate-200 rounded-full shadow-md">
                    <ChibiAvatar
                      gender={getStudentById(top2Rec.studentId)?.gender}
                      styleIndex={getStudentById(top2Rec.studentId)?.avatarStyle}
                      avatarUrl={getStudentById(top2Rec.studentId)?.avatarUrl}
                      size="lg"
                    />
                  </div>
                </div>
                <div>
                  <div className="font-extrabold text-base text-white">{top2Rec.studentName}</div>
                  <div className="text-xs text-slate-300 font-medium">
                    {teamNames[top2Rec.teamId || ''] || 'Tổ'}
                  </div>
                </div>
                <div className="p-2 bg-white/10 rounded-xl border border-slate-300/30">
                  <div className="text-xs text-slate-300">Điểm Tháng Trung Bình</div>
                  <div className="text-xl font-black text-slate-200">{formatScoreDecimal(top2Rec.monthlyScore)} đ</div>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1Rec && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-yellow-400/20 to-amber-500/20 backdrop-blur-md p-6 rounded-3xl border-2 border-yellow-400 shadow-2xl text-center space-y-3 relative transform md:-translate-y-4 hover:-translate-y-5 transition-all">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-950 font-black text-xs rounded-xl shadow-lg border border-yellow-200 flex items-center gap-1">
                  <span>👑 HẠNG 1 QUÁN QUÂN</span>
                </div>
                <div className="flex justify-center pt-3">
                  <div className="p-1.5 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full shadow-xl">
                    <ChibiAvatar
                      gender={getStudentById(top1Rec.studentId)?.gender}
                      styleIndex={getStudentById(top1Rec.studentId)?.avatarStyle}
                      avatarUrl={getStudentById(top1Rec.studentId)?.avatarUrl}
                      size="xl"
                    />
                  </div>
                </div>
                <div>
                  <div className="font-black text-lg text-yellow-300">{top1Rec.studentName}</div>
                  <div className="text-xs text-yellow-100 font-bold">
                    {teamNames[top1Rec.teamId || ''] || 'Tổ'}
                  </div>
                </div>
                <div className="p-3 bg-yellow-400/20 rounded-2xl border border-yellow-400/40">
                  <div className="text-xs text-yellow-200">Điểm Tháng Trung Bình</div>
                  <div className="text-2xl font-black text-yellow-300">{formatScoreDecimal(top1Rec.monthlyScore)} đ</div>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3Rec && (
              <div className="order-3 bg-white/10 backdrop-blur-md p-5 rounded-2xl border-2 border-amber-600/60 shadow-lg text-center space-y-3 relative transform hover:-translate-y-1 transition-all">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-700 text-white font-black text-xs rounded-xl shadow border border-amber-500">
                  🥉 HẠNG 3 THÁNG
                </div>
                <div className="flex justify-center pt-2">
                  <div className="p-1 bg-amber-700 rounded-full shadow-md">
                    <ChibiAvatar
                      gender={getStudentById(top3Rec.studentId)?.gender}
                      styleIndex={getStudentById(top3Rec.studentId)?.avatarStyle}
                      avatarUrl={getStudentById(top3Rec.studentId)?.avatarUrl}
                      size="lg"
                    />
                  </div>
                </div>
                <div>
                  <div className="font-extrabold text-base text-white">{top3Rec.studentName}</div>
                  <div className="text-xs text-amber-200 font-medium">
                    {teamNames[top3Rec.teamId || ''] || 'Tổ'}
                  </div>
                </div>
                <div className="p-2 bg-white/10 rounded-xl border border-amber-600/30">
                  <div className="text-xs text-amber-200">Điểm Tháng Trung Bình</div>
                  <div className="text-xl font-black text-amber-300">{formatScoreDecimal(top3Rec.monthlyScore)} đ</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Competition Monthly Ranking */}
      <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-indigo-100 space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-indigo-950 text-base uppercase">
              🏆 XẾP HẠNG THI ĐUA THEO TỔ - {selectedMonthKey}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Trung bình cộng điểm 4 tuần của thành viên tổ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamStats.map((team, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎗️';
            const badgeBg =
              idx === 0
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-purple-950 font-black'
                : idx === 1
                ? 'bg-slate-200 text-slate-900 font-black'
                : idx === 2
                ? 'bg-amber-700 text-white font-black'
                : 'bg-indigo-100 text-indigo-900 font-bold';

            return (
              <div
                key={team.teamId}
                className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-xl text-xs shadow-sm flex items-center gap-1 ${badgeBg}`}>
                    <span>{medal}</span>
                    <span>Hạng {idx + 1}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500">{team.memberCount} HS</span>
                </div>

                <div className="font-extrabold text-sm text-indigo-950">{team.name}</div>
                <div className="flex items-baseline justify-between pt-1 border-t border-indigo-200/60">
                  <span className="text-xs text-slate-500 font-medium">ĐTB Tháng:</span>
                  <span className="text-lg font-black text-indigo-900">
                    {team.memberCount > 0 ? formatScoreDecimal(team.avg) : '—'} đ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Student Monthly Ranking Table */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-200 overflow-hidden space-y-4 p-5">
        {/* Table Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs font-bold text-slate-800 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-950">Lọc Xếp Loại:</span>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="bg-white text-xs font-extrabold text-indigo-900 border border-indigo-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="all">Tất cả xếp loại</option>
              <option value="Xuất Sắc">👑 Loại Xuất Sắc</option>
              <option value="Tốt">🌟 Loại Tốt</option>
              <option value="Khá">👍 Loại Khá</option>
              <option value="Đạt">⚡ Loại Đạt</option>
              <option value="Chưa Đạt">⚠️ Loại Chưa Đạt</option>
              <option value="incomplete">❓ Chưa đủ dữ liệu 4 tuần</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white text-xs font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 rounded-l-2xl text-center w-12">STT</th>
                <th className="py-3.5 px-4 min-w-[180px]">Học Sinh</th>
                <th className="py-3.5 px-4 min-w-[120px]">Tổ</th>
                <th className="py-3.5 px-3 text-center">{activeWeeks[0]}</th>
                <th className="py-3.5 px-3 text-center">{activeWeeks[1]}</th>
                <th className="py-3.5 px-3 text-center">{activeWeeks[2]}</th>
                <th className="py-3.5 px-3 text-center">{activeWeeks[3]}</th>
                <th className="py-3.5 px-4 text-center bg-yellow-400/20 text-yellow-300 font-extrabold">
                  Điểm Tháng
                </th>
                <th className="py-3.5 px-4 text-center">Xếp Hạng</th>
                <th className="py-3.5 px-4 rounded-r-2xl text-center min-w-[140px]">Xếp Loại Thi Đua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-medium">
                    Không tìm thấy học sinh phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const student = getStudentById(rec.studentId);
                  const isTop3 = rec.rank === 1 || rec.rank === 2 || rec.rank === 3;
                  const rankBadgeBg =
                    rec.rank === 1
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-purple-950 font-black shadow-sm'
                      : rec.rank === 2
                      ? 'bg-slate-200 text-slate-900 font-black shadow-sm'
                      : rec.rank === 3
                      ? 'bg-amber-700 text-white font-black shadow-sm'
                      : 'bg-slate-100 text-slate-700 font-bold';

                  const conductInfo = rec.hasFullData && rec.classification
                    ? getConductRankInfo(rec.classification as ConductRank)
                    : null;

                  return (
                    <tr
                      key={rec.studentId}
                      className={`hover:bg-indigo-50/50 transition-colors ${
                        isTop3 ? 'bg-amber-50/40 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-500">{idx + 1}</td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <ChibiAvatar
                            gender={student?.gender}
                            styleIndex={student?.avatarStyle}
                            avatarUrl={student?.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{rec.studentName}</span>
                              {rec.rank === 1 && <span>👑</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Phát biểu tháng: <span className="font-bold text-indigo-700">{rec.totalSpeech || 0} lần</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Team */}
                      <td className="py-3.5 px-4 font-bold text-indigo-900">
                        {teamNames[rec.teamId || ''] || 'Tổ'}
                      </td>

                      {/* Week 1 Score */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.week1Score !== null && rec.week1Score !== undefined ? (
                          <span className="font-bold text-slate-800">{rec.week1Score}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">—</span>
                        )}
                      </td>

                      {/* Week 2 Score */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.week2Score !== null && rec.week2Score !== undefined ? (
                          <span className="font-bold text-slate-800">{rec.week2Score}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">—</span>
                        )}
                      </td>

                      {/* Week 3 Score */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.week3Score !== null && rec.week3Score !== undefined ? (
                          <span className="font-bold text-slate-800">{rec.week3Score}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">—</span>
                        )}
                      </td>

                      {/* Week 4 Score */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.week4Score !== null && rec.week4Score !== undefined ? (
                          <span className="font-bold text-slate-800">{rec.week4Score}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">—</span>
                        )}
                      </td>

                      {/* Monthly Score */}
                      <td className="py-3.5 px-4 text-center bg-indigo-50/80">
                        {rec.hasFullData && rec.monthlyScore !== null ? (
                          <span className="text-base font-black text-indigo-950">
                            {formatScoreDecimal(rec.monthlyScore)} đ
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                            Chưa đủ 4 tuần
                          </span>
                        )}
                      </td>

                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
                        {rec.hasFullData && rec.rank ? (
                          <span className={`inline-block px-2.5 py-1 rounded-xl text-xs ${rankBadgeBg}`}>
                            Hạng {rec.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">—</span>
                        )}
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {rec.hasFullData && conductInfo ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black shadow-sm ${conductInfo.badgeBg}`}>
                            <span>{conductInfo.icon}</span>
                            <span>{conductInfo.label}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Chưa đủ dữ liệu 4 tuần</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recalculate Confirmation Modal */}
      {showRecalculateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">Cập Nhật Kết Quả Tháng</h3>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Bạn có chắc chắn muốn tính lại kết quả thi đua tháng <strong className="text-indigo-900">{selectedMonthKey}</strong> từ dữ liệu 4 tuần hiện tại và lưu đè bản cập nhật mới lên Firestore Cloud?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRecalculateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRecalculate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-purple-950 font-black text-xs rounded-xl shadow border border-amber-300 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xác Nhận Tính Lại</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
