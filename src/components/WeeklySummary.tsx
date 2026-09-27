import React, { useState } from 'react';
import { Student, WeeklySnapshot, UserAuth, ClassSettings, MonthlySnapshot } from '../types';
import { getConductRank, getConductRankInfo } from '../utils/conduct';
import {
  Calendar,
  Award,
  Sparkles,
  Search,
  Filter,
  BarChart3,
  Trophy,
  Users,
  TrendingUp,
  Printer,
  Download,
} from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';
import { INITIAL_STUDENTS as initialStudents } from '../data/defaultData';
import { MonthlyRankingSection } from './MonthlyRankingSection';
import { findWeekDataInHistory, isSameStudentId } from '../utils/weekUtils';

interface WeeklySummaryProps {
  students: Student[];
  weeklySnapshots?: WeeklySnapshot[];
  monthlySnapshots?: MonthlySnapshot[];
  monthlyHistory?: Record<string, MonthlySnapshot>;
  userAuth?: UserAuth;
  settings?: ClassSettings;
  weekDates?: Record<number, { startDate?: string; endDate?: string }>;
  onSaveWeeklySnapshot?: (snapshot: WeeklySnapshot) => void;
  onSaveMonthlySnapshot?: (snapshot: MonthlySnapshot) => void;
  onDeleteWeeklySnapshot?: (weekNumber: number) => void;
  onResetWeeklyPoints?: () => void;
  onSaveWeekDates?: (dates: Record<number, { startDate?: string; endDate?: string }>) => void;
  onOpenTeacherLogin?: () => void;
  selectedWeek?: string;
  setSelectedWeek?: (week: string) => void;
  weeklyHistory?: Record<string, any>;
  setWeeklyHistory?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setStudents?: (students: Student[]) => void;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  students = [],
  weeklySnapshots = [],
  monthlySnapshots = [],
  monthlyHistory = {},
  userAuth,
  settings,
  selectedWeek: propSelectedWeek,
  setSelectedWeek: propSetSelectedWeek,
  weeklyHistory: propWeeklyHistory,
  onSaveMonthlySnapshot,
  onOpenTeacherLogin,
  setStudents = (_students: Student[]) => {},
}) => {
  // Sub-Tab view mode: 'weekly' vs 'monthly'
  const [activeSummaryTab, setActiveSummaryTab] = useState<'weekly' | 'monthly'>('weekly');
  // 1. Shared Synchronized Week state
  const [internalSelectedWeek, setInternalSelectedWeek] = useState('Tuần 1');
  const selectedWeek = propSelectedWeek !== undefined ? propSelectedWeek : internalSelectedWeek;
  const setSelectedWeek = propSetSelectedWeek || setInternalSelectedWeek;

  // 2. Shared Synchronized Weekly History state
  const [internalWeeklyHistory] = useState<Record<string, any>>({});
  const weeklyHistory = propWeeklyHistory !== undefined ? propWeeklyHistory : internalWeeklyHistory;

  // Search & Filter UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');

  // Handle Week Change dropdown
  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const w = e.target.value;
    setSelectedWeek(w);

    const weekData = findWeekDataInHistory(weeklyHistory, w);
    if (weekData) {
      if (Array.isArray(weekData)) {
        setStudents(weekData);
      } else if (weekData && typeof weekData === 'object' && Array.isArray(weekData.studentRecords)) {
        const restored = (students.length > 0 ? students : initialStudents).map((initS) => {
          const rec = weekData.studentRecords.find((r: any) => isSameStudentId(r.studentId ?? r.id, initS.id));
          return rec
            ? { ...initS, points: rec.points, score: rec.points, speechCount: rec.speechCount ?? 0 }
            : { ...initS };
        });
        setStudents(restored);
      }
    }
  };

  // Obtain active student data for selected week
  const getActiveWeekStudents = (): Student[] => {
    const weekData = findWeekDataInHistory(weeklyHistory, selectedWeek);
    if (weekData) {
      if (Array.isArray(weekData)) {
        return weekData;
      }
      if (weekData && typeof weekData === 'object' && Array.isArray(weekData.studentRecords)) {
        return (students.length > 0 ? students : initialStudents).map((initS) => {
          const rec = weekData.studentRecords.find((r: any) => isSameStudentId(r.studentId ?? r.id, initS.id));
          return rec
            ? {
                ...initS,
                points: rec.points,
                score: rec.points,
                speechCount: rec.speechCount ?? 0,
              }
            : { ...initS };
        });
      }
    }
    return students.length > 0 ? students : initialStudents;
  };

  const weekStudents = getActiveWeekStudents();

  // Sort students by points descending, then speechCount descending
  const sortedStudents = [...weekStudents].sort((a, b) => {
    const ptsA = a.points ?? a.score ?? 100;
    const ptsB = b.points ?? b.score ?? 100;
    if (ptsB !== ptsA) return ptsB - ptsA;
    return (b.speechCount || 0) - (a.speechCount || 0);
  });

  // Filter students by search query and rank filter
  const filteredStudents = sortedStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const rank = getConductRank(student.points ?? student.score ?? 100, student.speechCount || 0);
    const matchesRank = rankFilter === 'all' || rank === rankFilter;
    return matchesSearch && matchesRank;
  });

  // Class Statistics
  const totalStudentsCount = sortedStudents.length;
  const totalPointsSum = sortedStudents.reduce((sum, s) => sum + (s.points ?? s.score ?? 100), 0);
  const avgPoints = totalStudentsCount > 0 ? (totalPointsSum / totalStudentsCount).toFixed(1) : '100';
  const totalSpeechCountSum = sortedStudents.reduce((sum, s) => sum + (s.speechCount || 0), 0);

  const excellentCount = sortedStudents.filter(
    (s) => getConductRank(s.points ?? s.score ?? 100, s.speechCount || 0) === 'Xuất Sắc'
  ).length;

  const goodCount = sortedStudents.filter(
    (s) => getConductRank(s.points ?? s.score ?? 100, s.speechCount || 0) === 'Tốt'
  ).length;

  // Top 3 Honor Roll Students
  const top1 = sortedStudents[0];
  const top2 = sortedStudents[1];
  const top3 = sortedStudents[2];

  // Team summary calculation
  const teamIds = ['to_1', 'to_2', 'to_3', 'to_4'];
  const teamNames: Record<string, string> = {
    to_1: 'Tổ 1 - Rồng Vàng',
    to_2: 'Tổ 2 - Phượng Hoàng',
    to_3: 'Tổ 3 - Hổ Chiến',
    to_4: 'Tổ 4 - Đại Bàng',
  };

  const teamStats = teamIds.map((tid) => {
    const members = sortedStudents.filter((s) => s.teamId === tid);
    const count = members.length;
    const pointsSum = members.reduce((sum, s) => sum + (s.points ?? s.score ?? 100), 0);
    const avg = count > 0 ? (pointsSum / count).toFixed(1) : '0';
    return {
      teamId: tid,
      name: teamNames[tid] || `Tổ ${tid.replace('to_', '')}`,
      count,
      pointsSum,
      avg: Number(avg),
    };
  }).sort((a, b) => b.avg - a.avg);

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Export CSV File Handler
  const handleExportCSV = () => {
    const csvRows = [
      ['STT', 'Họ và Tên', 'Tổ', 'Điểm Tuần', 'Lượt Phát Biểu', 'Xếp Loại Thi Đua', 'Lỗi / Ghi chú trừ điểm'],
    ];

    sortedStudents.forEach((s, index) => {
      const pts = s.points ?? s.score ?? 100;
      const speech = s.speechCount || 0;
      const rank = getConductRank(pts, speech);
      const teamName = teamNames[s.teamId || ''] || 'Tổ';
      const deductions = (s.deductionNotes || []).join('; ');

      csvRows.push([
        String(index + 1),
        `"${s.name}"`,
        `"${teamName}"`,
        String(pts),
        String(speech),
        `"${rank}"`,
        `"${deductions}"`,
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bang_Tong_Ket_${selectedWeek.replace(/\s+/g, '_')}_Lop_6A3.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex bg-indigo-50/80 p-1.5 rounded-2xl border border-indigo-200/80 gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSummaryTab('weekly')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSummaryTab === 'weekly'
              ? 'bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-md'
              : 'text-indigo-900 hover:bg-white/60 font-bold'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          <span>📊 TỔNG KẾT THEO TUẦN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSummaryTab('monthly')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSummaryTab === 'monthly'
              ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-purple-950 shadow-md border border-amber-300'
              : 'text-indigo-900 hover:bg-white/60 font-bold'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📅 XẾP HẠNG HỌC SINH THEO THÁNG</span>
        </button>
      </div>

      {activeSummaryTab === 'monthly' ? (
        <MonthlyRankingSection
          students={students}
          weeklyHistory={weeklyHistory}
          weeklySnapshots={weeklySnapshots}
          monthlySnapshots={monthlySnapshots}
          monthlyHistory={monthlyHistory}
          userAuth={userAuth}
          settings={settings}
          onSaveMonthlySnapshot={onSaveMonthlySnapshot}
          onOpenTeacherLogin={onOpenTeacherLogin}
        />
      ) : (
        <>
          {/* Header Toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-indigo-200 gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-extrabold text-indigo-900 flex items-center justify-center md:justify-start gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <span>TỔNG KẾT & LƯU TRỮ ĐIỂM THI ĐUA</span>
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Xem lại bảng điểm thi đua chi tiết đã lưu từ tab Thi Đua theo từng tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Synchronized Week Dropdown */}
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200 shadow-inner">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900">Xem Tuần:</span>
            <select
              value={selectedWeek}
              onChange={handleWeekChange}
              className="bg-transparent text-sm font-extrabold text-indigo-700 outline-none cursor-pointer"
            >
              {[...Array(35)].map((_, i) => (
                <option key={i + 1} value={`Tuần ${i + 1}`}>
                  Tuần {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Button In / Tải Báo Cáo */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold py-2 px-3.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 text-xs active:scale-95 border border-indigo-300/30"
            title="In hoặc lưu file PDF danh sách tổng kết thi đua của tuần đang chọn"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>🖨️ In / Tải Báo Cáo</span>
          </button>

          {/* Button Export CSV Excel */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs active:scale-95 border border-emerald-300/30"
            title="Tải Bảng tổng kết dạng file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Sĩ Số Học Sinh</div>
            <div className="text-xl font-black text-slate-900">{totalStudentsCount} HS</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Điểm Trung Bình</div>
            <div className="text-xl font-black text-amber-600">{avgPoints} đ</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Xuất Sắc & Tốt</div>
            <div className="text-xl font-black text-emerald-600">
              {excellentCount + goodCount} HS
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Lượt Phát Biểu</div>
            <div className="text-xl font-black text-purple-600">{totalSpeechCountSum} lượt</div>
          </div>
        </div>
      </div>

      {/* Top 3 Honor Roll Podiums */}
      {top1 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-3xl p-6 shadow-xl border-4 border-yellow-200 text-purple-950">
          <div className="text-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <span>🌟 VINH DANH TOP 3 HỌC SINH XUẤT SẮC NHẤT {selectedWeek.toUpperCase()} 🌟</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
            {/* Rank 2 */}
            {top2 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 text-center border-2 border-slate-300 shadow-md flex flex-col items-center">
                <div className="text-xl font-black text-slate-500 mb-1">🥈 Hạng 2</div>
                <ChibiAvatar
                  gender={top2.gender}
                  styleIndex={top2.avatarStyle}
                  avatarUrl={top2.avatarUrl || top2.photoUrl}
                  size="lg"
                />
                <h4 className="font-extrabold text-sm text-slate-900 mt-2">{top2.name}</h4>
                <div className="text-xs font-black text-amber-600 mt-1">
                  {top2.points ?? top2.score ?? 100} điểm
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  ✋ {top2.speechCount || 0} lượt phát biểu
                </div>
              </div>
            )}

            {/* Rank 1 */}
            <div className="bg-white rounded-2xl p-5 text-center border-4 border-amber-400 shadow-2xl flex flex-col items-center -translate-y-2">
              <div className="text-2xl font-black text-amber-500 mb-1 flex items-center gap-1">
                <span>👑 Hạng 1</span>
              </div>
              <ChibiAvatar
                gender={top1.gender}
                styleIndex={top1.avatarStyle}
                avatarUrl={top1.avatarUrl || top1.photoUrl}
                size="lg"
              />
              <h4 className="font-black text-base text-slate-900 mt-2">{top1.name}</h4>
              <div className="text-base font-black text-amber-600 mt-1">
                {top1.points ?? top1.score ?? 100} điểm
              </div>
              <div className="text-xs font-bold text-slate-600">
                ✋ {top1.speechCount || 0} lượt phát biểu
              </div>
            </div>

            {/* Rank 3 */}
            {top3 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 text-center border-2 border-amber-600/40 shadow-md flex flex-col items-center">
                <div className="text-xl font-black text-amber-700 mb-1">🥉 Hạng 3</div>
                <ChibiAvatar
                  gender={top3.gender}
                  styleIndex={top3.avatarStyle}
                  avatarUrl={top3.avatarUrl || top3.photoUrl}
                  size="lg"
                />
                <h4 className="font-extrabold text-sm text-slate-900 mt-2">{top3.name}</h4>
                <div className="text-xs font-black text-amber-600 mt-1">
                  {top3.points ?? top3.score ?? 100} điểm
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  ✋ {top3.speechCount || 0} lượt phát biểu
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Ranking Cards */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>🏆 BẢNG XẾP HẠNG THI ĐUA THEO TỔ - {selectedWeek.toUpperCase()}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {teamStats.map((team, idx) => (
            <div
              key={team.teamId}
              className={`p-4 rounded-2xl border-2 shadow-sm ${
                idx === 0
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  {idx === 0 ? '🥇 Hạng 1' : idx === 1 ? '🥈 Hạng 2' : idx === 2 ? '🥉 Hạng 3' : `Hạng ${idx + 1}`}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                  {team.count} HS
                </span>
              </div>
              <h4 className="font-black text-sm text-slate-900 mb-1">{team.name}</h4>
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs text-slate-600">Trung bình:</span>
                <span className="text-base font-black text-amber-600">{team.avg} đ</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Student Ranking Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-black text-base text-slate-900">
            BẢNG TỔNG HỢP CHI TIẾT ĐIỂM HỌC SINH ({selectedWeek.toUpperCase()})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Rank Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 pr-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả xếp loại</option>
                <option value="Xuất Sắc">Xuất Sắc</option>
                <option value="Tốt">Tốt</option>
                <option value="Khá">Khá</option>
                <option value="Đạt">Đạt</option>
                <option value="Chưa Đạt">Chưa Đạt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3">Học Sinh</th>
                <th className="p-3">Tổ</th>
                <th className="p-3">Lỗi / Ghi chú trừ điểm</th>
                <th className="p-3 text-center">Phát Biểu</th>
                <th className="p-3 text-center">Điểm Tuần</th>
                <th className="p-3 text-center">Xếp Loại Thi Đua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.map((student, index) => {
                const pts = student.points ?? student.score ?? 100;
                const speech = student.speechCount || 0;
                const rank = getConductRank(pts, speech);
                const rankInfo = getConductRankInfo(rank);
                const teamName = teamNames[student.teamId || ''] || 'Tổ';
                const deductions = student.deductionNotes || [];

                return (
                  <tr key={student.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <ChibiAvatar
                          gender={student.gender}
                          styleIndex={student.avatarStyle}
                          avatarUrl={student.avatarUrl || student.photoUrl}
                          size="sm"
                        />
                        <span className="font-extrabold text-slate-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 font-semibold">{teamName}</td>
                    <td className="p-3">
                      {deductions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {deductions.map((dNote, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md"
                            >
                              <span>⚠️</span>
                              <span>{dNote}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Không có lỗi</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-purple-700">✋ {speech}</td>
                    <td className="p-3 text-center font-black text-amber-600 text-sm">
                      {pts} đ
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-black shadow-sm ${rankInfo.badgeBg}`}
                      >
                        {rank}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-semibold">
                    Không tìm thấy học sinh phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
  );
};
