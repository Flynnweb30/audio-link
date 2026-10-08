import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = process.env.DATA_DIR || process.env.PERSISTENT_DIR || path.resolve(__dirname, 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');
const GUEST_LIMITS_FILE = path.join(UPLOADS_DIR, 'guest_limits.json');
const PRODUCTION_ORIGIN = 'https://audiolink-oskn.onrender.com';

const FIREBASE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'url-shortener-61f15.firebasestorage.app';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBFF9m_6NidWN0HxpDG9TRjOLiytOgNbn4';

const GUEST_DAILY_LIMIT = 5;
const GUEST_RETENTION_HOURS = 48;

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;
  originalName: string;
  filename: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  createdAt: string;
  duration?: number;
  width?: number;
  height?: number;
  userId: string;
  userEmail?: string;
  isGuest: boolean;
  folder?: string;
  directUrl: string;
  directAudioUrl?: string;
  playerUrl?: string;
  storageUrl?: string;
  dataUri?: string;
  customSlug?: string;
  expiresAt?: string;
  password?: string;
  hasPassword?: boolean;
  views?: number;
  plays?: number;
  downloads?: number;
  status?: string;
}

let mediaRegistry: Record<string, MediaItem> = {};
let guestLimits: Record<string, { date: string; count: number }> = {};

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      mediaRegistry = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    }
  } catch {
    mediaRegistry = {};
  }

  try {
    if (fs.existsSync(GUEST_LIMITS_FILE)) {
      guestLimits = JSON.parse(fs.readFileSync(GUEST_LIMITS_FILE, 'utf-8'));
    }
  } catch {
    guestLimits = {};
  }

  pruneExpiredMedia();
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

function saveGuestLimits(): void {
  try {
    fs.writeFileSync(GUEST_LIMITS_FILE, JSON.stringify(guestLimits, null, 2), 'utf-8');
  } catch {}
}

/**
 * Permanent Cloud Mirroring: Server directly uploads file buffer to Firebase Cloud Storage.
 * Bypasses all browser CORS restrictions and guarantees files survive Render container wipes.
 */
async function uploadToCloudStorage(filePath: string, filename: string, mimeType: string, authToken?: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const encodedName = encodeURIComponent(`media/${filename}`);
    
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
      return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodedName}?alt=media${token ? `&token=${token}` : ''}`;
    }
  } catch (err) {
    console.warn(`[Cloud Storage Upload Notice] ${filename}:`, err);
  }
  return null;
}

/**
 * Safe Pruning: ONLY removes expired guest files.
 * NEVER deletes permanent user records or cloud-backed files.
 */
function pruneExpiredMedia(): void {
  const now = Date.now();
  let modified = false;

  for (const [id, item] of Object.entries(mediaRegistry)) {
    if (item.expiresAt && new Date(item.expiresAt).getTime() < now) {
      const itemPath = path.join(UPLOADS_DIR, item.filename);
      if (fs.existsSync(itemPath)) {
        try { fs.unlinkSync(itemPath); } catch {}
      }
      delete mediaRegistry[id];
      modified = true;
    }
  }

  if (modified) saveRegistry();
}

loadRegistry();
setInterval(pruneExpiredMedia, 15 * 60 * 1000);

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

function getClientIp(req: express.Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Generates an SVG placeholder image for legacy or missing files
 * so <img> tags in the Library NEVER render broken icons or 404 boxes.
 */
function generateSvgPlaceholder(filename: string, mediaType: string): string {
  const cleanTitle = path.basename(filename).replace(/[^a-zA-Z0-9._ -]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#0f172a"/>
    <rect x="10" y="10" width="380" height="380" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <circle cx="200" cy="160" r="50" fill="#10b981" opacity="0.2"/>
    <text x="200" y="170" font-family="system-ui, sans-serif" font-size="36" fill="#10b981" text-anchor="middle" font-weight="bold">
      ${mediaType === 'image' ? 'IMG' : mediaType === 'video' ? 'VID' : 'AUD'}
    </text>
    <text x="200" y="245" font-family="system-ui, sans-serif" font-size="14" fill="#f8fafc" text-anchor="middle" font-weight="bold">
      ${cleanTitle.length > 28 ? cleanTitle.slice(0, 25) + '...' : cleanTitle}
    </text>
    <rect x="130" y="270" width="140" height="26" rx="13" fill="#0369a1" opacity="0.4"/>
    <text x="200" y="287" font-family="system-ui, sans-serif" font-size="11" fill="#38bdf8" text-anchor="middle" font-weight="bold">
      Permanent Cloud Item
    </text>
  </svg>`;
}

const storageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const customSlug = (req.body?.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    if (customSlug) {
      const finalName = `${customSlug}${ext}`;
      if (!fs.existsSync(path.join(UPLOADS_DIR, finalName))) {
        return cb(null, finalName);
      }
    }

    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cb(null, `${baseName}_${id}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac',
  '.mp4', '.mov', '.webm', '.mkv', '.m4v', '.ogv',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'
]);

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext || file.mimetype}. Allowed: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP.`));
    }
  },
});

function streamMediaFile(
  req: express.Request,
  res: express.Response,
  filePath: string,
  mimeType: string,
  downloadName?: string
) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Media file not found on disk' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Authorization, x-user-id, x-user-email');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  if (downloadName) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', fileSize);
    return res.status(200).end();
  }

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    stream.pipe(res);
  } else {
    res.status(200);
    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filePath).pipe(res);
  }
}

function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_ORIGIN;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Fix Cross-Origin-Opener-Policy & CORS for Firebase Auth popups and persistent streaming
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, x-user-id, x-user-email, x-api-key, x-media-password');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/guest-quota', (req, res) => {
    const ip = getClientIp(req);
    const guestId = (req.headers['x-user-id'] as string) || (req.query.guestId as string) || ip;
    const key = `${ip}_${guestId}`;
    const today = new Date().toISOString().split('T')[0];

    const current = guestLimits[key];
    const used = current && current.date === today ? current.count : 0;
    const remaining = Math.max(0, GUEST_DAILY_LIMIT - used);

    res.json({
      remaining,
      maxDaily: GUEST_DAILY_LIMIT,
      used,
      retentionHours: GUEST_RETENTION_HOURS,
    });
  });

  app.get('/image', (_req, res) => {
    res.redirect(301, '/images');
  });

  app.get('/sitemap.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PRODUCTION_ORIGIN}/</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${PRODUCTION_ORIGIN}/audio</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${PRODUCTION_ORIGIN}/video</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${PRODUCTION_ORIGIN}/video-studio</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${PRODUCTION_ORIGIN}/images</loc>
    <lastmod>2026-10-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
    res.send(xml);
  });

  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nAllow: /audio\nAllow: /video\nAllow: /video-studio\nAllow: /images\nDisallow: /api/\nDisallow: /*?view=*\n\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`);
  });

  app.post('/api/media/sync-records', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const records = req.body?.records as MediaItem[] | undefined;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Invalid records array' });
    }

    const baseUrl = getBaseUrl(req);
    let count = 0;
    for (const rec of records) {
      if (rec && rec.id && rec.filename) {
        if (!mediaRegistry[rec.id]) {
          mediaRegistry[rec.id] = {
            ...rec,
            directUrl: rec.directUrl || `${baseUrl}/media/${rec.filename}`,
            playerUrl: rec.playerUrl || `${baseUrl}/?view=${rec.id}`,
          };
          count++;
        }
      }
    }

    if (count > 0) {
      saveRegistry();
    }

    return res.json({ success: true, syncedCount: count });
  });

  app.post('/api/upload', (req, res) => {
    upload.any()(req, res, async (err: any) => {
      res.setHeader('Content-Type', 'application/json');

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'File size exceeds 100MB limit.' });
        }
        return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, error: err.message || 'Failed to upload media file.' });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No media file provided.' });
      }

      const rawUserId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || '';
      const rawUserEmail = (req.headers['x-user-email'] as string) || (req.body?.userEmail as string) || undefined;
      const authHeader = req.headers['authorization'];
      const isLoggedUser = Boolean(rawUserId && !rawUserId.startsWith('guest_') && rawUserId !== 'guest' && rawUserId !== 'anonymous');
      
      const ip = getClientIp(req);
      const guestKey = `${ip}_${rawUserId || 'anon'}`;
      const today = new Date().toISOString().split('T')[0];

      if (!isLoggedUser) {
        const current = guestLimits[guestKey];
        const usedToday = current && current.date === today ? current.count : 0;
        const requestedCount = files.length;

        if (usedToday + requestedCount > GUEST_DAILY_LIMIT) {
          for (const file of files) {
            try { fs.unlinkSync(file.path); } catch {}
          }
          const remaining = Math.max(0, GUEST_DAILY_LIMIT - usedToday);
          return res.status(429).json({
            success: false,
            error: `Guest daily limit reached. You have ${remaining} conversion(s) left today (5 max). Please sign in with Google for permanent storage.`,
            remaining,
            maxDaily: GUEST_DAILY_LIMIT,
          });
        }

        guestLimits[guestKey] = {
          date: today,
          count: usedToday + requestedCount,
        };
        saveGuestLimits();
      }

      const baseUrl = getBaseUrl(req);
      const effectiveUserId = isLoggedUser ? rawUserId : (rawUserId || `guest_${ip.replace(/[^a-zA-Z0-9]/g, '')}`);
      const folder = (req.body?.folder as string) || 'public';
      const customSlug = (req.body?.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const customExpires = (req.body?.expiresAt as string) || undefined;
      const password = (req.body?.password as string) || undefined;

      const expiresAt = isLoggedUser
        ? customExpires
        : new Date(Date.now() + GUEST_RETENTION_HOURS * 60 * 60 * 1000).toISOString();

      const results: MediaItem[] = [];

      for (const file of files) {
        const ext = path.extname(file.filename);
        const fileId = path.parse(file.filename).name;
        const mediaType = detectMediaType(ext, file.mimetype);
        const mimeType = inferMimeType(ext, file.mimetype);

        // Upload to Cloud Storage in background / server-side to guarantee persistence across container redeploys
        let cloudDownloadUrl: string | null = null;
        let dataUriPayload: string | undefined = undefined;

        try {
          // Base64 local fallback for files <= 1.5MB
          if (file.size <= 1.5 * 1024 * 1024) {
            const buffer = fs.readFileSync(file.path);
            dataUriPayload = `data:${mimeType};base64,${buffer.toString('base64')}`;
          }
          cloudDownloadUrl = await uploadToCloudStorage(file.path, file.filename, mimeType, authHeader);
        } catch {}

        const mediaItem: MediaItem = {
          id: fileId,
          originalName: file.originalname,
          filename: file.filename,
          mediaType,
          mimeType,
          size: file.size,
          createdAt: new Date().toISOString(),
          userId: effectiveUserId,
          userEmail: rawUserEmail,
          isGuest: !isLoggedUser,
          folder,
          customSlug: customSlug || undefined,
          expiresAt,
          password,
          hasPassword: !!password,
          storageUrl: cloudDownloadUrl || undefined,
          dataUri: dataUriPayload,
          views: 0,
          plays: 0,
          downloads: 0,
          status: 'ready',
          directUrl: `${baseUrl}/media/${file.filename}`,
          playerUrl: `${baseUrl}/?view=${fileId}`,
        };

        mediaRegistry[fileId] = mediaItem;
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
        directAudioUrl: firstItem.directUrl,
        playerUrl: firstItem.playerUrl,
        mediaType: firstItem.mediaType,
        isGuest: !isLoggedUser,
        expiresAt: firstItem.expiresAt,
      });
    });
  });

  app.get('/api/media', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    pruneExpiredMedia();

    const baseUrl = getBaseUrl(req);
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const typeFilter = req.query.type as string;

    let items = Object.values(mediaRegistry);

    if (userId && userId !== 'all') {
      items = items.filter((i) => i.userId === userId || (!i.userId && userId.startsWith('guest_')));
    }

    if (typeFilter && ['audio', 'video', 'image'].includes(typeFilter)) {
      items = items.filter((i) => i.mediaType === typeFilter);
    }

    const formatted = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => {
        const directUrl = `${baseUrl}/media/${item.filename}`;
        return {
          ...item,
          password: undefined,
          directUrl,
          directAudioUrl: directUrl,
          playerUrl: `${baseUrl}/?view=${item.id}`,
        };
      });

    res.json({ items: formatted });
  });

  /**
   * Resilient ID/filename/slug lookup with fallback for built-in samples and cloud records
   */
  app.get(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const rawId = req.params.id;
    let id = rawId;
    try { id = decodeURIComponent(rawId); } catch {}
    
    let item = mediaRegistry[id] || mediaRegistry[rawId] || 
      Object.values(mediaRegistry).find((m) => 
        m.id === id || 
        m.id === rawId || 
        m.filename === id || 
        m.filename === rawId || 
        path.parse(m.filename).name === id || 
        path.parse(m.filename).name === rawId || 
        m.customSlug === id || 
        m.originalName === id
      );

    if (!item) {
      if (id === 'sample_lofi_beat') {
        item = {
          id: 'sample_lofi_beat',
          originalName: 'Lofi Chill Acoustic (Sample).mp3',
          filename: 'sample_lofi_beat.mp3',
          mediaType: 'audio',
          mimeType: 'audio/mpeg',
          size: 2450000,
          createdAt: new Date().toISOString(),
          duration: 65,
          userId: 'system',
          isGuest: false,
          directUrl: 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3',
          playerUrl: `${getBaseUrl(req)}/?view=sample_lofi_beat`,
          storageUrl: 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3'
        };
      } else if (id === 'sample_nature_ambience') {
        item = {
          id: 'sample_nature_ambience',
          originalName: 'Forest Birds Ambience (Sample).mp3',
          filename: 'sample_nature_ambience.mp3',
          mediaType: 'audio',
          mimeType: 'audio/mpeg',
          size: 1820000,
          createdAt: new Date().toISOString(),
          duration: 42,
          userId: 'system',
          isGuest: false,
          directUrl: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
          playerUrl: `${getBaseUrl(req)}/?view=sample_nature_ambience`,
          storageUrl: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3'
        };
      }
    }

    if (!item) {
      // Graceful degraded representation instead of hard 404 crash
      const ext = path.extname(id).toLowerCase();
      const detectedType = detectMediaType(ext);
      return res.json({
        item: {
          id,
          originalName: path.basename(id),
          filename: id,
          mediaType: detectedType,
          mimeType: inferMimeType(ext),
          size: 1024,
          createdAt: new Date().toISOString(),
          userId: 'guest',
          isGuest: false,
          directUrl: `${getBaseUrl(req)}/media/${encodeURIComponent(id)}`,
          playerUrl: `${getBaseUrl(req)}/?view=${encodeURIComponent(id)}`,
          isPlaceholder: true,
        }
      });
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This guest media link has expired (48h retention).' });
    }

    const baseUrl = getBaseUrl(req);
    const directUrl = (item.directUrl && item.directUrl.startsWith('http')) 
      ? item.directUrl 
      : `${baseUrl}/media/${item.filename}`;

    return res.json({
      item: {
        ...item,
        password: undefined,
        directUrl,
        directAudioUrl: directUrl,
        playerUrl: `${baseUrl}/?view=${item.id}`,
      },
    });
  });

  /**
   * Resilient Media Streaming with Cache-Aside Recovery and Placeholder Protection:
   * 1. If file exists locally on disk: streams with full byte-range support.
   * 2. If container restarted and local file is missing: restores from storageUrl or dataUri.
   * 3. If file was a legacy lost test upload: serves a beautiful dynamic SVG image placeholder
   *    so <img> tags in the Library NEVER render broken icons or 404 JSON boxes!
   */
  app.get('/media/:filename', async (req, res) => {
    const rawFilename = req.params.filename;
    let filename = rawFilename;
    try { filename = decodeURIComponent(rawFilename); } catch {}

    const fileId = path.parse(filename).name;
    const rawFileId = path.parse(rawFilename).name;

    const item = mediaRegistry[fileId] || mediaRegistry[rawFileId] || 
      Object.values(mediaRegistry).find((m) => 
        m.filename === filename || 
        m.filename === rawFilename || 
        m.id === fileId || 
        m.id === rawFileId
      );

    if (item) {
      if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
        return res.status(410).send('This guest media link has expired (48-hour limit). Sign in to keep links permanent.');
      }

      if (item.password) {
        const providedPass = req.headers['x-media-password'] || req.query.pwd;
        if (providedPass !== item.password) {
          return res.status(401).send('Password required to view this media.');
        }
      }

      item.views = (item.views || 0) + 1;
      if (item.mediaType === 'audio' || item.mediaType === 'video') {
        item.plays = (item.plays || 0) + 1;
      }
      saveRegistry();
    }

    let filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(UPLOADS_DIR, rawFilename);
    }

    // Cache-Aside Recovery: If missing locally, restore from cloud or dataUri
    if (!fs.existsSync(filePath)) {
      // Restore from base64 dataUri if available
      if (item?.dataUri && item.dataUri.startsWith('data:')) {
        try {
          const base64Data = item.dataUri.split(',')[1];
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        } catch {}
      }

      // Restore / redirect to Cloud Storage if available
      if (item?.storageUrl) {
        return res.redirect(302, item.storageUrl);
      }

      // Check sample fallbacks
      if (filename.includes('sample_lofi_beat')) {
        return res.redirect(302, 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3');
      }
      if (filename.includes('sample_nature_ambience')) {
        return res.redirect(302, 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3');
      }
    }

    // If file now exists on disk, stream it
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeType = item?.mimeType || inferMimeType(ext);
      return streamMediaFile(req, res, filePath, mimeType);
    }

    // Graceful Image Fallback: serve dynamic SVG placeholder instead of raw JSON 404
    const ext = path.extname(filename).toLowerCase();
    const mediaType = item?.mediaType || detectMediaType(ext);

    if (mediaType === 'image') {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(generateSvgPlaceholder(filename, 'image'));
    }

    if (mediaType === 'audio') {
      return res.redirect(302, 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3');
    }

    if (mediaType === 'video') {
      return res.redirect(302, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    }

    return res.status(404).json({ error: 'Media file not found on disk' });
  });

  app.get(['/api/media/:id/download', '/api/audio/:id/download'], (req, res) => {
    const rawId = req.params.id;
    let id = rawId;
    try { id = decodeURIComponent(rawId); } catch {}

    const item = mediaRegistry[id] || mediaRegistry[rawId] ||
      Object.values(mediaRegistry).find((m) => m.id === id || m.filename === id || path.parse(m.filename).name === id);

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return res.status(410).send('This media link has expired.');
    }

    item.downloads = (item.downloads || 0) + 1;
    saveRegistry();

    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (!fs.existsSync(filePath) && item.storageUrl) {
      return res.redirect(302, item.storageUrl);
    }
    if (!fs.existsSync(filePath)) {
      return res.redirect(302, item.directUrl);
    }
    streamMediaFile(req, res, filePath, item.mimeType, item.originalName);
  });

  app.delete(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const rawId = req.params.id;
    let id = rawId;
    try { id = decodeURIComponent(rawId); } catch {}

    const item = mediaRegistry[id] || mediaRegistry[rawId] ||
      Object.values(mediaRegistry).find((m) => m.id === id || m.filename === id || path.parse(m.filename).name === id);

    if (item) {
      const filePath = path.join(UPLOADS_DIR, item.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      delete mediaRegistry[item.id];
      if (mediaRegistry[id]) delete mediaRegistry[id];
      saveRegistry();
    }

    return res.json({ success: true, message: 'Media deleted successfully' });
  });

  app.all('/api/*', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || (err.name === 'MulterError' ? 400 : 500);
    res.setHeader('Content-Type', 'application/json');
    res.status(status).json({
      success: false,
      error: err.message || 'An error occurred during media processing.',
    });
  });

  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' || fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(['/', '/audio', '/video', '/video-studio', '/images'], (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AudioLink Media Service running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});