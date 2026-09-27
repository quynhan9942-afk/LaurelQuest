/**
 * Utility functions for safe week key lookup and normalization
 * across weeklyHistory and weeklySnapshots.
 */

export function findWeekDataInHistory(history: Record<string, any> | undefined | null, weekKey: string): any {
  if (!history || typeof history !== 'object') return null;
  if (history[weekKey]) return history[weekKey];

  const cleanNum = weekKey.replace('Tuần', '').replace('week_', '').replace('Week', '').trim();
  if (!cleanNum) return null;

  const candidates = [
    `Tuần ${cleanNum}`,
    `week_${cleanNum}`,
    cleanNum,
    `Tuần ${parseInt(cleanNum, 10)}`,
    `week_${parseInt(cleanNum, 10)}`,
  ];

  for (const key of candidates) {
    if (history[key] !== undefined && history[key] !== null) {
      return history[key];
    }
  }
  return null;
}

/**
 * Standardize student ID comparison
 */
export function isSameStudentId(id1: string | number | undefined | null, id2: string | number | undefined | null): boolean {
  if (id1 == null || id2 == null) return false;
  return String(id1).trim() === String(id2).trim();
}
