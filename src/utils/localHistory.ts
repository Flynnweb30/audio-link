import { MediaItem } from '../types';

const GUEST_HISTORY_CACHE_KEY = 'medialink_guest_permanent_history';

export function getLocalGuestHistory(): MediaItem[] {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGuestItem(item: MediaItem): void {
  try {
    const list = getLocalGuestHistory();
    const existingIndex = list.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(GUEST_HISTORY_CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to cache guest conversion:', err);
  }
}

export function removeLocalGuestItem(id: string): void {
  try {
    const list = getLocalGuestHistory().filter((i) => i.id !== id);
    localStorage.setItem(GUEST_HISTORY_CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to remove cached guest conversion:', err);
  }
}