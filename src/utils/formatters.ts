export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 45) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    const d = new Date(isoString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${timeStr}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  } catch {
    return 'Recently';
  }
}

export function formatExpiryLabel(expiresAt?: string): { label: string; isPermanent: boolean; isExpired: boolean } {
  if (!expiresAt) {
    return { label: 'Permanent', isPermanent: true, isExpired: false };
  }
  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  if (msRemaining <= 0) {
    return { label: 'Expired', isPermanent: false, isExpired: true };
  }
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  if (hoursRemaining >= 24) {
    const days = Math.floor(hoursRemaining / 24);
    const hrs = hoursRemaining % 24;
    return { label: `${days}d ${hrs}h Left`, isPermanent: false, isExpired: false };
  }
  return { label: `${hoursRemaining}h Left`, isPermanent: false, isExpired: false };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    return false;
  }
}