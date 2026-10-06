const USER_KEY = 'medialink_user_id';

export function getOrCreateUserId(): string {
  try {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  } catch {
    return 'usr_anonymous_client';
  }
}