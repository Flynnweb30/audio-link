import { MediaItem } from '../types';

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

export interface EmbedCodes {
  direct: string;
  markdown: string;
  html: string;
  bbcode: string;
}

export function generateEmbedCodes(item: MediaItem): EmbedCodes {
  const url = item.downloadURL || item.directUrl;
  const name = item.filename || item.originalName || 'media';

  if (item.mediaType === 'image') {
    return {
      direct: url,
      markdown: `![${name}](${url})`,
      html: `<img src="${url}" alt="${name}" loading="lazy" />`,
      bbcode: `[img]${url}[/img]`,
    };
  } else if (item.mediaType === 'video') {
    return {
      direct: url,
      markdown: `[Watch ${name}](${url})`,
      html: `<video controls src="${url}"><a href="${url}">Watch video</a></video>`,
      bbcode: `[url=${url}]${name}[/url]`,
    };
  } else {
    return {
      direct: url,
      markdown: `[Listen to ${name}](${url})`,
      html: `<audio controls src="${url}"><a href="${url}">Play audio</a></audio>`,
      bbcode: `[url=${url}]${name}[/url]`,
    };
  }
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