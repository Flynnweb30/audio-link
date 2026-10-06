const GUEST_ID_KEY = 'medialink_guest_id';

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_anonymous_client';
  }
}