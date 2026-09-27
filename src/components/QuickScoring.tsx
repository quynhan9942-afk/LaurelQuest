import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  History,
  RotateCcw,
  Save,
  Calendar,
} from 'lucide-react';
import { Student, Team, PointCriteria, PointLog } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { DEFAULT_CRITERIA, INITIAL_STUDENTS as initialStudents } from '../data/defaultData';
import { sound } from '../utils/sound';
import { loadClassData, saveClassData } from '../utils/storage';
import { saveClassDataToCloud } from '../lib/firebase';
import { findWeekDataInHistory, isSameStudentId } from '../utils/weekUtils';

interface QuickScoringProps {
  students: Student[];
  teams: Team[];
  onAddPointLog: (
    studentId: string,
    points: number,
    criteriaName: string,
    category: PointLog['category'],
    note?: string
  ) => void;
  pointLogs: PointLog[];
  selectedWeek?: string;
  setSelectedWeek?: (week: string) => void;
  weeklyHistory?: Record<string, any>;
  setWeeklyHistory?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setStudents?: (students: Student[]) => void;
}

export const QuickScoring: React.FC<QuickScoringProps> = ({
  students,
  teams,
  onAddPointLog,
  pointLogs,
  selectedWeek: propSelectedWeek,
  setSelectedWeek: propSetSelectedWeek,
  weeklyHistory: propWeeklyHistory,
  setWeeklyHistory: propSetWeeklyHistory,
  setStudents = (_students: Student[]) => {},
}) => {
  // 1. Synchronized selectedWeek state
  const [internalSelectedWeek, setInternalSelectedWeek] = useState('Tuần 1');
  const selectedWeek = propSelectedWeek !== undefined ? propSelectedWeek : internalSelectedWeek;
  const setSelectedWeek = propSetSelectedWeek || setInternalSelectedWeek;

  // 2. Synchronized weeklyHistory state (derived from props/cloud, no localStorage overwrite)
  const [internalWeeklyHistory, setInternalWeeklyHistory] = useState<Record<string, any>>({});
  const weeklyHistory = propWeeklyHistory !== undefined ? propWeeklyHistory : internalWeeklyHistory;
  const setWeeklyHistory = propSetWeeklyHistory || setInternalWeeklyHistory;

  // UI Local States
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<PointCriteria | null>(null);
  const [customPoints, setCustomPoints] = useState<number>(1);
  const [customReason, setCustomReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [activeTabType, setActiveTabType] = useState<'plus' | 'minus'>('plus');

  // Handle Week Change
  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedW = e.target.value;
    setSelectedWeek(selectedW);

    // Sync student data for the selected week if history exists
    const weekData = findWeekDataInHistory(weeklyHistory, selectedW);
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
    // SECTION IV: DO NOT reset points to 100 for unrecorded week!
  };

  // Execute Reset week
  const executeResetWeek = async () => {
    const currentWeek = selectedWeek || 'Tuần 1';

    try {
      setIsSaving(true);
      const baseList = students && students.length > 0 ? students : initialStudents;
      const resetStudents = baseList.map((s: any) => ({
        ...s,
        score: 100,
        diem: 100,
        points: 100,
        tongDiem: 100,
        diemTichLuy: 100,
        speechCount: 0,
        totalPositive: 0,
        totalNegative: 0,
        deductionNotes: [],
        notes: '',
      }));

      // 1. Update React States
      setStudents(resetStudents);

      // 2. Save directly to weeklyHistory
      const newHistory = { ...weeklyHistory, [currentWeek]: resetStudents };
      setWeeklyHistory(newHistory);

      sound.playPointGain();
      setIsSaving(false);
    } catch (error) {
      console.error('Lỗi khi reset điểm tuần:', error);
      setIsSaving(false);
    }
  };

  // NÚT LƯU ĐIỂM: Lưu dữ liệu vào weeklyHistory
  const handleSaveWeekWithEffect = async () => {
    if (!students || students.length === 0) return;
    const currentWeek = selectedWeek || 'Tuần 1';
    const newHistory = { ...weeklyHistory, [currentWeek]: students };

    try {
      setIsSaving(true);
      
      // 1. Update React States
      setWeeklyHistory(newHistory);
      setStudents(students);

      sound.playPointGain();
      setTimeout(() => setIsSaving(false), 2000);
    } catch (error) {
      console.error('Lỗi lưu trữ:', error);
      setIsSaving(false);
    }
  };

  // Filter criteria by positive vs negative
  const positiveCriteria = DEFAULT_CRITERIA.filter((c) => c.points > 0);
  const negativeCriteria = DEFAULT_CRITERIA.filter((c) => c.points < 0);

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeamFilter === 'all' || student.teamId === selectedTeamFilter;
    return matchesSearch && matchesTeam;
  });

  // Handle Quick +/- Point Actions
  const handleQuickAdd = (e: React.MouseEvent, student: Student, pts: number, reason: string) => {
    e.stopPropagation();
    const category = pts > 0 ? 'hoc_tap' : 'ne_nep';
    onAddPointLog(student.id, pts, reason, category, 'Cộng điểm nhanh');

    if (pts > 0) {
      sound.playPointGain();
      sound.triggerConfetti();
    } else {
      sound.playPointDeduct();
    }
  };

  // Handle Submit Modal Scoring
  const handleApplyScore = () => {
    if (!selectedStudent) return;

    let pts = 0;
    let reason = '';
    let category: PointLog['category'] = 'hoc_tap';

    if (selectedCriteria) {
      pts = selectedCriteria.points;
      reason = selectedCriteria.name;
      category = selectedCriteria.category;
    } else if (customReason.trim()) {
      pts = activeTabType === 'plus' ? Math.abs(customPoints) : -Math.abs(customPoints);
      reason = customReason.trim();
      category = activeTabType === 'plus' ? 'hoc_tap' : 'ne_nep';
    } else {
      return;
    }

    onAddPointLog(selectedStudent.id, pts, reason, category, note);

    if (pts > 0) {
      sound.playPointGain();
      sound.triggerConfetti();
    } else {
      sound.playPointDeduct();
    }

    // Reset modal state
    setSelectedStudent(null);
    setSelectedCriteria(null);
    setCustomReason('');
    setNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-yellow-200 mb-6 gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-extrabold text-amber-700 flex items-center justify-center md:justify-start gap-2">
            <span>🏆 THI ĐUA & CHẤM ĐIỂM NHANH</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Cộng/trừ điểm thi đua cho học sinh, ghi nhận lý do vi phạm và lưu trữ theo từng tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-300 shadow-inner">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">Chọn Tuần:</span>
            <select
              value={selectedWeek || 'Tuần 1'}
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

          {/* Nút Reset Mới */}
          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3.5 rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 text-xs active:scale-95"
            title="Reset điểm của tuần đang chọn về 100 điểm, 0 lượt phát biểu và xóa sạch lỗi trừ điểm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>🔄 Reset</span>
          </button>

          {/* Nút Lưu Điểm */}
          <button
            type="button"
            onClick={handleSaveWeekWithEffect}
            className={`font-bold py-2 px-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer flex items-center gap-2 text-xs active:scale-95 ${
              isSaving
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 scale-105'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '✨ Đã lưu thành công!' : '💾 Lưu Điểm'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 pr-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả các Tổ</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredStudents.map((student) => {
          const team = teams.find((t) => t.id === student.teamId);

          return (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="bg-white rounded-2xl p-4 shadow-md border-2 border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <ChibiAvatar
                      gender={student.gender}
                      styleIndex={student.avatarStyle}
                      avatarUrl={student.avatarUrl || student.photoUrl}
                      size="md"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                        {student.name}
                      </h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-block mt-0.5">
                        {team ? team.name : 'Tổ'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-200/60 flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">Điểm tích lũy:</span>
                  <span className="text-lg font-black text-amber-600">{student.points} đ</span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={(e) => handleQuickAdd(e, student, 1, 'Phát biểu ý kiến xây dựng bài (+1)')}
                  className="py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1 active:scale-95 transition-all border border-amber-300"
                  title="Cộng 1 điểm & +1 lượt phát biểu xây dựng bài"
                >
                  <span>✋ +1 Phát Biểu</span>
                </button>

                <button
                  onClick={(e) => handleQuickAdd(e, student, 5, 'Bài kiểm tra đạt điểm 9 - 10 (+5)')}
                  className="py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                  title="Điểm 9/10: +5 điểm"
                >
                  <span>💯 +5 Điểm 9/10</span>
                </button>

                <button
                  onClick={(e) => handleQuickAdd(e, student, 10, 'Làm việc tốt / Giúp đỡ bạn (+10)')}
                  className="py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                  title="Làm việc tốt: +10 điểm"
                >
                  <span>🌟 +10 Việc Tốt</span>
                </button>

                <button
                  onClick={() => setSelectedStudent(student)}
                  className="py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                  title="Trừ điểm vi phạm"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Trừ Điểm...</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal scoring popup */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-amber-300 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <ChibiAvatar
                  gender={selectedStudent.gender}
                  styleIndex={selectedStudent.avatarStyle}
                  size="md"
                />
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Chấm Điểm: {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-amber-700 font-semibold">
                    Hiện có: {selectedStudent.points} điểm tích lũy
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Toggle Plus vs Minus */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => {
                  setActiveTabType('plus');
                  setSelectedCriteria(null);
                }}
                className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTabType === 'plus'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Khen Thưởng (Cộng Điểm)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabType('minus');
                  setSelectedCriteria(null);
                }}
                className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTabType === 'minus'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Nhắc Nhở (Trừ Điểm)</span>
              </button>
            </div>

            {/* Criteria options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Chọn tiêu chí sẵn có:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {(activeTabType === 'plus' ? positiveCriteria : negativeCriteria).map((criteria) => {
                  const isSelected = selectedCriteria?.id === criteria.id;

                  return (
                    <button
                      key={criteria.id}
                      onClick={() => {
                        setSelectedCriteria(criteria);
                        setCustomReason('');
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between text-xs font-semibold ${
                        isSelected
                          ? activeTabType === 'plus'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-300'
                            : 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{criteria.icon}</span>
                        <span className="truncate">{criteria.name}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                          criteria.points > 0
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-rose-200 text-rose-800'
                        }`}
                      >
                        {criteria.points > 0 ? `+${criteria.points}` : criteria.points}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom reason / points */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Hoặc nhập lý do khác:
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Hỗ trợ cô giáo dọn bảng..."
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setSelectedCriteria(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(Number(e.target.value))}
                  className="w-20 px-3 py-2 text-xs font-bold text-center rounded-xl bg-white border border-slate-300"
                />
              </div>
            </div>

            {/* Note field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Ghi chú thêm (Tùy chọn):</label>
              <input
                type="text"
                placeholder="Ghi chú cụ thể..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>

              <button
                onClick={handleApplyScore}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg active:scale-95 transition-all ${
                  activeTabType === 'plus'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-500/30'
                }`}
              >
                Xác Nhận Chấm Điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point History Log */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-300/60 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-600" />
          <h3 className="font-black text-base text-slate-900 uppercase">
            LỊCH SỬ CHẤM ĐIỂM GẦN ĐÂY
          </h3>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {pointLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded-lg font-black ${
                    log.points > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {log.points > 0 ? `+${log.points}` : log.points}đ
                </span>
                <div>
                  <span className="font-extrabold text-slate-900 mr-2">{log.studentName}</span>
                  <span className="text-slate-600">{log.criteriaName}</span>
                  {log.note && <span className="text-slate-400 italic ml-2">({log.note})</span>}
                </div>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal xác nhận Reset */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Xác nhận Reset {selectedWeek || 'Tuần 1'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn RESET điểm học sinh trong <span className="font-bold text-amber-700">{selectedWeek || 'Tuần 1'}</span> về 100 điểm, 0 lượt phát biểu và xóa sạch danh sách lỗi trừ điểm không?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  executeResetWeek();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow transition-all cursor-pointer"
              >
                Xác nhận Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
