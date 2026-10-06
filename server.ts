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
  expiresAt?: string;
  password?: string;
  hasPassword?: boolean;
  views?: number;
  plays?: number;
  downloads?: number;
}

let mediaRegistry: Record<string, MediaItem> = {};

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      mediaRegistry = JSON.parse(data);
      // Prune records whose files don't exist on disk or are corrupted (< 32 bytes)
      let modified = false;
      for (const [id, item] of Object.entries(mediaRegistry)) {
        const itemPath = path.join(UPLOADS_DIR, item.filename);
        if (!fs.existsSync(itemPath)) {
          delete mediaRegistry[id];
          modified = true;
        } else {
          try {
            const stat = fs.statSync(itemPath);
            if (stat.size < 32) {
              fs.unlinkSync(itemPath);
              delete mediaRegistry[id];
              modified = true;
            }
          } catch {
            delete mediaRegistry[id];
            modified = true;
          }
        }
      }
      if (modified) saveRegistry();
    } else {
      mediaRegistry = {};
      saveRegistry();
    }
  } catch (err) {
    console.error('Error loading media registry:', err);
    mediaRegistry = {};
  }
}

function saveRegistry(): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(mediaRegistry, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving media registry:', err);
  }
}

// Load registry (clean start, zero sample files)
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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const customSlug = (req.body?.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    if (customSlug) {
      // Use custom slug if provided
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

  // Set permissive CORS and stream headers for audio/video HTML5 players
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, x-user-id, x-api-key, x-media-password');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Upload single or multiple media
  app.post('/api/upload', (req, res) => {
    upload.any()(req, res, (err: any) => {
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

      const baseUrl = getBaseUrl(req);
      const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'guest';
      const folder = (req.body?.folder as string) || 'public';
      const customSlug = (req.body?.customSlug as string) || undefined;
      const expiresAt = (req.body?.expiresAt as string) || undefined;
      const password = (req.body?.password as string) || undefined;

      const results: MediaItem[] = [];

      for (const file of files) {
        const ext = path.extname(file.filename);
        const fileId = path.parse(file.filename).name;
        const mediaType = detectMediaType(ext, file.mimetype);
        const mimeType = inferMimeType(ext, file.mimetype);

        const mediaItem: MediaItem = {
          id: fileId,
          originalName: file.originalname,
          filename: file.filename,
          mediaType,
          mimeType,
          size: file.size,
          createdAt: new Date().toISOString(),
          userId,
          folder,
          customSlug,
          expiresAt,
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

  // Upload bulk media files (Batch Upload feature for guests and pro users)
  app.post('/api/upload-bulk', (req, res) => {
    upload.any()(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'One or more files exceed the 100MB size limit.' });
        }
        return res.status(400).json({ success: false, error: `Batch upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, error: err.message || 'Failed to upload files.' });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files provided for bulk upload.' });
      }

      const baseUrl = getBaseUrl(req);
      const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'guest';
      const folder = (req.body?.folder as string) || 'public';
      const expiresAt = (req.body?.expiresAt as string) || undefined;

      const results: MediaItem[] = [];

      for (const file of files) {
        const ext = path.extname(file.filename);
        const fileId = path.parse(file.filename).name;
        const mediaType = detectMediaType(ext, file.mimetype);
        const mimeType = inferMimeType(ext, file.mimetype);

        const mediaItem: MediaItem = {
          id: fileId,
          originalName: file.originalname,
          filename: file.filename,
          mediaType,
          mimeType,
          size: file.size,
          createdAt: new Date().toISOString(),
          userId,
          folder,
          expiresAt,
          views: 0,
          plays: 0,
          downloads: 0,
        };

        mediaRegistry[fileId] = mediaItem;

        const directUrl = `${baseUrl}/media/${file.filename}`;
        const playerUrl = `${baseUrl}/?view=${fileId}`;

        results.push({
          ...mediaItem,
          directUrl,
          directAudioUrl: directUrl,
          playerUrl,
        });
      }

      saveRegistry();

      return res.status(201).json({
        success: true,
        item: results[0],
        items: results,
        count: results.length,
      });
    });
  });

  // Query media list with optional user isolation
  app.get('/api/media', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const typeFilter = req.query.type as string;

    let items = Object.values(mediaRegistry).filter((i) => {
      const p = path.join(UPLOADS_DIR, i.filename);
      return fs.existsSync(p) && fs.statSync(p).size >= 32;
    });

    if (userId && userId !== 'all') {
      items = items.filter((i) => i.userId === userId);
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

  // Backward compatible route
  app.get('/api/audios', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const items = Object.values(mediaRegistry)
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

    res.json({ items });
  });

  // Single media metadata
  app.get(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Check expiration
    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This media link has expired.' });
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

  // Direct media stream route
  app.get('/media/:filename', (req, res) => {
    const filename = req.params.filename;
    const fileId = path.parse(filename).name;
    const item = mediaRegistry[fileId] || Object.values(mediaRegistry).find((m) => m.filename === filename);

    if (item) {
      // Check expiration
      if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
        return res.status(410).send('This media link has expired.');
      }

      // Check password if set
      if (item.password) {
        const providedPass = req.headers['x-media-password'] || req.query.pwd;
        if (providedPass !== item.password) {
          return res.status(401).send('Password required to view this media.');
        }
      }

      // Increment analytics view count
      item.views = (item.views || 0) + 1;
      if (item.mediaType === 'audio' || item.mediaType === 'video') {
        item.plays = (item.plays || 0) + 1;
      }
      saveRegistry();
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const ext = path.extname(filename);
    const mimeType = item?.mimeType || inferMimeType(ext);
    streamMediaFile(req, res, filePath, mimeType);
  });

  // Backward compatibility alias routes
  app.get(['/audio/:filename', '/file/:filename'], (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const ext = path.extname(filename);
    const mimeType = inferMimeType(ext);
    streamMediaFile(req, res, filePath, mimeType);
  });

  // Download endpoint with download counter
  app.get(['/api/media/:id/download', '/api/audio/:id/download'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return res.status(410).send('This media link has expired.');
    }

    item.downloads = (item.downloads || 0) + 1;
    saveRegistry();

    const filePath = path.join(UPLOADS_DIR, item.filename);
    streamMediaFile(req, res, filePath, item.mimeType, item.originalName);
  });

  // Delete media endpoint
  app.delete(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    delete mediaRegistry[id];
    saveRegistry();

    return res.json({ success: true, message: 'Media deleted successfully' });
  });

  // Catch-all for undefined /api routes so they return JSON, never HTML
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  // Express error handler for unhandled errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Express caught error:', err);
    const status = err.status || (err.name === 'MulterError' ? 400 : 500);
    res.status(status).json({
      success: false,
      error: err.message || 'An unexpected error occurred during processing.',
    });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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
