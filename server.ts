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
const PRODUCTION_ORIGIN = 'https://audiolink-oskn.onrender.com';

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
  userId?: string;
  folder?: string;
  directUrl?: string;
  directAudioUrl?: string;
  playerUrl?: string;
  customSlug?: string;
  expiresAt?: string | null;
  isGuest?: boolean;
  guestIp?: string;
  password?: string;
  hasPassword?: boolean;
  views?: number;
  plays?: number;
  downloads?: number;
}

let mediaRegistry: Record<string, MediaItem> = {};

function pruneExpiredAndOrphanedFiles(): boolean {
  let modified = false;
  const now = Date.now();

  for (const [id, item] of Object.entries(mediaRegistry)) {
    const itemPath = path.join(UPLOADS_DIR, item.filename);

    if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) {
      if (fs.existsSync(itemPath)) {
        try { fs.unlinkSync(itemPath); } catch {}
      }
      delete mediaRegistry[id];
      modified = true;
      continue;
    }

    if (!fs.existsSync(itemPath)) {
      delete mediaRegistry[id];
      modified = true;
      continue;
    }

    try {
      const stat = fs.statSync(itemPath);
      if (stat.size < 16) {
        fs.unlinkSync(itemPath);
        delete mediaRegistry[id];
        modified = true;
      }
    } catch {
      delete mediaRegistry[id];
      modified = true;
    }
  }

  return modified;
}

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      mediaRegistry = JSON.parse(data);
      if (pruneExpiredAndOrphanedFiles()) {
        saveRegistry();
      }
    } else {
      mediaRegistry = {};
      saveRegistry();
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
setInterval(() => {
  if (pruneExpiredAndOrphanedFiles()) {
    saveRegistry();
  }
}, 10 * 60 * 1000);

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
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  };

  if (extMap[cleanExt]) return extMap[cleanExt];
  if (providedMime && providedMime !== 'application/octet-stream') return providedMime;
  return 'application/octet-stream';
}

const storage = multer.diskStorage({
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
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext || file.mimetype}. Allowed: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP, AVIF.`));
    }
  },
});

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function countRecentGuestUploads(guestKey: string): number {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return Object.values(mediaRegistry).filter((m) => {
    if (!m.isGuest) return false;
    const isMatchingClient = (m.userId && m.userId === guestKey) || (m.guestIp && m.guestIp === guestKey);
    return isMatchingClient && new Date(m.createdAt).getTime() > oneDayAgo;
  }).length;
}

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
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Authorization, x-user-id');
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

  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, x-user-id, x-client-token, x-api-key, x-media-password');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
    res.send(`User-agent: *\nAllow: /\nAllow: /audio\nAllow: /video\nAllow: /images\nDisallow: /api/\nDisallow: /*?view=*\n\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`);
  });

  // Guest quota check endpoint
  app.get('/api/guest-quota', (req, res) => {
    const rawUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const clientToken = (req.headers['x-client-token'] as string) || (req.query.clientToken as string) || getClientIp(req);
    const isLogged = Boolean(rawUserId && rawUserId !== 'guest' && !rawUserId.startsWith('guest_'));

    if (isLogged) {
      return res.json({
        isGuest: false,
        usedToday: 0,
        remaining: 999999,
        limit: 999999,
        retentionHours: null,
      });
    }

    const used = countRecentGuestUploads(clientToken);
    const remaining = Math.max(0, GUEST_DAILY_LIMIT - used);

    return res.json({
      isGuest: true,
      usedToday: used,
      remaining,
      limit: GUEST_DAILY_LIMIT,
      retentionHours: GUEST_RETENTION_HOURS,
    });
  });

  app.post('/api/upload', (req, res) => {
    upload.any()(req, res, (err: any) => {
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

      const rawUserId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'guest';
      const clientToken = (req.headers['x-client-token'] as string) || (req.body?.clientToken as string) || getClientIp(req);
      const isLoggedUser = Boolean(rawUserId && rawUserId !== 'guest' && !rawUserId.startsWith('guest_'));
      const clientIp = getClientIp(req);

      // Enforce strict 5 conversions / day for guests on the server
      if (!isLoggedUser) {
        const usedCount = countRecentGuestUploads(clientToken);
        if (usedCount + files.length > GUEST_DAILY_LIMIT) {
          files.forEach((f) => {
            const p = path.join(UPLOADS_DIR, f.filename);
            if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
          });
          return res.status(429).json({
            success: false,
            error: `Guest limit exceeded. Guests are allowed a maximum of ${GUEST_DAILY_LIMIT} conversions per day. Sign in with Google for unlimited permanent conversions!`,
            usedToday: usedCount,
            limit: GUEST_DAILY_LIMIT,
          });
        }
      }

      const baseUrl = getBaseUrl(req);
      const folder = (req.body?.folder as string) || 'public';
      const customSlug = (req.body?.customSlug as string) || undefined;
      const explicitExpiresAt = req.body?.expiresAt as string | undefined;
      const password = (req.body?.password as string) || undefined;

      const nowIso = new Date().toISOString();
      const guestExpiryIso = new Date(Date.now() + GUEST_RETENTION_HOURS * 60 * 60 * 1000).toISOString();

      const results: MediaItem[] = [];

      for (const file of files) {
        const ext = path.extname(file.filename);
        const fileId = path.parse(file.filename).name;
        const mediaType = detectMediaType(ext, file.mimetype);
        const mimeType = inferMimeType(ext, file.mimetype);

        // Retention policy: Logged-in = permanent (unless user sets custom expiration), Guest = exact 48 hours
        const finalExpiresAt = isLoggedUser 
          ? (explicitExpiresAt || null) 
          : (explicitExpiresAt || guestExpiryIso);

        const mediaItem: MediaItem = {
          id: fileId,
          originalName: file.originalname,
          filename: file.filename,
          mediaType,
          mimeType,
          size: file.size,
          createdAt: nowIso,
          userId: isLoggedUser ? rawUserId : clientToken,
          isGuest: !isLoggedUser,
          guestIp: clientIp,
          folder,
          customSlug,
          expiresAt: finalExpiresAt,
          password,
          hasPassword: !!password,
          views: 0,
          plays: 0,
          downloads: 0,
        };

        mediaRegistry[fileId] = mediaItem;

        const directUrl = `${baseUrl}/media/${file.filename}`;
        const playerUrl = `${baseUrl}/?view=${fileId}`;

        results.push({
          ...mediaItem,
          password: undefined,
          directUrl,
          directAudioUrl: directUrl,
          playerUrl,
        });
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
      });
    });
  });

  app.get('/api/media', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    pruneExpiredAndOrphanedFiles();

    const baseUrl = getBaseUrl(req);
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const clientToken = (req.headers['x-client-token'] as string) || (req.query.clientToken as string);
    const typeFilter = req.query.type as string;
    const isLoggedUser = Boolean(userId && userId !== 'guest' && !userId.startsWith('guest_') && userId !== 'all');

    let items = Object.values(mediaRegistry).filter((i) => {
      const p = path.join(UPLOADS_DIR, i.filename);
      return fs.existsSync(p) && fs.statSync(p).size >= 16;
    });

    if (isLoggedUser) {
      items = items.filter((i) => i.userId === userId);
    } else if (clientToken) {
      items = items.filter((i) => i.isGuest && (i.userId === clientToken || i.guestIp === clientToken));
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

  app.get(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    pruneExpiredAndOrphanedFiles();

    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found or has expired.' });
    }

    const baseUrl = getBaseUrl(req);
    const directUrl = `${baseUrl}/media/${item.filename}`;

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

  app.get('/media/:filename', (req, res) => {
    const filename = req.params.filename;
    const fileId = path.parse(filename).name;
    const item = mediaRegistry[fileId] || Object.values(mediaRegistry).find((m) => m.filename === filename);

    if (item) {
      if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
        const p = path.join(UPLOADS_DIR, item.filename);
        if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
        delete mediaRegistry[item.id];
        saveRegistry();
        return res.status(410).send('This media link has expired (48-hour guest retention exceeded).');
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

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media file not found or has expired.' });
    }

    const ext = path.extname(filename);
    const mimeType = item?.mimeType || inferMimeType(ext);
    streamMediaFile(req, res, filePath, mimeType);
  });

  app.get(['/api/media/:id/download', '/api/audio/:id/download'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found or has expired.' });
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
      return res.status(410).send('This media link has expired.');
    }

    item.downloads = (item.downloads || 0) + 1;
    saveRegistry();

    const filePath = path.join(UPLOADS_DIR, item.filename);
    streamMediaFile(req, res, filePath, item.mimeType, item.originalName);
  });

  app.delete(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    delete mediaRegistry[id];
    saveRegistry();

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
    app.get(['/', '/audio', '/video', '/images'], (_req, res) => {
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