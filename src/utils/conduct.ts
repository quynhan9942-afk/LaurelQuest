import { ConductRank } from '../types';

/**
 * Calculates student conduct classification based on exact point and speech rules:
 * - Xuất Sắc: 100+ points AND >= 15 speech counts. (If points >= 100 but < 15 speech, falls to Tốt)
 * - Tốt: 95-99 points AND >= 10 speech counts. (If points 95-99 but < 10 speech, falls to Khá)
 * - Khá: 80-94 points.
 * - Đạt: 60-79 points.
 * - Chưa Đạt: <= 60 points.
 */
export const getRanking = (score: number, speechCount: number) => {
  if (score >= 100) {
    return speechCount >= 15 ? 'Xuất sắc' : 'Tốt';
  }
  if (score >= 95 && score <= 99) {
    return speechCount >= 10 ? 'Tốt' : 'Khá';
  }
  if (score >= 80 && score <= 94) {
    return 'Khá';
  }
  if (score > 60 && score <= 79) { // Từ 61 đến 79
    return 'Đạt';
  }
  return 'Chưa đạt'; // Từ 60 trở xuống
};

export function getConductRank(points: number, speechCount: number): ConductRank {
  if (points >= 100) {
    return speechCount >= 15 ? 'Xuất Sắc' : 'Tốt';
  }
  if (points >= 95 && points <= 99) {
    return speechCount >= 10 ? 'Tốt' : 'Khá';
  }
  if (points >= 80 && points <= 94) {
    return 'Khá';
  }
  if (points > 60 && points <= 79) {
    return 'Đạt';
  }
  return 'Chưa Đạt';
}

export function getConductRankInfo(rank: ConductRank) {
  switch (rank) {
    case 'Xuất Sắc':
      return {
        label: 'Xuất Sắc',
        level: 'Mức 1',
        color: 'from-amber-400 via-yellow-400 to-amber-500 text-purple-950 border-amber-300',
        badgeBg: 'bg-amber-400 text-purple-950',
        icon: '👑',
        isWarning: false,
        warningMsg: null,
      };
    case 'Tốt':
      return {
        label: 'Tốt',
        level: 'Mức 2',
        color: 'from-emerald-400 to-teal-500 text-white border-emerald-300',
        badgeBg: 'bg-emerald-500 text-white',
        icon: '🌟',
        isWarning: false,
        warningMsg: null,
      };
    case 'Khá':
      return {
        label: 'Khá',
        level: 'Mức 3',
        color: 'from-blue-400 to-cyan-500 text-white border-blue-300',
        badgeBg: 'bg-blue-500 text-white',
        icon: '👍',
        isWarning: false,
        warningMsg: null,
      };
    case 'Đạt':
      return {
        label: 'Đạt',
        level: 'Mức 4',
        color: 'from-orange-400 to-amber-500 text-white border-orange-300',
        badgeBg: 'bg-orange-500 text-white',
        icon: '⚡',
        isWarning: true,
        warningMsg: '⚡ HS xếp loại này phải đi lao động, hoặc lau dọn phòng học theo phân công.',
      };
    case 'Chưa Đạt':
      return {
        label: 'Chưa Đạt',
        level: 'Mức 5',
        color: 'from-rose-500 to-red-600 text-white border-rose-400',
        badgeBg: 'bg-rose-600 text-white',
        icon: '⚠️',
        isWarning: true,
        warningMsg: '⚡ HS xếp loại này phải đi lao động, hoặc lau dọn phòng học theo phân công.',
      };
  }
}
