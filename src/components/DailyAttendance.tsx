import React, { useState, useEffect } from 'react';
import { Student, DailyAttendanceRecord, AttendanceStatus, UserAuth, ClassSettings } from '../types';
import { sound } from '../utils/sound';
import { getVietnamDate } from '../utils/dateUtils';
import { CalendarCheck, CheckCircle, AlertCircle, Clock, Save, UserX, Search, Filter, History, Award } from 'lucide-react';

interface DailyAttendanceProps {
  students: Student[];
  attendanceRecords: DailyAttendanceRecord[];
  userAuth: UserAuth;
  settings: ClassSettings;
  onSaveAttendance: (record: DailyAttendanceRecord, showToastNotification?: boolean) => void;
  onDeductPointsForAttendance: (studentId: string, pointsDelta: number, reason: string) => void;
  onOpenTeacherLogin: () => void;
}

export const DailyAttendance: React.FC<DailyAttendanceProps> = ({
  students,
  attendanceRecords,
  userAuth,
  settings,
  onSaveAttendance,
  onDeductPointsForAttendance,
  onOpenTeacherLogin,
}) => {
  const isAdmin = userAuth.role === 'admin';

  // Today's YYYY-MM-DD string in Vietnam Timezone
  const todayStr = getVietnamDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Attendance state for each student: studentId -> status ('present' | 'excused' | 'unexcused' | 'late')
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>(() => {
    const existing = (attendanceRecords || []).find((r) => r.date === todayStr);
    if (existing && existing.items) {
      const initialMap: Record<string, AttendanceStatus> = {};
      existing.items.forEach((item) => {
        initialMap[item.studentId] = item.status;
      });
      return initialMap;
    }
    // Default all 44 students to present
    const defaultMap: Record<string, AttendanceStatus> = {};
    (students || []).forEach((s) => {
      defaultMap[s.id] = 'present';
    });
    return defaultMap;
  });

  // When selected date changes, load attendance for that date if exists
  useEffect(() => {
    const existing = (attendanceRecords || []).find((r) => r.date === selectedDate);
    const newMap: Record<string, AttendanceStatus> = {};
    (students || []).forEach((s) => {
      const foundItem = (existing?.items || []).find((i) => i.studentId === s.id);
      newMap[s.id] = foundItem ? foundItem.status : 'present';
    });
    setAttendanceState(newMap);
  }, [selectedDate, attendanceRecords, students]);

  // Helper to sync current attendance state immediately to parent/Cloud
  const persistAttendanceRecord = (map: Record<string, AttendanceStatus>, dateStr: string, showToast = false) => {
    const items = students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      status: map[s.id] || 'present',
    }));

    const record: DailyAttendanceRecord = {
      id: `att_${dateStr}`,
      date: dateStr,
      timestamp: new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) + ' ' + dateStr,
      items,
    };

    onSaveAttendance(record, showToast);
  };

  // Handle click on status button
  const handleStatusClick = (student: Student, newStatus: AttendanceStatus) => {
    const currentStatus = attendanceState[student.id];
    if (currentStatus === newStatus) return;

    const newMap = {
      ...attendanceState,
      [student.id]: newStatus,
    };

    setAttendanceState(newMap);
    persistAttendanceRecord(newMap, selectedDate, false);

    // Trigger confirmation / popup for points deduction if applicable
    if (newStatus === 'excused') {
      if (confirm(`Nghỉ có phép (${student.name}): Bạn có muốn trừ 2đ thi đua không?`)) {
        onDeductPointsForAttendance(student.id, -2, 'Nghỉ học có phép (Điểm danh ngày)');
      }
    } else if (newStatus === 'unexcused') {
      if (confirm(`Nghỉ không phép (${student.name}): Bạn có muốn trừ 5đ thi đua không?`)) {
        onDeductPointsForAttendance(student.id, -5, 'Nghỉ học không phép (Điểm danh ngày)');
      }
    } else if (newStatus === 'late') {
      if (confirm(`Đi muộn (${student.name}): Bạn có muốn trừ 5đ thi đua không?`)) {
        onDeductPointsForAttendance(student.id, -5, 'Đi học muộn (Điểm danh ngày)');
      }
    }
  };

  // Quick action: Set ALL students present
  const handleSetAllPresent = () => {
    const allPresentMap: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      allPresentMap[s.id] = 'present';
    });
    setAttendanceState(allPresentMap);
    persistAttendanceRecord(allPresentMap, selectedDate, false);
    sound.playPointGain();
  };

  // Save Daily Attendance Record (explicit user click)
  const handleSaveAttendance = () => {
    persistAttendanceRecord(attendanceState, selectedDate, true);
    sound.playPointGain();
    sound.triggerConfetti();
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesName = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === 'all' || s.teamId === teamFilter;
    return matchesName && matchesTeam;
  });

  // Calculate statistics for selected date
  const counts = {
    present: Object.values(attendanceState).filter((st) => st === 'present').length,
    excused: Object.values(attendanceState).filter((st) => st === 'excused').length,
    unexcused: Object.values(attendanceState).filter((st) => st === 'unexcused').length,
    late: Object.values(attendanceState).filter((st) => st === 'late').length,
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-amber-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-400/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <span>Chuyên Cần & Nề Nếp Lớp 6A3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow">
            📅 ĐIỂM DANH NGÀY HỌC
          </h1>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1">
            Điểm danh 1 chạm cho 44 học sinh, tự động trừ điểm thi đua & thống kê vắng hằng tháng
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              onClick={handleSaveAttendance}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg border border-amber-300 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>💾 Lưu Điểm Danh Hôm Nay</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-amber-400/20 text-yellow-300 border border-yellow-400/30 rounded-2xl font-bold text-xs flex items-center gap-1.5">
              <span>👁️ Chế Độ Khách (Chỉ Xem)</span>
            </div>
          )}
        </div>
      </div>

      {/* Date Selector & Summary Cards Bar */}
      <div className="bg-white/95 p-4 rounded-3xl border border-amber-200 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-600" /> Ngày Điểm Danh:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs sm:text-sm font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-inner"
            />
          </div>

          {isAdmin && (
            <button
              onClick={handleSetAllPresent}
              className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Tất Cả 44 HS Có Mặt</span>
            </button>
          )}
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-100">
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center">
            <div className="text-[10px] font-black text-emerald-700 uppercase">Có Mặt</div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{counts.present} / 44</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center">
            <div className="text-[10px] font-black text-amber-800 uppercase">Nghỉ Có Phép (P)</div>
            <div className="text-xl font-black text-amber-900 mt-0.5">{counts.excused} HS</div>
          </div>
          <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-center">
            <div className="text-[10px] font-black text-rose-700 uppercase">Nghỉ Không Phép (KP)</div>
            <div className="text-xl font-black text-rose-800 mt-0.5">{counts.unexcused} HS</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl border border-orange-200 text-center">
            <div className="text-[10px] font-black text-orange-700 uppercase">Đi Muộn (M)</div>
            <div className="text-xl font-black text-orange-800 mt-0.5">{counts.late} HS</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/10 p-3 rounded-2xl border border-amber-200">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-amber-700 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm tên học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-amber-800" />
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">Tất cả các tổ</option>
            <option value="to_1">Tổ 1 - Rồng Vàng</option>
            <option value="to_2">Tổ 2 - Phượng Hoàng</option>
            <option value="to_3">Tổ 3 - Sư Tử Bạc</option>
            <option value="to_4">Tổ 4 - Đại Bàng Xanh</option>
          </select>
        </div>
      </div>

      {/* 44 Students Attendance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredStudents.map((student, idx) => {
          const currentStatus = attendanceState[student.id] || 'present';

          return (
            <div
              key={student.id}
              className={`p-3.5 rounded-2xl border shadow-sm transition-all flex flex-col justify-between gap-3 ${
                currentStatus === 'present'
                  ? 'bg-white border-amber-200/80 hover:border-emerald-300'
                  : currentStatus === 'excused'
                  ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
                  : currentStatus === 'unexcused'
                  ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-400'
                  : 'bg-orange-50/90 border-orange-300 ring-1 ring-orange-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                    {student.teamId.replace('_', ' ')} • STT {idx + 1}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{student.name}</h3>
                </div>

                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {student.points}đ
                </span>
              </div>

              {/* Status Display: Interactive Buttons for Admin, Read-only Badge for Guests */}
              {isAdmin ? (
                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-amber-100">
                  <button
                    type="button"
                    onClick={() => handleStatusClick(student, 'present')}
                    className={`py-1.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400'
                        : 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200'
                    }`}
                    title="Có mặt đầy đủ"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Có mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusClick(student, 'excused')}
                    className={`py-1.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                      currentStatus === 'excused'
                        ? 'bg-amber-500 text-purple-950 font-black shadow ring-2 ring-amber-300'
                        : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                    }`}
                    title="Nghỉ có phép (-2đ)"
                  >
                    <span>P</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusClick(student, 'unexcused')}
                    className={`py-1.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                      currentStatus === 'unexcused'
                        ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                        : 'bg-rose-100/80 text-rose-900 hover:bg-rose-200'
                    }`}
                    title="Nghỉ không phép (-5đ)"
                  >
                    <UserX className="w-3 h-3" />
                    <span>KP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusClick(student, 'late')}
                    className={`py-1.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                      currentStatus === 'late'
                        ? 'bg-orange-500 text-white shadow ring-2 ring-orange-300'
                        : 'bg-orange-100/80 text-orange-900 hover:bg-orange-200'
                    }`}
                    title="Đi học muộn (-5đ)"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Đi muộn</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Trạng thái:</span>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black shadow-sm flex items-center gap-1 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : currentStatus === 'excused'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : currentStatus === 'unexcused'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-orange-100 text-orange-900 border border-orange-300'
                    }`}
                  >
                    {currentStatus === 'present' && (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Có mặt</span>
                      </>
                    )}
                    {currentStatus === 'excused' && <span>Nghỉ có phép (P)</span>}
                    {currentStatus === 'unexcused' && (
                      <>
                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                        <span>Nghỉ không phép (KP)</span>
                      </>
                    )}
                    {currentStatus === 'late' && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>Đi muộn</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attendance History & Monthly Absence Summary Section */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-900 font-black text-base border-b border-amber-100 pb-3">
          <History className="w-5 h-5 text-amber-600" />
          <span>LỊCH SỬ VẮNG & CHUYÊN CẦN ĐÃ LƯU</span>
        </div>

        {attendanceRecords.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Chưa có lịch sử điểm danh ngày nào được lưu. Bấm "Lưu Điểm Danh Hôm Nay" để lưu trữ.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {attendanceRecords.map((rec) => {
              const absCount = rec.items.filter((i) => i.status !== 'present').length;
              return (
                <div key={rec.id} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600" />
                    <span>Ngày {rec.date}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({rec.timestamp})</span>
                  </div>

                  <div>
                    {absCount === 0 ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black">
                        100% Đi học đầy đủ
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[11px] font-black">
                        Vắng / Trễ: {absCount} HS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
