const QUOTA_STORAGE_KEY = 'medialink_guest_monthly_quota';
export const GUEST_MONTHLY_LIMIT = 30;

export interface GuestQuota {
  monthKey: string;
  used: number;
  total: number;
  remaining: number;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export function getGuestQuota(): GuestQuota {
  const currentMonthKey = getCurrentMonthKey();

  try {
    const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.monthKey === currentMonthKey) {
        const used = Math.min(GUEST_MONTHLY_LIMIT, Math.max(0, Number(parsed.used) || 0));
        return {
          monthKey: currentMonthKey,
          used,
          total: GUEST_MONTHLY_LIMIT,
          remaining: Math.max(0, GUEST_MONTHLY_LIMIT - used),
        };
      }
    }
  } catch (err) {
    console.error('Failed reading quota:', err);
  }

  const initialQuota: GuestQuota = {
    monthKey: currentMonthKey,
    used: 0,
    total: GUEST_MONTHLY_LIMIT,
    remaining: GUEST_MONTHLY_LIMIT,
  };
  saveGuestQuota(initialQuota);
  return initialQuota;
}

function saveGuestQuota(quota: GuestQuota): void {
  try {
    localStorage.setItem(
      QUOTA_STORAGE_KEY,
      JSON.stringify({ monthKey: quota.monthKey, used: quota.used })
    );
    window.dispatchEvent(new CustomEvent('quota-updated', { detail: quota }));
  } catch (err) {
    console.error('Failed saving quota:', err);
  }
}

export function consumeGuestCredit(): GuestQuota {
  const current = getGuestQuota();
  if (current.used < current.total) {
    current.used += 1;
    current.remaining = Math.max(0, current.total - current.used);
    saveGuestQuota(current);
  }
  return current;
}

export function hasCreditsAvailable(isSignedIn: boolean, isPro: boolean): boolean {
  if (isSignedIn || isPro) return true;
  const quota = getGuestQuota();
  return quota.remaining > 0;
}