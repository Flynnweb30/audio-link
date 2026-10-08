import { UserTierLimits } from '../types';

export const QUOTA_CONFIG = {
  ANONYMOUS_MAX_UPLOADS: 30,
  REGISTERED_MAX_UPLOADS: 200,
  PROMOTIONAL_MAX_UPLOADS: 1000,
  DESKTOP_LOGIN_BONUS: 100,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB free tier cap
  REGISTERED_MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB registered cap
};

export function isDesktopClient(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  return !isMobile;
}

export function computeUserLimits(
  user: { uid: string; email?: string | null } | null,
  uploadCount: number,
  isPromo: boolean = false
): UserTierLimits {
  const desktopBonus = isDesktopClient() ? QUOTA_CONFIG.DESKTOP_LOGIN_BONUS : 0;

  if (isPromo) {
    const max = QUOTA_CONFIG.PROMOTIONAL_MAX_UPLOADS + desktopBonus;
    return {
      tierName: 'promotional',
      maxUploads: max,
      usedUploads: uploadCount,
      remainingUploads: Math.max(0, max - uploadCount),
      maxFileSizeBytes: QUOTA_CONFIG.REGISTERED_MAX_FILE_SIZE_BYTES,
      desktopBonus,
    };
  }

  if (user) {
    const max = QUOTA_CONFIG.REGISTERED_MAX_UPLOADS + desktopBonus;
    return {
      tierName: 'registered',
      maxUploads: max,
      usedUploads: uploadCount,
      remainingUploads: Math.max(0, max - uploadCount),
      maxFileSizeBytes: QUOTA_CONFIG.REGISTERED_MAX_FILE_SIZE_BYTES,
      desktopBonus,
    };
  }

  return {
    tierName: 'anonymous',
    maxUploads: QUOTA_CONFIG.ANONYMOUS_MAX_UPLOADS,
    usedUploads: uploadCount,
    remainingUploads: Math.max(0, QUOTA_CONFIG.ANONYMOUS_MAX_UPLOADS - uploadCount),
    maxFileSizeBytes: QUOTA_CONFIG.MAX_FILE_SIZE_BYTES,
    desktopBonus: 0,
  };
}