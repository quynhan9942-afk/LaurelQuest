import React, { useState } from 'react';
import { Trophy, Plus, Edit2, Trash2, Save, X, Filter, History, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { SchoolRanking, UserAuth } from '../types';

interface SchoolRankingManagerProps {
  rankings: SchoolRanking[];
  userAuth: UserAuth;
  defaultClassName?: string;
  defaultAcademicYear?: string;
  onUpdateRankings: (newRankings: SchoolRanking[]) => void;
  onDeleteRanking?: (id: string) => void;
  onOpenTeacherLogin?: () => void;
}

export const SchoolRankingManager: React.FC<SchoolRankingManagerProps> = ({
  rankings = [],
  userAuth,
  defaultClassName = '6A3',
  defaultAcademicYear = '2026–2027',
  onUpdateRankings,
  onDeleteRanking,
  onOpenTeacherLogin,
}) => {
  const isAdmin = userAuth.role === 'admin';

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<SchoolRanking | null>(null);
  const [week, setWeek] = useState<number>(() => {
    if (rankings.length > 0) {
      const maxWeek = Math.max(...rankings.map((r) => r.week));
      return maxWeek + 1;
    }
    return 1;
  });
  const [schoolYear, setSchoolYear] = useState<string>(defaultAcademicYear);
  const [className, setClassName] = useState<string>(defaultClassName);
  const [rank, setRank] = useState<number>(2);
  const [totalClasses, setTotalClasses] = useState<number>(26);
  const [note, setNote] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter States for Table
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  // Unique filter values
  const availableYears = Array.from(new Set(rankings.map((r) => r.schoolYear))).filter(Boolean);
  const availableWeeks = Array.from(new Set(rankings.map((r) => r.week))).sort((a, b) => a - b);
  const availableClasses = Array.from(new Set(rankings.map((r) => r.className))).filter(Boolean);

  // Reset form to default
  const handleResetForm = () => {
    setEditingId(null);
    const maxWeek = rankings.length > 0 ? Math.max(...rankings.map((r) => r.week)) : 0;
    setWeek(maxWeek + 1 || 1);
    setSchoolYear(defaultAcademicYear);
    setClassName(defaultClassName);
    setRank(2);
    setTotalClasses(26);
    setNote('');
  };

  // Populate form for editing
  const handleStartEdit = (record: SchoolRanking) => {
    if (!isAdmin) {
      onOpenTeacherLogin?.();
      return;
    }
    setEditingId(record.id);
    setWeek(record.week);
    setSchoolYear(record.schoolYear || defaultAcademicYear);
    setClassName(record.className || defaultClassName);
    setRank(record.rank);
    setTotalClasses(record.totalClasses);
    setNote(record.note || '');
  };

  // Save or Update Record
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onOpenTeacherLogin?.();
      return;
    }

    if (rank < 1) {
      alert('Thứ hạng phải là số nguyên dương từ 1 trở lên.');
      return;
    }
    if (totalClasses < 1) {
      alert('Tổng số lớp phải lớn hơn 0.');
      return;
    }

    let updatedList: SchoolRanking[] = [];

    if (editingId) {
      // Update existing record
      updatedList = rankings.map((r) => {
        if (r.id === editingId) {
          return {
            ...r,
            week,
            schoolYear: schoolYear.trim(),
            className: className.trim(),
            rank,
            totalClasses,
            note: note.trim(),
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });
      setSuccessMsg(`Đã cập nhật thành công thứ hạng Tuần ${week}!`);
    } else {
      // Create new record
      const newRecord: SchoolRanking = {
        id: `rank_week_${week}_${Date.now()}`,
        classId: 'thcs_nguyenvancu_6a3',
        className: className.trim(),
        week,
        schoolYear: schoolYear.trim(),
        rank,
        totalClasses,
        note: note.trim(),
        createdAt: new Date().toISOString(),
        createdBy: userAuth.email || 'Admin',
      };

      // Check if entry for same week & year exists
      const existingIdx = rankings.findIndex(
        (r) => r.week === week && r.schoolYear === schoolYear.trim() && r.className === className.trim()
      );

      if (existingIdx >= 0) {
        // Replace existing week entry
        updatedList = [...rankings];
        updatedList[existingIdx] = newRecord;
        setSuccessMsg(`Đã cập nhật kết quả thứ hạng mới cho Tuần ${week}!`);
      } else {
        updatedList = [newRecord, ...rankings];
        setSuccessMsg(`Đã thêm mới thứ hạng Tuần ${week} (${rank}/${totalClasses}) thành công!`);
      }
    }

    onUpdateRankings(updatedList);
    handleResetForm();

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Trigger Delete Confirmation Modal
  const handleDeleteClick = (record: SchoolRanking) => {
    if (!isAdmin) {
      onOpenTeacherLogin?.();
      return;
    }
    setConfirmDeleteTarget(record);
  };

  // Execute actual deletion after confirmation
  const handleExecuteDelete = () => {
    if (!confirmDeleteTarget) return;
    if (!isAdmin) {
      onOpenTeacherLogin?.();
      setConfirmDeleteTarget(null);
      return;
    }

    const targetId = confirmDeleteTarget.id;
    const targetWeek = confirmDeleteTarget.week;
    setConfirmDeleteTarget(null);

    if (onDeleteRanking) {
      onDeleteRanking(targetId);
    } else {
      const updatedList = rankings.filter((r) => r.id !== targetId);
      onUpdateRankings(updatedList);
    }

    if (editingId === targetId) {
      handleResetForm();
    }

    setSuccessMsg('✅ Đã xóa kết quả thứ hạng.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Filtered and Sorted Rankings
  const filteredRankings = rankings.filter((r) => {
    if (filterYear !== 'all' && r.schoolYear !== filterYear) return false;
    if (filterWeek !== 'all' && String(r.week) !== filterWeek) return false;
    if (filterClass !== 'all' && r.className !== filterClass) return false;
    return true;
  });

  // Sort chronologically by week ascending for change calculations
  const sortedAsc = [...rankings].sort((a, b) => a.week - b.week);

  // Helper to calculate change for a given week
  const getChangeIndicator = (current: SchoolRanking) => {
    const prev = sortedAsc.find((r) => r.week === current.week - 1 && r.schoolYear === current.schoolYear);
    if (!prev) return <span className="text-slate-400 font-bold">—</span>;

    const diff = prev.rank - current.rank;
    if (diff > 0) {
      return (
        <span className="text-emerald-600 font-black flex items-center gap-0.5">
          ↑ {diff}
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="text-rose-600 font-black flex items-center gap-0.5">
          ↓ {Math.abs(diff)}
        </span>
      );
    } else {
      return <span className="text-slate-500 font-black">→ 0</span>;
    }
  };

  // Helper for rank trophy emoji
  const getRankEmoji = (r: number) => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return '🏆';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-amber-300/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow-md">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
              <span>📊 QUẢN LÝ THỨ HẠNG TOÀN TRƯỜNG</span>
            </h2>
            <p className="text-xs text-slate-600">
              Cập nhật thi đua hằng tuần của lớp so với toàn trường (Chỉ tài khoản Admin)
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="px-3.5 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Permission Warning for Non-Admin */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Chỉ tài khoản <strong>ADMIN (quynhan9942@gmail.com)</strong> mới có quyền cập nhật và chỉnh sửa thứ hạng thi đua toàn trường hằng tuần.
            </span>
          </div>
          <button
            onClick={onOpenTeacherLogin}
            className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-yellow-300 font-black rounded-xl shrink-0 flex items-center gap-1 shadow"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đăng Nhập Admin</span>
          </button>
        </div>
      )}

      {/* Form Section */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 space-y-4 text-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-black text-sm text-amber-950 uppercase tracking-wide flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>CHỈNH SỬA THỨ HẠNG TUẦN {week}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-amber-600" />
                <span>NHẬP THỨ HẠNG TUẦN MỚI</span>
              </>
            )}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy chỉnh sửa</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Tuần Thi Đua
            </label>
            <input
              type="number"
              min="1"
              max="52"
              required
              disabled={!isAdmin}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-black rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="1"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Năm Học
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="2026–2027"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Tên Lớp
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="6A3"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Thứ Hạng Đạt Được
            </label>
            <input
              type="number"
              min="1"
              required
              disabled={!isAdmin}
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-black text-amber-700 rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Tổng Số Lớp Toàn Trường
            </label>
            <input
              type="number"
              min="1"
              required
              disabled={!isAdmin}
              value={totalClasses}
              onChange={(e) => setTotalClasses(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-black rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="26"
            />
          </div>

          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase">
              Ghi Chú Tùy Chọn
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
              placeholder="VD: Thi đua tuần 1"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-purple-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'Lưu Cập Nhật Thứ Hạng' : 'Lưu Kết Quả Thứ Hạng Tuần'}</span>
            </button>
          </div>
        )}
      </form>

      {/* History Table Section */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">
              LỊCH SỬ THỨ HẠNG HẰNG TUẦN
            </h3>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-extrabold text-xs rounded-full">
              {filteredRankings.length} bản ghi
            </span>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-600 text-[10px] uppercase">Lọc:</span>

              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-white px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả năm học</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Week Filter */}
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="bg-white px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả tuần</option>
                {availableWeeks.map((w) => (
                  <option key={w} value={String(w)}>
                    Tuần {w}
                  </option>
                ))}
              </select>

              {/* Class Filter */}
              {availableClasses.length > 1 && (
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-white px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 focus:outline-none"
                >
                  <option value="all">Tất cả lớp</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Table Render */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                <th className="py-3 px-3">Tuần</th>
                <th className="py-3 px-3">Năm Học</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Thứ Hạng</th>
                <th className="py-3 px-3 text-center">Biến Động</th>
                <th className="py-3 px-3">Ghi Chú</th>
                {isAdmin && <th className="py-3 px-3 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredRankings.length > 0 ? (
                [...filteredRankings]
                  .sort((a, b) => b.week - a.week)
                  .map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/50 transition-colors ${
                        editingId === item.id ? 'bg-amber-100/60 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-black text-amber-900">
                        Tuần {item.week}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {item.schoolYear}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.className}
                      </td>
                      <td className="py-3 px-3 font-black text-amber-800">
                        <span className="text-sm mr-1">{getRankEmoji(item.rank)}</span>
                        <span>
                          {item.rank} / {item.totalClasses}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {getChangeIndicator(item)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 italic max-w-xs truncate">
                        {item.note || '—'}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg font-bold transition"
                              title="Sửa thứ hạng"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg font-bold transition"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-8 text-center text-slate-400 italic text-xs"
                  >
                    Chưa có dữ liệu thứ hạng thỏa mãn bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-rose-400 w-full max-w-md p-6 space-y-5 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">XÁC NHẬN XÓA THỨ HẠNG</h3>
                <p className="text-xs text-slate-500">Đồng bộ trực tiếp với Đám Mây Firestore Cloud</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-700 leading-relaxed bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              Bạn có chắc chắn muốn xóa kết quả thứ hạng Tuần {confirmDeleteTarget.week} – Lớp {confirmDeleteTarget.className || defaultClassName} không?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
