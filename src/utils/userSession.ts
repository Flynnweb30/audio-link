import { MediaItem } from '../types';

const GUEST_ID_KEY = 'medialink_guest_id';
const LOCAL_MEDIA_CACHE_KEY = 'medialink_local_history_cache';

// Permanent Guest ID that survives browser reboots, reloads and sessions
export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_permanent_user';
  }
}

// Restores guest history immediately from local storage upon app reopen
export function getLocallyCachedHistory(): MediaItem[] {
  try {
    const data = localStorage.getItem(LOCAL_MEDIA_CACHE_KEY);
    if (data) {
      const items = JSON.parse(data);
      return Array.isArray(items) ? items : [];
    }
  } catch (err) {
    console.error('Error reading local cache:', err);
  }
  return [];
}

export function saveLocallyCachedHistory(items: MediaItem[]): void {
  try {
    localStorage.setItem(LOCAL_MEDIA_CACHE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error writing local cache:', err);
  }
}

export function appendItemToLocalCache(item: MediaItem): void {
  const current = getLocallyCachedHistory();
  const exists = current.some((i) => i.id === item.id);
  if (!exists) {
    const updated = [item, ...current];
    saveLocallyCachedHistory(updated);
  }
}

export function removeItemFromLocalCache(id: string): void {
  const current = getLocallyCachedHistory();
  const filtered = current.filter((i) => i.id !== id);
  saveLocallyCachedHistory(filtered);
}