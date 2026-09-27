import React from 'react';
import { Trophy, Crown, Medal, Award, Flame, Star, Sparkles, TrendingUp, Users, Hand, ShieldAlert, KeyRound } from 'lucide-react';
import { Student, Team, ClassSettings, UserAuth, SchoolRanking } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { getConductRank, getConductRankInfo } from '../utils/conduct';
import { SchoolRankingCard } from './SchoolRankingCard';

interface DashboardProps {
  students: Student[];
  teams: Team[];
  settings: ClassSettings;
  schoolRankings?: SchoolRanking[];
  userAuth: UserAuth;
  onNavigateToScoring: () => void;
  onSelectStudent: (student: Student) => void;
  onOpenTeacherLogin: () => void;
  onOpenRankingManager?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  teams,
  settings,
  schoolRankings = [],
  userAuth,
  onNavigateToScoring,
  onSelectStudent,
  onOpenTeacherLogin,
  onOpenRankingManager,
}) => {
  const isAdmin = userAuth.role === 'admin';

  // Sort students by highest points
  const sortedStudents = [...students].sort((a, b) => b.points - a.points);
  const top1Student = sortedStudents[0];
  const top5Students = sortedStudents.slice(0, 5);

  // Helper team getter
  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  // Team rankings
  const teamStats = teams.map((team) => {
    const teamMembers = students.filter((s) => s.teamId === team.id);
    const totalPts = teamMembers.reduce((sum, s) => sum + s.points, 0);
    const avgPts = teamMembers.length > 0 ? (totalPts / teamMembers.length).toFixed(1) : '0';
    return { ...team, totalPts, avgPts, count: teamMembers.length };
  }).sort((a, b) => b.totalPts - a.totalPts);

  const top1Team = teamStats[0];

  // Calculate total class points
  const totalClassPoints = students.reduce((sum, s) => sum + s.points, 0);

  // Progress to Laurel Crown Target
  const targetPts = settings.laurelTargetPoints || 150;
  const leaderProgress = top1Student ? Math.min(100, Math.round((top1Student.points / targetPts) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Central Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Frame "ĐIỂM VÒNG NGUYỆT QUẾ" & "THỨ HẠNG TOÀN TRƯỜNG" */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border-2 border-yellow-400/50 relative overflow-hidden flex-1 flex flex-col justify-between">
          {/* Glowing Aura Background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Frame Header */}
            <div className="flex items-center justify-between border-b border-yellow-400/20 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow-lg shadow-yellow-500/30">
                  <Crown className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
                    <span>ĐIỂM VÒNG NGUYỆT QUẾ</span>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </h2>
                  <p className="text-xs text-indigo-200">
                    Bảng vinh danh vị trí dẫn đầu lớp học
                  </p>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-xs text-indigo-300 uppercase tracking-wider block">Mục tiêu chạm tới</span>
                <span className="text-lg font-black text-amber-300">{targetPts} điểm</span>
              </div>
            </div>

            {/* Current Top 1 Leader Spotlight Box */}
            {top1Student ? (
              <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-purple-500/20 border-2 border-yellow-400/60 rounded-3xl p-5 shadow-inner mb-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 text-yellow-300 group-hover:scale-110 transition-transform">
                  <Award className="w-48 h-48" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
                  <div className="relative">
                    <ChibiAvatar
                      gender={top1Student.gender}
                      styleIndex={top1Student.avatarStyle}
                      avatarUrl={top1Student.avatarUrl || top1Student.photoUrl}
                      size="xl"
                      className="ring-4 ring-yellow-400 shadow-2xl"
                    />
                    <div className="absolute -top-3 -right-2 bg-gradient-to-r from-yellow-300 to-amber-500 text-purple-950 p-1.5 rounded-full shadow-lg border border-yellow-200">
                      <Crown className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-center sm:text-left space-y-1.5 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-purple-950 font-black text-xs rounded-full shadow-sm">
                      <Crown className="w-3.5 h-3.5" />
                      <span>DẪN ĐẦU LỚP HỌC</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      {top1Student.name}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-950/80 text-amber-300 border border-yellow-400/30 font-bold">
                        {getTeam(top1Student.teamId)?.name || 'Tổ 1'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-1">
                        <Hand className="w-3 h-3 text-emerald-400" />
                        {top1Student.speechCount || 0} lần phát biểu
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-b from-yellow-400 to-amber-500 text-purple-950 p-4 rounded-2xl text-center shadow-lg min-w-[100px]">
                    <div className="text-xs font-bold uppercase tracking-wider">Điểm số</div>
                    <div className="text-3xl font-black">{top1Student.points}</div>
                  </div>
                </div>

                {/* Laurel Wreath Target Progress Bar */}
                <div className="mt-4 pt-3 border-t border-yellow-400/30">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className="text-amber-200 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> Tiến độ chạm Vòng Nguyệt Quế:
                    </span>
                    <span className="text-yellow-300">{leaderProgress}% ({top1Student.points}/{targetPts}đ)</span>
                  </div>
                  <div className="w-full bg-slate-950/60 rounded-full h-3.5 p-0.5 border border-yellow-400/30 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${leaderProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-indigo-300 italic">
                Chưa có học sinh nào trong danh sách.
              </div>
            )}
          </div>

          {/* Quick Stats & Top Team Bar */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 bg-yellow-400/20 text-yellow-300 rounded-xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-indigo-200">Tổ Dẫn Đầu</div>
                <div className="text-sm font-bold text-yellow-300 truncate">
                  {top1Team ? top1Team.name : 'N/A'}
                </div>
                <div className="text-xs text-indigo-300 font-mono">
                  {top1Team ? `${top1Team.totalPts}đ tổng` : ''}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 bg-cyan-400/20 text-cyan-300 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-indigo-200">Tổng Điểm Lớp</div>
                <div className="text-lg font-black text-cyan-300">
                  {totalClassPoints} điểm
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* CARD "THỨ HẠNG TOÀN TRƯỜNG" */}
          <SchoolRankingCard
            rankings={schoolRankings}
            classNameProp={settings.className}
            userAuth={userAuth}
            onOpenManager={onOpenRankingManager}
          />
        </div>

        {/* Right Column: "⭐ TOP 5 HỌC SINH XUẤT SẮC" */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-300/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-yellow-500 text-purple-950 rounded-xl shadow-md">
                  <Star className="w-6 h-6 fill-purple-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-950 uppercase tracking-wide">
                    ⭐ TOP 5 HỌC SINH XUẤT SẮC
                  </h3>
                  <p className="text-xs text-amber-700">Xếp hạng vinh danh trong lớp</p>
                </div>
              </div>

              {isAdmin ? (
                <button
                  onClick={onNavigateToScoring}
                  className="text-xs font-bold text-purple-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-xl border border-amber-400 transition-all active:scale-95"
                >
                  Chấm Điểm
                </button>
              ) : (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                  Top Điểm
                </span>
              )}
            </div>

            {/* List of Top 5 Students */}
            <div className="space-y-3">
              {top5Students.map((student, idx) => {
                const rank = idx + 1;
                const team = getTeam(student.teamId);
                const conductRank = getConductRank(student.points, student.speechCount || 0);
                const rankInfo = getConductRankInfo(conductRank);

                // Rank Medal icons
                const medalBadge =
                  rank === 1 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-purple-950 flex items-center justify-center font-black text-base shadow-md ring-2 ring-yellow-200 shrink-0">
                      🥇
                    </div>
                  ) : rank === 2 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 via-slate-300 to-slate-400 text-slate-800 flex items-center justify-center font-black text-base shadow-md ring-2 ring-slate-100 shrink-0">
                      🥈
                    </div>
                  ) : rank === 3 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-700 to-amber-800 text-amber-100 flex items-center justify-center font-black text-base shadow-md ring-2 ring-amber-500 shrink-0">
                      🥉
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs border border-amber-300 shrink-0">
                      #{rank}
                    </div>
                  );

                return (
                  <div
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 to-yellow-50/40 hover:from-amber-100 hover:to-yellow-100 border border-amber-200/60 shadow-sm transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {medalBadge}

                      <ChibiAvatar
                        gender={student.gender}
                        styleIndex={student.avatarStyle}
                        avatarUrl={student.avatarUrl || student.photoUrl}
                        size="md"
                      />

                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                          {student.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{team ? team.name : 'Tổ'}</span>
                          <span className="text-indigo-900 font-bold shrink-0">
                            ✋ {student.speechCount || 0} phát biểu
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${rankInfo.color}`}>
                            {rankInfo.icon} {rankInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-amber-600">
                        {student.points} đ
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        +{student.totalPositive} / -{student.totalNegative}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-amber-200 text-center">
            {isAdmin ? (
              <button
                onClick={onNavigateToScoring}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-purple-950 font-black text-sm rounded-2xl shadow-md shadow-amber-500/20 border border-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>ĐẾN MỤC THI ĐUA & BẢNG ĐIỂM</span>
              </button>
            ) : (
              <div className="text-xs text-amber-800 font-bold py-2 bg-amber-50/80 rounded-xl border border-amber-200">
                🔒 Đăng nhập Giáo Viên ở góc trên bên trái Header để chấm điểm
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Standings Summary Row */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-300/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-900 uppercase">
              BẢNG THI ĐUA GIỮA CÁC TỔ
            </h3>
          </div>
          <span className="text-xs font-semibold text-amber-700">4 Tổ thi đua sôi nổi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamStats.map((team, idx) => (
            <div
              key={team.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{team.icon}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Hạng #{idx + 1}
                </span>
              </div>
              <div className="font-bold text-sm text-slate-800">{team.name}</div>
              <div className="text-xs text-slate-500 italic mb-2 truncate">"{team.slogan}"</div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-600">Tổng điểm:</span>
                <span className="font-black text-amber-600 text-sm">{team.totalPts}đ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
