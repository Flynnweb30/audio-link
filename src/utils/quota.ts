const QUOTA_STORAGE_KEY = 'audiolink_guest_quota';
const MONTHLY_LIMIT = 30;

export interface GuestQuota {
  remaining: number;
  total: number;
  monthKey: string;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getGuestQuota(): GuestQuota {
  const currentMonthKey = getCurrentMonthKey();
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed: GuestQuota = JSON.parse(raw);
      // Automatic monthly reset at start of new calendar month
      if (parsed.monthKey === currentMonthKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse stored guest quota:', err);
  }

  // New month or first time: initialize with 30/30
  const initialQuota: GuestQuota = {
    remaining: MONTHLY_LIMIT,
    total: MONTHLY_LIMIT,
    monthKey: currentMonthKey,
  };
  saveGuestQuota(initialQuota);
  return initialQuota;
}

export function saveGuestQuota(quota: GuestQuota): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
  } catch (err) {
    console.error('Failed to save guest quota:', err);
  }
}

export function deductGuestCredit(): { remaining: number; success: boolean } {
  return deductGuestCredits(1);
}

export function deductGuestCredits(count: number = 1): { remaining: number; success: boolean; deducted: number } {
  const quota = getGuestQuota();
  if (quota.remaining <= 0) {
    return { remaining: 0, success: false, deducted: 0 };
  }

  const toDeduct = Math.min(quota.remaining, Math.max(1, count));
  const updated: GuestQuota = {
    ...quota,
    remaining: Math.max(0, quota.remaining - toDeduct),
  };
  saveGuestQuota(updated);
  return { remaining: updated.remaining, success: true, deducted: toDeduct };
}

export function canGuestUpload(): boolean {
  const quota = getGuestQuota();
  return quota.remaining > 0;
}
