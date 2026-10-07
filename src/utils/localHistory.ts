import { MediaItem } from '../types';

const GUEST_HISTORY_KEY = 'audiolink_guest_history';

function normalizeHistoryItem(item: MediaItem): MediaItem | null {
  if (!item || typeof item.id !== 'string' || !item.id) return null;
  return {
    ...item,
    status: item.status || 'success',
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

export function getLocalGuestHistory(): MediaItem[] {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeHistoryItem).filter(Boolean) as MediaItem[];
  } catch (err) {
    console.error('Failed to read local guest history:', err);
    return [];
  }
}

export function saveLocalGuestItem(item: MediaItem): void {
  saveLocalGuestItems([item]);
}

export function saveLocalGuestItems(newItems: MediaItem[]): void {
  if (!newItems?.length) return;
  try {
    const existing = getLocalGuestHistory();
    const normalized = newItems.map(normalizeHistoryItem).filter(Boolean) as MediaItem[];
    const newIds = new Set(normalized.map((i) => i.id));
    const filteredExisting = existing.filter((i) => !newIds.has(i.id));
    const updated = [...normalized, ...filteredExisting]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
