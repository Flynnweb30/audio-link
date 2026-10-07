import { HistoryAction, MediaItem } from '../types';

export function sortHistory(items: MediaItem[]): MediaItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function upsertHistoryItem(items: MediaItem[], item: MediaItem): MediaItem[] {
  return sortHistory([item, ...items.filter((existing) => existing.id !== item.id)]);
}

export function markHistoryAction(
  item: MediaItem,
  action: HistoryAction,
  extra: Partial<MediaItem> = {}
): MediaItem {
  const now = new Date().toISOString();
  return {
    ...item,
    ...extra,
    lastAction: action,
    lastActionAt: now,
    updatedAt: now,
  };
}

export function createHistoryErrorItem(params: {
  id: string;
  originalName: string;
  size: number;
  mediaType: MediaItem['mediaType'];
  mimeType: string;
  error: string;
  userId?: string;
}): MediaItem {
  const now = new Date().toISOString();
  return {
    id: params.id,
    originalName: params.originalName,
    filename: '',
    mediaType: params.mediaType,
    mimeType: params.mimeType || 'application/octet-stream',
    size: params.size,
    createdAt: now,
    updatedAt: now,
    status: 'error',
    error: params.error,
    lastAction: 'error',
    lastActionAt: now,
    userId: params.userId,
    folder: 'public',
    directUrl: '',
    playerUrl: '',
  };
}
