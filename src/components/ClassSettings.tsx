import React, { useState } from 'react';
import { Settings, Save, Download, Upload, RotateCcw, ShieldAlert, CheckCircle2, Sparkles, KeyRound } from 'lucide-react';
import { ClassSettings, ClassData, UserAuth, SchoolRanking } from '../types';
import { SchoolRankingManager } from './SchoolRankingManager';

interface ClassSettingsProps {
  settings: ClassSettings;
  schoolRankings?: SchoolRanking[];
  userAuth: UserAuth;
  onUpdateSettings: (newSettings: ClassSettings) => void;
  onUpdateRankings: (newRankings: SchoolRanking[]) => void;
  onDeleteRanking?: (id: string) => void;
  onResetClassData: () => void;
  onExportData: () => void;
  onImportData: (data: ClassData) => void;
  onOpenTeacherLogin: () => void;
}

export const ClassSettingsView: React.FC<ClassSettingsProps> = ({
  settings,
  schoolRankings = [],
  userAuth,
  onUpdateSettings,
  onUpdateRankings,
  onDeleteRanking,
  onResetClassData,
  onExportData,
  onImportData,
  onOpenTeacherLogin,
}) => {
  const isAdmin = userAuth.role === 'admin';
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [className, setClassName] = useState(settings.className);
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [targetPoints, setTargetPoints] = useState(settings.laurelTargetPoints || 100);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onOpenTeacherLogin();
      return;
    }

    onUpdateSettings({
      ...settings,
      schoolName: schoolName.trim(),
      className: className.trim(),
      teacherName: teacherName.trim(),
      academicYear: academicYear.trim(),
      laurelTargetPoints: targetPoints,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      onOpenTeacherLogin();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.students && json.settings) {
          onImportData(json);
          alert('Khôi phục dữ liệu từ tệp JSON thành công!');
        } else {
          alert('Tệp JSON không đúng định dạng dữ liệu lớp học.');
        }
      } catch (err) {
        alert('Lỗi đọc tệp JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Title */}
      <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-amber-300/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600" />
            <span>⚙️ THIẾT LẬP THÔNG TIN LỚP HỌC</span>
          </h2>
          <p className="text-xs text-slate-600">
            Tùy chỉnh tiêu đề trường lớp, giáo viên chủ nhiệm, niên khóa và quản lý sao lưu dữ liệu
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã Lưu Thay Đổi!</span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Bạn đang ở <strong>Chế độ Khách / Phụ huynh (Chỉ xem)</strong>. Đăng nhập tài khoản GVCN (quynhan9942@gmail.com) để chỉnh sửa thiết lập.
            </span>
          </div>
          <button
            onClick={onOpenTeacherLogin}
            className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-yellow-300 font-black rounded-xl shrink-0 flex items-center gap-1 shadow"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đăng Nhập GV</span>
          </button>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 space-y-5 text-slate-800">
        <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide border-b border-slate-200 pb-2">
          Thông tin chung lớp học
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Tên Trường Học</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Tên Lớp Học</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Giáo Viên Chủ Nhiệm</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Niên Khóa Học</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-75"
            />
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Mục Tiêu Điểm Chạm Vòng Nguyệt Quế (Thăng Cấp)
          </label>
          <input
            type="number"
            min="20"
            max="1000"
            disabled={!isAdmin}
            value={targetPoints}
            onChange={(e) => setTargetPoints(Number(e.target.value))}
            className="w-full md:w-48 px-3 py-2.5 text-xs font-black rounded-xl bg-slate-50 border border-slate-300 disabled:opacity-75"
          />
        </div>

        {isAdmin && (
          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-purple-950 font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thiết Lập Lớp Học</span>
            </button>
          </div>
        )}
      </form>

      {/* Admin School Ranking Management Section */}
      <SchoolRankingManager
        rankings={schoolRankings}
        userAuth={userAuth}
        defaultClassName={settings.className || '6A3'}
        defaultAcademicYear={settings.academicYear || '2026–2027'}
        onUpdateRankings={onUpdateRankings}
        onDeleteRanking={onDeleteRanking}
        onOpenTeacherLogin={onOpenTeacherLogin}
      />

      {/* Backup & Restore Data */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 space-y-4 text-slate-800">
        <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide border-b border-slate-200 pb-2">
          Sao lưu & Phục hồi dữ liệu (LocalStorage)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Xuất Tệp Backup JSON</span>
            </div>
            <p className="text-xs text-slate-500">
              Tải toàn bộ dữ liệu lớp học hiện tại về máy tính để lưu trữ an toàn.
            </p>
            <button
              onClick={onExportData}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all"
            >
              Tải Tệp Backup JSON
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Nhập Tệp Backup JSON</span>
            </div>
            <p className="text-xs text-slate-500">
              Khôi phục dữ liệu từ tệp tin đã sao lưu trước đó.
            </p>
            {isAdmin ? (
              <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all">
                Tải Lên Tệp JSON
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            ) : (
              <button
                onClick={onOpenTeacherLogin}
                className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all"
              >
                Cần Đăng Nhập GV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Default Data */}
      {isAdmin && (
        <div className="bg-rose-50/80 rounded-3xl p-6 shadow-lg border-2 border-rose-300 space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase">Đặt lại dữ liệu mẫu Lớp 6A3</h3>
          </div>
          <p className="text-xs text-rose-700">
            Xóa toàn bộ điểm số, lịch sử hiện tại và khôi phục về trạng thái dữ liệu mẫu ban đầu.
          </p>

          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu hiện tại và khôi phục về danh sách mẫu ban đầu?')) {
                onResetClassData();
              }
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi Phục Dữ Liệu Mẫu Ban Đầu</span>
          </button>
        </div>
      )}
    </div>
  );
};
