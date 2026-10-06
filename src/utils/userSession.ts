import { MediaItem } from '../types';

const GUEST_ID_KEY = 'medialink_guest_id';
const LOCAL_HISTORY_KEY = 'medialink_local_history';
const PRO_STATUS_KEY = 'medialink_pro_activated';

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_persistent_client';
  }
}

export function getLocalHistory(): MediaItem[] {
  try {
    const data = localStorage.getItem(LOCAL_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistoryItem(item: MediaItem): void {
  try {
    const history = getLocalHistory();
    const updated = [item, ...history.filter((i) => i.id !== item.id)];
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated.slice(0, 200)));
  } catch (err) {
    console.error('Failed saving local history item:', err);
  }
}

export function removeLocalHistoryItem(id: string): void {
  try {
    const history = getLocalHistory();
    const updated = history.filter((i) => i.id !== id);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function isProActivated(): boolean {
  try {
    return localStorage.getItem(PRO_STATUS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setProActivated(status: boolean): void {
  try {
    localStorage.setItem(PRO_STATUS_KEY, status ? 'true' : 'false');
    window.dispatchEvent(new Event('pro-status-changed'));
  } catch {}
}