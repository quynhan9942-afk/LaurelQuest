import React, { useState } from 'react';
import { BarChart3, Award, Download, Printer, Search, ArrowUpDown } from 'lucide-react';
import { Student, Team, ClassSettings } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { getConductRank, getConductRankInfo } from '../utils/conduct';

interface FullClassScoreModalProps {
  students: Student[];
  teams: Team[];
  settings: ClassSettings;
  onClose: () => void;
  onSelectStudent: (s: Student) => void;
}

export const FullClassScoreModal: React.FC<FullClassScoreModalProps> = ({
  students,
  teams,
  settings,
  onClose,
  onSelectStudent,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'team'>('points');

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  // Sort students
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'points') return b.points - a.points;
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'vi');
    if (sortBy === 'team') return a.teamId.localeCompare(b.teamId);
    return 0;
  });

  const filteredStudents = sortedStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-4 border-amber-300 space-y-5 my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">
                📊 BẢNG ĐIỂM THI ĐUA TOÀN LỚP - {settings.className}
              </h2>
              <p className="text-xs text-slate-500">
                {settings.schoolName} • GVCN: {settings.teacherName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Filter & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm học sinh trong bảng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-300 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <span>Sắp xếp:</span>
              <button
                onClick={() => setSortBy('points')}
                className={`px-2 py-1 rounded-lg ${
                  sortBy === 'points' ? 'bg-amber-400 text-purple-950' : 'hover:bg-slate-200'
                }`}
              >
                Điểm cao
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-2 py-1 rounded-lg ${
                  sortBy === 'name' ? 'bg-amber-400 text-purple-950' : 'hover:bg-slate-200'
                }`}
              >
                Tên A-Z
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bảng Điểm</span>
            </button>
          </div>
        </div>

        {/* Score Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-amber-100/80 text-amber-950 font-black uppercase border-b border-amber-200 sticky top-0 backdrop-blur">
                <th className="p-3 text-center">Thứ Hạng</th>
                <th className="p-3">Học Sinh</th>
                <th className="p-3">Tổ / Nhóm</th>
                <th className="p-3 text-center">Cộng (+)</th>
                <th className="p-3 text-center">Trừ (-)</th>
                <th className="p-3 text-center">Phát Biểu</th>
                <th className="p-3 text-center">Tổng Điểm</th>
                <th className="p-3 text-center">Xếp Loại Thi Đua</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => {
                const rank = idx + 1;
                const team = getTeam(s.teamId);
                const conductRank = getConductRank(s.points, s.speechCount || 0);
                const rankInfo = getConductRankInfo(conductRank);

                return (
                  <tr
                    key={s.id}
                    onClick={() => {
                      onSelectStudent(s);
                      onClose();
                    }}
                    className="hover:bg-amber-50/60 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-center font-black text-slate-700">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <ChibiAvatar
                          gender={s.gender}
                          styleIndex={s.avatarStyle}
                          avatarUrl={s.avatarUrl || s.photoUrl}
                          size="sm"
                        />
                        <span className="font-extrabold text-slate-900">{s.name}</span>
                      </div>
                    </td>

                    <td className="p-3 font-semibold text-slate-600">{team ? team.name : 'Tổ'}</td>

                    <td className="p-3 text-center font-black text-emerald-600">
                      +{s.totalPositive}
                    </td>

                    <td className="p-3 text-center font-black text-rose-500">
                      -{s.totalNegative}
                    </td>

                    <td className="p-3 text-center font-black text-indigo-900">
                      ✋ {s.speechCount || 0} lần
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-sm">
                        {s.points}đ
                      </span>
                    </td>

                    <td className="p-3 text-center font-bold">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${rankInfo.color}`}>
                        <span>{rankInfo.icon}</span>
                        <span>{rankInfo.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 shrink-0">
          <span>Tổng số học sinh: <strong>{students.length}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 rounded-xl"
          >
            Đóng Bảng Điểm
          </button>
        </div>
      </div>
    </div>
  );
};
