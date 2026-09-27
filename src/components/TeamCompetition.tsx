import React, { useState } from 'react';
import { Trophy, Award, Users, Edit2, Sparkles, Crown, Shield } from 'lucide-react';
import { Team, Student } from '../types';
import { ChibiAvatar } from './ChibiAvatar';

interface TeamCompetitionProps {
  teams: Team[];
  students: Student[];
  onUpdateTeam: (team: Team) => void;
  onSelectStudent: (student: Student) => void;
}

export const TeamCompetition: React.FC<TeamCompetitionProps> = ({
  teams,
  students,
  onUpdateTeam,
  onSelectStudent,
}) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [icon, setIcon] = useState('🐲');

  // Calculate team stats & rank
  const teamStats = teams
    .map((team) => {
      const members = students.filter((s) => s.teamId === team.id);
      const totalPts = members.reduce((sum, s) => sum + s.points, 0);
      const avgPts = members.length > 0 ? (totalPts / members.length).toFixed(1) : '0';
      return {
        ...team,
        members,
        totalPts,
        avgPts,
      };
    })
    .sort((a, b) => b.totalPts - a.totalPts);

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setSlogan(team.slogan);
    setIcon(team.icon);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    onUpdateTeam({
      ...editingTeam,
      name: teamName.trim() || editingTeam.name,
      slogan: slogan.trim() || editingTeam.slogan,
      icon: icon.trim() || editingTeam.icon,
    });

    setEditingTeam(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-amber-300/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
            <span>🧩 THI ĐUA NỀ NẾP CÁC TỔ</span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-xs text-slate-600">
            Xếp hạng thi đua tổng điểm và điểm trung bình giữa 4 Tổ trong lớp
          </p>
        </div>
      </div>

      {/* Leaderboard Podium / Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamStats.map((team, idx) => {
          const rank = idx + 1;

          return (
            <div
              key={team.id}
              className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                {/* Team Rank Banner */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{team.icon}</span>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900">{team.name}</h3>
                      <p className="text-xs text-slate-500 italic">"{team.slogan}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(team)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                      title="Sửa thông tin Tổ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black shadow ${
                        rank === 1
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-950'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : rank === 3
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Xếp Hạng #{rank}
                    </span>
                  </div>
                </div>

                {/* Stat Box */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 mb-4 text-center">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Tổng điểm</div>
                    <div className="text-lg font-black text-amber-600">{team.totalPts} đ</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Điểm TB/bạn</div>
                    <div className="text-lg font-black text-indigo-600">{team.avgPts} đ</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Thành viên</div>
                    <div className="text-lg font-black text-slate-800">{team.members.length} hs</div>
                  </div>
                </div>

                {/* Members List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Thành viên thuộc tổ:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => onSelectStudent(member)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-amber-100/60 border border-slate-200/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ChibiAvatar
                            gender={member.gender}
                            styleIndex={member.avatarStyle}
                            avatarUrl={member.avatarUrl || member.photoUrl}
                            size="sm"
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {member.name}
                          </span>
                        </div>
                        <span className="text-xs font-black text-amber-600">{member.points}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTeam}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-amber-300 space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-slate-900">
                Sửa Thông Tin: {editingTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Tên Tổ / Nhóm</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Khẩu Hiệu Tổ</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Biểu Tượng (Emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-purple-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                Cập Nhật Thông Tin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
