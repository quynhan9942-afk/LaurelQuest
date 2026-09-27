import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Sparkles, ShieldCheck, Edit3 } from 'lucide-react';
import { SchoolRanking, UserAuth } from '../types';

interface SchoolRankingCardProps {
  rankings?: SchoolRanking[];
  classNameProp?: string;
  userAuth: UserAuth;
  onOpenManager?: () => void;
}

export const SchoolRankingCard: React.FC<SchoolRankingCardProps> = ({
  rankings = [],
  classNameProp = '6A3',
  userAuth,
  onOpenManager,
}) => {
  const isAdmin = userAuth.role === 'admin';

  // Get latest week ranking and previous week ranking
  const sortedRankings = [...rankings].sort((a, b) => b.week - a.week);
  const latest = sortedRankings[0];

  // Find previous week record (matching week - 1 or second latest)
  const previous = latest
    ? sortedRankings.find((r) => r.week === latest.week - 1) || sortedRankings[1]
    : undefined;

  // Determine rank emoji
  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏆';
  };

  // Calculate rank trend
  // Note: Rank 2 is better than Rank 3 (3 - 2 = +1 increase)
  let trendType: 'up' | 'down' | 'same' | null = null;
  let trendDiff = 0;

  if (latest && previous) {
    const diff = previous.rank - latest.rank;
    trendDiff = Math.abs(diff);
    if (diff > 0) {
      trendType = 'up';
    } else if (diff < 0) {
      trendType = 'down';
    } else {
      trendType = 'same';
    }
  }

  // Display class name formatted
  const displayClassName = classNameProp.toUpperCase().startsWith('LỚP')
    ? classNameProp.toUpperCase()
    : `LỚP ${classNameProp.toUpperCase()}`;

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-purple-900/90 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border-2 border-amber-400/50 relative overflow-hidden flex flex-col justify-between group">
      {/* Background Glow Overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-amber-400/20 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow-lg shadow-amber-500/30">
            <Trophy className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>🏆 THỨ HẠNG TOÀN TRƯỜNG</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
            </div>
            <p className="text-xs text-amber-200/90 font-medium">
              Xếp hạng thi đua tuần toàn trường THCS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-black rounded-full uppercase tracking-wider">
            {displayClassName}
          </span>

          {isAdmin && onOpenManager && (
            <button
              onClick={onOpenManager}
              className="p-2 bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
              title="Quản lý thứ hạng"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quản Lý</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      {latest ? (
        <div className="space-y-4 relative z-10 my-2">
          {/* Main Rank Highlight Banner */}
          <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-purple-900/40 border-2 border-yellow-400/60 rounded-2xl p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                KẾT QUẢ THI ĐUA NỔI BẬT
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2.5">
                <span className="text-3xl sm:text-4xl drop-shadow">
                  {getRankEmoji(latest.rank)}
                </span>
                <span className="text-yellow-300 uppercase tracking-tight">
                  XẾP THỨ {latest.rank} / {latest.totalClasses} LỚP
                </span>
              </div>
              <div className="text-xs font-bold text-amber-200/90 flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                <span>TUẦN {latest.week}</span>
                <span>·</span>
                <span>NĂM HỌC {latest.schoolYear}</span>
              </div>
            </div>

            {/* Sub Badge / Note */}
            {latest.note && (
              <div className="bg-slate-950/60 border border-yellow-400/30 rounded-xl px-3 py-2 text-center sm:text-right shrink-0 max-w-xs">
                <span className="text-[10px] text-amber-300/80 block uppercase font-bold">Ghi chú</span>
                <span className="text-xs font-semibold text-slate-200 italic line-clamp-2">
                  "{latest.note}"
                </span>
              </div>
            )}
          </div>

          {/* Rank Trend Badge (Only if previous week data exists) */}
          {trendType && (
            <div className="flex items-center justify-center sm:justify-start">
              {trendType === 'up' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-black rounded-xl shadow-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>↑ Tăng {trendDiff} bậc so với tuần trước</span>
                </div>
              )}

              {trendType === 'down' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-400/60 text-rose-300 text-xs font-black rounded-xl shadow-sm">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>↓ Giảm {trendDiff} bậc so với tuần trước</span>
                </div>
              )}

              {trendType === 'same' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black rounded-xl shadow-sm">
                  <Minus className="w-4 h-4 text-amber-300" />
                  <span>→ Không thay đổi thứ hạng</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-amber-200/70 italic text-sm space-y-3 relative z-10">
          <p>Chưa có dữ liệu thứ hạng toàn trường được cập nhật.</p>
          {isAdmin && onOpenManager && (
            <button
              onClick={onOpenManager}
              className="px-4 py-2 bg-yellow-400 text-purple-950 font-black text-xs rounded-xl shadow hover:bg-yellow-300 transition"
            >
              + Cập Nhật Thứ Hạng Ngay
            </button>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-amber-400/15 flex items-center justify-between text-[11px] text-amber-200/70 relative z-10">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cập nhật tuần bởi BGH / Cờ Đỏ Trường
        </span>
        <span className="font-mono text-[10px] text-yellow-300/80">
          {latest ? `Cập nhật Tuần ${latest.week}` : 'Trực Tuyến'}
        </span>
      </div>
    </div>
  );
};
