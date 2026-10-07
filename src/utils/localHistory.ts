import { MediaItem } from '../types';

const GUEST_HISTORY_KEY = 'audiolink_guest_history';

export function getLocalGuestHistory(): MediaItem[] {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
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
  if (!newItems || newItems.length === 0) return;
  try {
    const existing = getLocalGuestHistory();
    const newIds = new Set(newItems.map((i) => i.id));
    const filteredExisting = existing.filter((i) => !newIds.has(i.id));
    const updated = [...newItems, ...filteredExisting];
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save items to local guest history:', err);
  }
}

export function removeLocalGuestItem(id: string): void {
  try {
    const existing = getLocalGuestHistory();
    const updated = existing.filter((i) => i.id !== id);
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
