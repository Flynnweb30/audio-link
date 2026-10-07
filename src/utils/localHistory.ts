import { MediaItem } from '../types';
import { sortHistory, upsertHistoryItem } from './history';

const GUEST_HISTORY_KEY = 'audiolink_guest_history';

export function getLocalGuestHistory(): MediaItem[] {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return sortHistory(parsed as MediaItem[]);
    }
  } catch (err) {
    console.error('Failed to read local guest history:', err);
  }
  return [];
}

export function saveLocalGuestItem(item: MediaItem): void {
  saveLocalGuestItems([item]);
}

export function saveLocalGuestItems(newItems: MediaItem[]): void {
  if (!newItems?.length) return;
  try {
    let updated = getLocalGuestHistory();
    for (const item of newItems) updated = upsertHistoryItem(updated, item);
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save items to local guest history:', err);
  }
}

export function removeLocalGuestItem(id: string): void {
  try {
    const updated = getLocalGuestHistory().filter((i) => i.id !== id);
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete item from local guest history:', err);
  }
}

export function clearLocalGuestHistory(): void {
  try {
    localStorage.removeItem(GUEST_HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear local guest history:', err);
  }
}
