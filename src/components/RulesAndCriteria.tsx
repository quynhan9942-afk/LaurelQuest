import React from 'react';
import { Scroll, Award, AlertTriangle, Sparkles, CheckCircle2, XCircle, Info, Trophy, Plus, Minus } from 'lucide-react';
import { PointCriteria } from '../types';

interface RulesAndCriteriaProps {
  criteriaList: PointCriteria[];
  isAdmin: boolean;
  onOpenScoring: () => void;
}

export const RulesAndCriteria: React.FC<RulesAndCriteriaProps> = ({
  criteriaList,
  isAdmin,
  onOpenScoring,
}) => {
  const positiveCriteria = criteriaList.filter((c) => c.points > 0);
  const negativeCriteria = criteriaList.filter((c) => c.points < 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-6 text-white border-2 border-yellow-400/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow-lg">
              <Scroll className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
                <span>BIỂU ĐIỂM & NỘI QUY THI ĐUA</span>
                <Sparkles className="w-5 h-5 text-amber-300" />
              </h2>
              <p className="text-xs text-indigo-200">
                Quy định chuẩn mực cộng và trừ điểm thi đua cho Lớp 6A3
              </p>
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={onOpenScoring}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-purple-950 font-black text-xs rounded-xl shadow-lg border border-yellow-200 flex items-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <Trophy className="w-4 h-4" />
              <span>Chấm Điểm Ngay</span>
            </button>
          ) : (
            <div className="px-3.5 py-1.5 bg-white/10 backdrop-blur rounded-xl border border-yellow-400/30 text-xs font-bold text-yellow-300 flex items-center gap-1.5 shrink-0">
              <Info className="w-4 h-4 text-amber-300" />
              <span>Chế độ: Khách / Phụ huynh (Chỉ xem)</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid 2 Columns: Positive vs Negative Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Positive Rules (+ Points) */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-emerald-300/80 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-emerald-950 uppercase tracking-wide">
                🌟 MỨC THƯỞNG CỘNG ĐIỂM (+)
              </h3>
              <p className="text-xs text-emerald-700">Tôn vinh nỗ lực học tập & rèn luyện xuất sắc</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {positiveCriteria.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-emerald-50/60 hover:bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                    <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                      {item.category === 'hoc_tap'
                        ? 'Học Tập'
                        : item.category === 'ren_luyen'
                        ? 'Rèn Luyện'
                        : 'Phong Trào'}
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1 bg-emerald-500 text-white font-black text-sm rounded-xl shadow-sm border border-emerald-400 flex items-center gap-0.5">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{item.points}đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Negative Rules (- Points) */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-rose-300/80 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3">
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-rose-950 uppercase tracking-wide">
                ⚠️ MỨC TRỪ ĐIỂM VI PHẠM (-)
              </h3>
              <p className="text-xs text-rose-700">Nhắc nhở và rèn luyện tính kỷ luật nề nếp</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {negativeCriteria.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-rose-50/60 hover:bg-rose-50 rounded-2xl border border-rose-200/60 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                    <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                      Vi Phạm Nề Nếp
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1 bg-rose-500 text-white font-black text-sm rounded-xl shadow-sm border border-rose-400 flex items-center gap-0.5">
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{Math.abs(item.points)}đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Guidelines Card */}
      <div className="p-5 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-50 rounded-3xl border-2 border-amber-300/80 text-amber-950 space-y-2">
        <div className="font-black text-sm uppercase flex items-center gap-2 text-amber-900">
          <Award className="w-5 h-5 text-amber-700" />
          <span>Hệ Thống Tích Điểm Vòng Nguyệt Quế & Reset Hàng Tuần</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-900/90">
          • Mỗi học sinh bắt đầu tuần thi đua với điểm số cơ sở (hoặc điểm tích lũy liên tuần). Điểm thưởng (+) được cộng dồn từ phát biểu, điểm 10 kiểm tra và hành vi tốt.
          <br />
          • Khi nhấn nút <strong>[🔄 Đặt Lại Tuần Mới (Reset 100đ)]</strong>, toàn bộ điểm số của học sinh sẽ được đặt lại về 100 điểm khởi đầu cho tuần thi đua tiếp theo.
        </p>
      </div>

      {/* Xếp Loại Thi Đua */}
      <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4 uppercase">XẾP LOẠI THI ĐUA</h3>
        <ul className="space-y-3 text-gray-700">
          <li>
            <span className="font-bold text-red-600">Loại xuất sắc:</span> 100 điểm, xây dựng bài từ 15 lần.<br/>
            <span className="italic text-sm text-gray-600">▶ Nếu đủ điểm nhưng không đủ số lần phát biểu thì xếp loại tốt.</span>
          </li>
          <li>
            <span className="font-bold text-orange-500">Loại tốt:</span> 95 - 99 điểm, xây dựng bài 10 lần.<br/>
            <span className="italic text-sm text-gray-600">▶ Nếu đủ điểm nhưng không đủ số lần phát biểu thì xếp loại khá.</span>
          </li>
          <li>
            <span className="font-bold text-yellow-600">Loại khá:</span> 80 - 94 điểm.
          </li>
          <li>
            <span className="font-bold text-green-600">Loại Đạt:</span> 61 - 79 điểm.
          </li>
          <li>
            <span className="font-bold text-gray-500">Loại chưa đạt:</span> Từ 60 điểm trở xuống.
          </li>
        </ul>
      </div>
    </div>
  );
};
