import React from 'react';
import { Award, History, Trophy, Crown, CheckCircle2, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { Student, Team, PointLog, Badge } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { getConductRank, getConductRankInfo } from '../utils/conduct';

interface StudentDetailModalProps {
  student: Student;
  teams: Team[];
  pointLogs: PointLog[];
  badges: Badge[];
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  teams,
  pointLogs,
  badges,
  onClose,
}) => {
  const team = teams.find((t) => t.id === student.teamId);
  const studentLogs = pointLogs.filter((log) => log.studentId === student.id);
  const studentBadges = badges.filter((b) => student.badges.includes(b.id));

  const conductRank = getConductRank(student.points, student.speechCount || 0);
  const rankInfo = getConductRankInfo(conductRank);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-amber-300 space-y-5 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <ChibiAvatar
              gender={student.gender}
              styleIndex={student.avatarStyle}
              avatarUrl={student.avatarUrl || student.photoUrl}
              size="lg"
            />
            <div>
              <h3 className="font-black text-xl text-slate-900">{student.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {team ? team.name : 'Tổ'}
                </span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${rankInfo.color}`}>
                  {rankInfo.icon} {rankInfo.label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Warning Badge if Đạt or Chưa Đạt */}
        {rankInfo.isWarning && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs font-black flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{rankInfo.warningMsg}</span>
          </div>
        )}

        {/* Score Card Banner */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-gradient-to-r from-amber-400/20 via-yellow-400/10 to-amber-500/20 rounded-2xl border border-amber-300 text-center shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Điểm Số</div>
            <div className="text-xl font-black text-amber-600">{student.points}đ</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Phát Biểu</div>
            <div className="text-xl font-black text-indigo-700">✋ {student.speechCount || 0}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Thưởng (+)</div>
            <div className="text-lg font-black text-emerald-600">+{student.totalPositive}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Trừ (-)</div>
            <div className="text-lg font-black text-rose-500">-{student.totalNegative}</div>
          </div>
        </div>

        {/* Badges Earned */}
        <div className="space-y-2 shrink-0">
          <div className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Huy hiệu đã sở hữu ({studentBadges.length})</span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
            {studentBadges.length > 0 ? (
              studentBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-1.5 shadow-sm"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.title}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Chưa mở khóa huy hiệu nào</span>
            )}
          </div>
        </div>

        {/* History Log */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          <div className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <History className="w-4 h-4 text-amber-600" />
            <span>Lịch sử cộng/trừ điểm</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 max-h-48 overflow-y-auto">
            {studentLogs.length > 0 ? (
              studentLogs.map((log) => (
                <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-black text-[11px] ${
                        log.points > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.points > 0 ? `+${log.points}` : log.points}đ
                    </span>
                    <span className="text-slate-800 font-semibold">{log.criteriaName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400 italic text-xs">
                Chưa có nhật ký chấm điểm.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
