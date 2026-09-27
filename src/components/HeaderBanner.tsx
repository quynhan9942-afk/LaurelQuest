import React from 'react';
import { Trophy, Award, BarChart3, RotateCcw, Volume2, VolumeX, Sparkles, KeyRound, QrCode, LogOut, ShieldCheck, Eye, Menu } from 'lucide-react';
import { ClassSettings, UserAuth, TabType } from '../types';

interface HeaderBannerProps {
  activeTab: TabType;
  settings: ClassSettings;
  userAuth: UserAuth;
  isBgmOn: boolean;
  isCloudConnected?: boolean;
  isQuotaExceeded?: boolean;
  syncStatus?: 'syncing' | 'synced' | 'unsynced';
  onToggleBgm: () => void;
  onOpenFullScoreModal: () => void;
  onResetWeeklyPoints: () => void;
  onOpenQrModal: () => void;
  onOpenTeacherLogin: () => void;
  onTeacherLogout: () => void;
  onSaveDataNotification: () => void;
  onToggleMobileSidebar?: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  activeTab,
  settings,
  userAuth,
  isBgmOn,
  isCloudConnected = true,
  isQuotaExceeded = false,
  syncStatus = 'synced',
  onToggleBgm,
  onOpenFullScoreModal,
  onResetWeeklyPoints,
  onOpenQrModal,
  onOpenTeacherLogin,
  onTeacherLogout,
  onSaveDataNotification,
  onToggleMobileSidebar,
}) => {
  const isAdmin = userAuth.role === 'admin';

  // 1. Compact Top Bar Header for non-Home tabs (shows ONLY Menu & Teacher Login buttons)
  if (activeTab !== 'home') {
    return (
      <div className="mb-4 sm:mb-5">
        {/* Quota Exceeded Warning Alert Banner */}
        {isQuotaExceeded && (
          <div className="mb-3 p-2.5 bg-amber-500/20 backdrop-blur border border-amber-400/40 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Thông báo Quota Firestore:</strong> Đã đạt giới hạn ghi trong ngày. Ứng dụng tự động lưu vào LocalStorage.
              </span>
            </div>
            <a
              href="https://console.firebase.google.com/project/named-formula-3xhgq/firestore/databases/ai-studio-laurelquest-83903549-030f-482a-8f71-523ffd7c4c9e/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-amber-400 text-purple-950 font-black text-[10px] rounded-lg shrink-0"
            >
              Nâng cấp Quota
            </a>
          </div>
        )}

        {/* Top Control Bar: Only Mobile Menu & Login/Role Switch Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              id="btn-mobile-menu-toggle-compact"
              className="lg:hidden px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-purple-950 font-black text-xs rounded-full shadow-lg border-2 border-yellow-200 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Mở Menu Điều Hướng"
            >
              <Menu className="w-4 h-4 text-purple-950" />
              <span>Menu</span>
            </button>
          )}

          {!isAdmin ? (
            <button
              onClick={onOpenTeacherLogin}
              id="btn-single-auth-login-compact"
              className="px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-600 text-purple-950 font-black text-xs rounded-full shadow-lg border-2 border-yellow-200 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Bấm để đăng nhập tài khoản Giáo Viên (Admin)"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-950" />
              <span>🔑 Đăng Nhập Giáo Viên</span>
            </button>
          ) : (
            <button
              onClick={onTeacherLogout}
              id="btn-single-auth-logout-compact"
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-full shadow-lg border-2 border-emerald-300 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Đang ở quyền Giáo Viên (Admin). Bấm để chuyển đổi sang Chế Độ Khách"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-100" />
              <span>👨‍🏫 Cô Quỳnh An (Admin) • Chuyển sang Khách</span>
              <LogOut className="w-3.5 h-3.5 ml-0.5 text-emerald-100" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Header Banner ONLY for Home Tab (Trang Chủ)
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-indigo-900 to-blue-950 rounded-3xl shadow-2xl text-white border-2 border-yellow-400/50 p-4 sm:p-6 mb-6">
      {/* Background Animated Sparkles Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.25),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.3),transparent_50%)] pointer-events-none" />
      
      {/* Quota Exceeded Warning Alert Banner */}
      {isQuotaExceeded && (
        <div className="mb-4 p-3 bg-amber-500/20 backdrop-blur border border-amber-400/40 rounded-2xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Thông báo Quota Firestore:</strong> Đã đạt giới hạn ghi miễn phí trong ngày của Firestore (Spark Plan). Ứng dụng tự động chuyển sang lưu bộ nhớ thiết bị (LocalStorage) an toàn.
            </span>
          </div>
          <a
            href="https://console.firebase.google.com/project/named-formula-3xhgq/firestore/databases/ai-studio-laurelquest-83903549-030f-482a-8f71-523ffd7c4c9e/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-[11px] rounded-xl whitespace-nowrap shadow shrink-0"
          >
            Nâng cấp / Xem Quota
          </a>
        </div>
      )}

      {/* Top Bar Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 relative z-10 pb-3 border-b border-yellow-400/20">
        
        {/* Mobile Menu Button, Single Login/Role Switch Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              id="btn-mobile-menu-toggle"
              className="lg:hidden px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-purple-950 font-black text-xs rounded-full shadow-lg border-2 border-yellow-200 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Mở Menu Điều Hướng"
            >
              <Menu className="w-4 h-4 text-purple-950" />
              <span>Menu</span>
            </button>
          )}

          {/* SINGLE LOGIN / ROLE SWITCH BUTTON */}
          {!isAdmin ? (
            <button
              onClick={onOpenTeacherLogin}
              id="btn-single-auth-login"
              className="px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-600 text-purple-950 font-black text-xs rounded-full shadow-lg border-2 border-yellow-200 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Bấm để đăng nhập tài khoản Giáo Viên (Admin)"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-950" />
              <span>🔑 Đăng Nhập Giáo Viên</span>
            </button>
          ) : (
            <button
              onClick={onTeacherLogout}
              id="btn-single-auth-logout"
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-full shadow-lg border-2 border-emerald-300 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Đang ở quyền Giáo Viên (Admin). Bấm để chuyển đổi sang Chế Độ Khách"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-100" />
              <span>👨‍🏫 Cô Quỳnh An (Admin) • Chuyển sang Khách</span>
              <LogOut className="w-3.5 h-3.5 ml-0.5 text-emerald-100" />
            </button>
          )}
        </div>

        {/* Cloud Sync Status Indicator */}
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 text-xs font-bold bg-indigo-950/80 text-cyan-200 backdrop-blur rounded-full shadow flex items-center gap-1.5 border border-cyan-400/40"
            title={
              syncStatus === 'synced' && isCloudConnected && !isQuotaExceeded
                ? 'Đã đồng bộ thành công với Cloud'
                : syncStatus === 'syncing'
                ? 'Đang đẩy dữ liệu lên Cloud...'
                : 'Chưa đồng bộ Cloud (Chế độ lưu tạm)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' && isCloudConnected && !isQuotaExceeded
                  ? 'bg-emerald-400 animate-pulse'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-400 animate-ping'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {syncStatus === 'syncing' && '☁️ Đang đồng bộ...'}
              {syncStatus === 'synced' && isCloudConnected && !isQuotaExceeded && '✅ Đã đồng bộ'}
              {(syncStatus === 'unsynced' || !isCloudConnected || isQuotaExceeded) && '⚠️ Chưa đồng bộ'}
            </span>
          </span>
        </div>
      </div>

      {/* Main Banner Visual Content (Only for Trang Chủ) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 pt-2">
        <div className="space-y-3 text-center md:text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 text-xs font-bold border border-yellow-400/30">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
            <span>Hành Trình Chinh Phục Vòng Nguyệt Quế — Lớp {settings.className || '6A3'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm uppercase">
            HÀNH TRÌNH CHINH PHỤC VINH QUANG
          </h1>

          <p className="text-sm sm:text-base text-purple-200 font-medium leading-relaxed italic">
            "Ai sẽ là người tỏa sáng chạm tới vòng nguyệt quế?"
          </p>

          <div className="text-xs sm:text-sm text-indigo-100 pt-1 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 font-medium bg-purple-950/50 p-3 rounded-2xl border border-purple-400/30 shadow-inner">
            <span className="flex items-center gap-1">👩‍🏫 GVCN: <strong className="text-yellow-300 font-bold">{settings.teacherName || 'Lê Thị Quỳnh An'}</strong></span>
            <span className="flex items-center gap-1">🏫 Trường: <strong className="text-amber-300 font-bold">{settings.schoolName || 'THCS Nguyễn Văn Cừ'}</strong></span>
            <span className="flex items-center gap-1">📚 Lớp: <strong className="text-emerald-300 font-bold">{settings.className || '6A3'}</strong></span>
            <span className="flex items-center gap-1">📅 Niên khóa: <strong className="text-cyan-300 font-bold">{settings.academicYear || '2026–2027'}</strong></span>
            {settings.teacherEmail && (
              <span className="flex items-center gap-1">📧 Email: <strong className="text-pink-300 font-bold">{settings.teacherEmail}</strong></span>
            )}
          </div>
        </div>

        {/* Golden Trophy & Laurel Wreath 3D Visual Illustration */}
        <div className="relative shrink-0 flex items-center justify-center group">
          <div className="absolute inset-0 bg-yellow-400/30 blur-2xl rounded-full group-hover:bg-yellow-400/50 transition-all" />
          
          <div className="relative bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 p-4 rounded-3xl shadow-2xl border-2 border-yellow-200 flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 transform group-hover:scale-105 transition-all">
            <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-purple-950 drop-shadow-lg" />
            {/* Laurel Wreath Crown Glow */}
            <div className="absolute -top-3 -right-2 bg-gradient-to-r from-yellow-200 to-amber-300 text-purple-950 p-2 rounded-full shadow-lg border border-yellow-100 animate-bounce">
              <Award className="w-6 h-6 text-amber-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

