export interface ApiErrorPayload {
  error?: string;
  message?: string;
  success?: boolean;
  [key: string]: unknown;
}

export async function parseJsonResponse<T = ApiErrorPayload>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Server returned an empty response (HTTP ${response.status}).`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(
      `Server returned invalid JSON (HTTP ${response.status}).${preview ? ` Response: ${preview}` : ''}`
    );
  }
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const data = payload as ApiErrorPayload;
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
  }
  return fallback;
}

export function isValidMediaItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.originalName === 'string' &&
    typeof item.filename === 'string' &&
    typeof item.mediaType === 'string' &&
    typeof item.mimeType === 'string' &&
    typeof item.size === 'number' &&
    typeof item.createdAt === 'string' &&
    typeof item.directUrl === 'string' &&
    typeof item.playerUrl === 'string'
  );
}

export function extractMediaItem(payload: unknown): import('../types').MediaItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { item?: unknown; items?: unknown };
  if (isValidMediaItem(data.item)) return data.item as import('../types').MediaItem;
  if (Array.isArray(data.items)) {
    const first = data.items.find(isValidMediaItem);
    return first ? (first as import('../types').MediaItem) : null;
  }
  return null;
}
