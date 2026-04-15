import type { changeHistoryInstance } from '@/utils/types';

export const filterHistory = (hist: changeHistoryInstance[]) => {
  if (hist.length === 0) return hist;
  // history is ordered recent to old, filter out consecutive duplicates (keep oldest)
  const filtered = hist.filter((h, i) => (hist[i + 1] && h.text !== hist[i + 1].text) || i === hist.length - 1);
  return filtered.length === 0 ? hist.slice(hist.length - 1) : filtered;
};

type UpdaterDetails = {
  id: string;
  display_name: string | null;
  email: string | null;
} | null;

export async function enrichHistoryWithUpdaterDetails(
  history: changeHistoryInstance[],
  getUpdaterDetails: (id: string) => Promise<UpdaterDetails>
) {
  const updaterIds = Array.from(new Set(history.map((entry) => entry.updated_by)));
  const updaterDetails = await Promise.all(updaterIds.map((id) => getUpdaterDetails(id ?? '')));

  return history.map((entry) => {
    const updater = updaterDetails.find((details) => details?.id === entry.updated_by);
    return {
      ...entry,
      updater_display_name: updater?.display_name,
      updater_email: updater?.email,
    } satisfies changeHistoryInstance;
  });
}
