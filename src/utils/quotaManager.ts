import { User } from 'firebase/auth';
import { UserQuota } from '../types';

export const MAX_FREE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const QUOTA_LIMITS = {
  ANONYMOUS: 30,
  REGISTERED: 200,
  PROMOTIONAL: 1000,
  DESKTOP_BONUS: 100,
};

export function isDesktopDevice(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024 && !('ontouchstart' in window);
}

export function calculateUserQuota(user: User | null, currentUploadCount: number): UserQuota {
  let allowed = QUOTA_LIMITS.ANONYMOUS;
  let tierName = 'Anonymous Guest (30 Files)';

  if (user && !user.isAnonymous) {
    allowed = QUOTA_LIMITS.REGISTERED;
    tierName = 'Registered Free (200 Files)';

    if (isDesktopDevice()) {
      allowed += QUOTA_LIMITS.DESKTOP_BONUS;
      tierName = 'Registered Desktop (+100 Bonus: 300 Files)';
    }

    const promoActive = localStorage.getItem('audiolink_promo_active');
    if (promoActive === 'true') {
      allowed = QUOTA_LIMITS.PROMOTIONAL;
      tierName = 'Promotional VIP (1,000 Files)';
    }
  }

  const remaining = Math.max(0, allowed - currentUploadCount);

  return {
    allowedUploads: allowed,
    usedUploads: currentUploadCount,
    remainingUploads: remaining,
    maxFileSizeBytes: MAX_FREE_FILE_SIZE_BYTES,
    isAnonymous: !user || user.isAnonymous,
    tierName,
  };
}