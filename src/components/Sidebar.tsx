import React from 'react';
import {
  Home,
  Users,
  Grid,
  Trophy,
  MapPin,
  Settings,
  Scroll,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  CalendarCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { TabType, UserAuth } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  studentCount: number;
  totalPoints: number;
  userAuth: UserAuth;
  onOpenTeacherLogin: () => void;
  onOpenQrModal: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  schoolName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  studentCount,
  totalPoints,
  userAuth,
  onOpenTeacherLogin,
  onOpenQrModal,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed = false,
  setIsCollapsed,
  schoolName,
}) => {
  const isAdmin = userAuth.role === 'admin';

  const menuItems: {
    id: TabType | 'qrcode_action';
    label: string;
    emoji: string;
    icon: React.ReactNode;
    badge?: string | number;
    lockedForGuest?: boolean;
  }[] = [
    { id: 'home', label: 'Trang Chủ', emoji: '🏠', icon: <Home className="w-5 h-5 shrink-0" /> },
    { id: 'students', label: 'Danh Sách', emoji: '👥', icon: <Users className="w-5 h-5 shrink-0" />, badge: studentCount, lockedForGuest: true },
    { id: 'profile', label: 'Hồ Sơ Học Sinh', emoji: '🧑🎓', icon: <UserCheck className="w-5 h-5 shrink-0 text-blue-500" />, lockedForGuest: true },
    { id: 'scoring', label: 'Thi Đua & Chấm Điểm', emoji: '🏆', icon: <Trophy className="w-5 h-5 shrink-0 text-amber-500" />, lockedForGuest: true },
    { id: 'summary', label: 'Tổng Kết & Lưu Trữ', emoji: '📊', icon: <BarChart3 className="w-5 h-5 shrink-0 text-indigo-500" /> },
    { id: 'attendance', label: 'Điểm Danh Ngày', emoji: '📅', icon: <CalendarCheck className="w-5 h-5 shrink-0 text-emerald-500" /> },
    { id: 'rules', label: 'Biểu Điểm & Nội Quy', emoji: '📜', icon: <Scroll className="w-5 h-5 shrink-0 text-purple-500" /> },
    { id: 'qrcode_action', label: 'Mã QR Tra Cứu', emoji: '🔳', icon: <QrCode className="w-5 h-5 shrink-0 text-amber-500" />, lockedForGuest: true },
    { id: 'teams', label: 'Nhóm / Tổ', emoji: '▦', icon: <Grid className="w-5 h-5 shrink-0 text-teal-500" />, lockedForGuest: true },
    { id: 'seating', label: 'Sơ Đồ Lớp', emoji: '🗺️', icon: <MapPin className="w-5 h-5 shrink-0 text-rose-500" /> },
    { id: 'settings', label: 'Thiết Lập Lớp', emoji: '⚙️', icon: <Settings className="w-5 h-5 shrink-0 text-slate-500" />, lockedForGuest: true },
  ];

  const visibleMenuItems = isAdmin
    ? menuItems
    : menuItems.filter((item) => !item.lockedForGuest);

  const handleMenuClick = (item: typeof menuItems[0]) => {
    // Auto close mobile drawer on click
    setIsMobileOpen(false);

    if (item.id === 'qrcode_action') {
      onOpenQrModal();
      return;
    }
    if (item.lockedForGuest && !isAdmin) {
      onOpenTeacherLogin();
      return;
    }
    setActiveTab(item.id as TabType);
  };

  const renderNavButtons = (collapsedMode: boolean) => (
    <nav className="space-y-1.5">
      {visibleMenuItems.map((item) => {
        const isActive = item.id !== 'qrcode_action' && activeTab === item.id;
        const isLocked = item.lockedForGuest && !isAdmin;

        return (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            id={`sidebar-item-${item.id}`}
            title={`${item.emoji} ${item.label}${isLocked ? ' (Cần đăng nhập Admin)' : ''}`}
            className={`w-full flex items-center ${
              collapsedMode ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
            } rounded-2xl font-extrabold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group relative ${
              isActive
                ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 text-purple-950 shadow-md shadow-amber-500/30 ring-2 ring-yellow-300'
                : 'bg-white/80 hover:bg-amber-100/90 text-slate-800 hover:text-amber-950 border border-amber-200/60'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base leading-none shrink-0">{item.emoji}</span>
              {!collapsedMode && (
                <span className="truncate text-xs sm:text-sm font-black tracking-tight">
                  {item.label}
                </span>
              )}
            </div>

            {!collapsedMode && (
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isLocked && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-600">
                    🔒
                  </span>
                )}

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-black rounded-full ${
                      isActive
                        ? 'bg-purple-950 text-yellow-300'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            )}

            {/* Badge overlay in collapsed view */}
            {collapsedMode && item.badge !== undefined && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shadow">
                {item.badge}
              </span>
            )}
            {collapsedMode && isLocked && (
              <span className="absolute -top-1 -left-1 text-[10px]">
                🔒
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 📱 MOBILE OVERLAY BACKDROP */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden animate-fadeIn"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 📱 MOBILE DRAWER SIDEBAR (Trượt từ bên trái) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 text-white backdrop-blur-xl p-4 shadow-2xl border-r border-amber-500/30 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-950 rounded-xl font-bold">
                📖
              </span>
              <div>
                <h2 className="text-sm font-black text-yellow-300 tracking-wide uppercase">MENU ĐIỀU HƯỚNG</h2>
                <p className="text-[10px] text-slate-300">Sổ Chủ Nhiệm Lớp 6A3</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Đóng Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Access status */}
          <div className="mb-3 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase">QUYỀN TRUY CẬP</div>
            <div className="text-xs font-black">
              {isAdmin ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Giáo Viên Admin
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Khách (Chỉ Xem)
                </span>
              )}
            </div>
          </div>

          {renderNavButtons(false)}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-3 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-400">© Sổ Chủ Nhiệm Trực Tuyến • Lớp 6A3</p>
        </div>
      </aside>

      {/* 🖥️ DESKTOP SIDEBAR (CỐ ĐỊNH BÊN TRÁI PC - 260px) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-amber-600/10 backdrop-blur-md p-3.5 rounded-3xl border border-amber-300/40 shadow-xl sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-68'
        }`}
      >
        {/* Desktop Header with Collapse Button */}
        <div className="mb-3 pb-2 border-b border-amber-300/30 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
                DANH MỤC THI ĐUA
              </h2>
              <p className="text-[10px] text-amber-700 font-medium">Lớp 6A3 • {schoolName || 'THCS Lê Quý Đôn'}</p>
            </div>
          )}

          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 bg-white/80 hover:bg-amber-200 text-amber-900 rounded-xl border border-amber-300 shadow-sm transition active:scale-95 ml-auto cursor-pointer"
              title={isCollapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Auth status badge on PC */}
        {!isCollapsed && (
          <div className="mb-3 p-2.5 bg-white/80 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">QUYỀN:</span>
            <span className="text-xs font-black">
              {isAdmin ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Admin
                </span>
              ) : (
                <span className="text-amber-800 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Khách
                </span>
              )}
            </span>
          </div>
        )}

        {/* Navigation buttons list */}
        <div className="flex-1">
          {renderNavButtons(isCollapsed)}
        </div>

        {/* Desktop Quick Overview Footer Box */}
        {!isCollapsed && (
          <div className="mt-4 p-3 bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 rounded-2xl border border-amber-300/40 text-amber-950">
            <div className="text-[10px] font-bold uppercase text-amber-800 mb-0.5">Lớp 6A3</div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Tích lũy:</span>
              <span className="text-sm font-black text-amber-600">{totalPoints} điểm</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
