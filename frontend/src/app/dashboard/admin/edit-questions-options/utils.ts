import type { changeHistoryInstance } from '@/utils/types';

export const filterHistory = (hist: changeHistoryInstance[]) => {
  if (hist.length === 0) return hist;
  // history is ordered recent to old, filter out consecutive duplicates (keep oldest)
  const filtered = hist.filter((h, i) => (hist[i + 1] && h.text !== hist[i + 1].text) || i === hist.length - 1);
  return filtered.length === 0 ? hist.slice(hist.length - 1) : filtered;
};
