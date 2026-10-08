import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = process.env.DATA_DIR || process.env.PERSISTENT_DIR || path.resolve(__dirname, 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

const FIREBASE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'url-shortener-61f15.firebasestorage.app';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBFF9m_6NidWN0HxpDG9TRjOLiytOgNbn4';
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'https://audiolink-media-converter.onrender.com';

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;
  documentId?: string;
  storagePath?: string;
  downloadURL: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  format?: string;
  folder?: string;
  ownerId: string;
  userId?: string;
  userEmail?: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  directUrl: string;
  directAudioUrl?: string;
  playerUrl?: string;
  storageUrl?: string;
  dataUri?: string;
  customSlug?: string;
  duration?: number;
}

let mediaRegistry: Record<string, MediaItem> = {};

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      mediaRegistry = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    }
  } catch {
    mediaRegistry = {};
  }
}

function saveRegistry(): void {
  try {
    const tempFile = `${METADATA_FILE}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    fs.writeFileSync(tempFile, JSON.stringify(mediaRegistry, null, 2), 'utf-8');
    fs.renameSync(tempFile, METADATA_FILE);
  } catch {
    try {
      fs.writeFileSync(METADATA_FILE, JSON.stringify(mediaRegistry, null, 2), 'utf-8');
    } catch {}
  }
}

loadRegistry();

function detectMediaType(ext: string, mime?: string): MediaType {
  const cleanExt = ext.toLowerCase();
  const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac', '.webm'];
  const videoExts = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.ogv'];

  if (audioExts.includes(cleanExt) || (mime && mime.startsWith('audio/'))) return 'audio';
  if (videoExts.includes(cleanExt) || (mime && mime.startsWith('video/'))) return 'video';
  return 'image';
}

function inferMimeType(ext: string, providedMime?: string): string {
  const cleanExt = ext.toLowerCase();
  const extMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.flac': 'audio/flac',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  };

  if (extMap[cleanExt]) return extMap[cleanExt];
  if (providedMime && providedMime !== 'application/octet-stream') return providedMime;
  return 'application/octet-stream';
}

/**
 * Server-to-Server Firebase Storage upload: eliminates all browser CORS and preflight blocks.
 */
async function uploadToFirebaseStorageServer(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  authToken?: string
): Promise<{ downloadURL: string; storagePath: string } | null> {
  try {
    const storagePath = `media/${filename}`;
    const encodedName = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o?uploadType=media&name=${encodedName}${FIREBASE_API_KEY ? `&key=${FIREBASE_API_KEY}` : ''}`;
    
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
    };
    if (authToken && authToken.startsWith('Bearer ')) {
      headers['Authorization'] = authToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: fileBuffer,
    });

    if (response.ok) {
      const data: any = await response.json();
      const token = data.downloadTokens ? data.downloadTokens.split(',')[0] : '';
      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodedName}?alt=media${token ? `&token=${token}` : ''}`;
      return { downloadURL, storagePath };
    }
  } catch (err) {
    console.warn('[Firebase Storage Server Upload]', err);
  }
  return null;
}

const storageEngine = multer.memoryStorage();
const upload = multer({
  storage: storageEngine,
  limits: { fileSize: 100 * 1024 * 1024 },
});

function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

const app = express();

app.use(cors({
  origin: [
    FRONTEND_ORIGIN,
    'https://audiolink-media-converter.onrender.com',
    'https://audiolink-oskn.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'x-user-id', 'x-user-email']
}));

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Primary Upload & Verification Endpoint
app.post('/api/upload', upload.any(), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No media file provided.' });
    }

    const rawOwnerId = (req.headers['x-user-id'] as string) || (req.body?.ownerId as string) || (req.body?.userId as string) || 'anonymous';
    const userEmail = (req.headers['x-user-email'] as string) || (req.body?.userEmail as string) || undefined;
    const authHeader = req.headers['authorization'];
    const folder = (req.body?.folder as string) || 'public';
    const customSlug = (req.body?.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const baseUrl = getBaseUrl(req);
    const nowIso = new Date().toISOString();

    const results: MediaItem[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const uniqueId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const filename = customSlug ? `${customSlug}${ext}` : `${cleanBase}_${uniqueId}${ext}`;
      const mediaType = detectMediaType(ext, file.mimetype);
      const mimeType = inferMimeType(ext, file.mimetype);

      // Persistent Storage in Firebase Storage (Server-to-Server, 0 CORS failure)
      const uploadResult = await uploadToFirebaseStorageServer(file.buffer, filename, mimeType, authHeader);
      const downloadURL = uploadResult?.downloadURL || `${baseUrl}/media/${filename}`;
      const storagePath = uploadResult?.storagePath || `media/${filename}`;

      // Local container disk cache
      try {
        const localPath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(localPath, file.buffer);
      } catch {}

      const mediaItem: MediaItem = {
        id: uniqueId,
        documentId: uniqueId,
        storagePath,
        downloadURL,
        filename,
        originalName: file.originalname,
        mimeType,
        size: file.size,
        format: ext.replace('.', '').toUpperCase(),
        folder,
        ownerId: rawOwnerId,
        userId: rawOwnerId,
        userEmail,
        isGuest: rawOwnerId === 'anonymous' || rawOwnerId.startsWith('guest_'),
        createdAt: nowIso,
        updatedAt: nowIso,
        status: 'ready',
        directUrl: downloadURL,
        directAudioUrl: downloadURL,
        playerUrl: `${FRONTEND_ORIGIN}/?view=${uniqueId}`,
        storageUrl: downloadURL,
      };

      mediaRegistry[uniqueId] = mediaItem;
      results.push(mediaItem);
    }

    saveRegistry();
    const firstItem = results[0];

    return res.status(201).json({
      success: true,
      item: firstItem,
      items: results,
      count: results.length,
      directUrl: firstItem.directUrl,
      downloadURL: firstItem.downloadURL,
      playerUrl: firstItem.playerUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server upload failed.' });
  }
});

// Media Stream & Fallback Endpoint
app.get('/media/:filename', async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const fileId = path.parse(filename).name;

  const item = mediaRegistry[fileId] || Object.values(mediaRegistry).find((m) => m.filename === filename || m.id === fileId);
  const filePath = path.join(UPLOADS_DIR, filename);

  // If cached on local container disk, stream with HTTP 206
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const mimeType = item?.mimeType || inferMimeType(ext);
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimeType);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      return stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', fileSize);
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // If local file is missing, redirect to permanent Firebase Storage downloadURL
  if (item?.downloadURL && item.downloadURL.startsWith('http')) {
    return res.redirect(302, item.downloadURL);
  }

  return res.status(404).json({ error: 'Media not found' });
});

app.get('/api/media', (req, res) => {
  const ownerId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  let items = Object.values(mediaRegistry);
  if (ownerId && ownerId !== 'all') {
    items = items.filter((i) => i.ownerId === ownerId || i.userId === ownerId);
  }
  return res.json({ items });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AudioLink Media API running on port ${PORT}`);
});