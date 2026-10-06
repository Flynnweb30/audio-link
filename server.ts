import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(__dirname, 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export type MediaType = 'audio' | 'video' | 'image';

export interface StoredMediaItem {
  id: string;
  originalName: string;
  filename: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  createdAt: string;
  userId?: string;
  folder?: string;
  duration?: number;
  width?: number;
  height?: number;
  views?: number;
  downloads?: number;
  customSlug?: string;
}

let mediaRegistry: Record<string, StoredMediaItem> = {};

function detectMediaType(ext: string, mime?: string): { mediaType: MediaType; mimeType: string } {
  const cleanExt = ext.toLowerCase();

  const audioExtMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.flac': 'audio/flac',
    '.weba': 'audio/webm',
  };

  const videoExtMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.ogv': 'video/ogg',
    '.mkv': 'video/x-matroska',
  };

  const imageExtMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
  };

  if (videoExtMap[cleanExt]) return { mediaType: 'video', mimeType: videoExtMap[cleanExt] };
  if (imageExtMap[cleanExt]) return { mediaType: 'image', mimeType: imageExtMap[cleanExt] };
  if (audioExtMap[cleanExt]) return { mediaType: 'audio', mimeType: audioExtMap[cleanExt] };

  if (mime) {
    if (mime.startsWith('video/')) return { mediaType: 'video', mimeType: mime };
    if (mime.startsWith('image/')) return { mediaType: 'image', mimeType: mime };
    if (mime.startsWith('audio/')) return { mediaType: 'audio', mimeType: mime };
  }

  return { mediaType: 'audio', mimeType: 'audio/mpeg' };
}

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      mediaRegistry = JSON.parse(data);
    } else {
      mediaRegistry = {};
    }
  } catch (err) {
    console.error('Error loading media registry:', err);
    mediaRegistry = {};
  }

  // Auto-discover files existing on disk
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      let recovered = 0;
      for (const file of files) {
        if (file === 'metadata.json' || file.startsWith('.')) continue;
        const fileId = path.parse(file).name;
        if (!mediaRegistry[fileId]) {
          const filePath = path.join(UPLOADS_DIR, file);
          const stat = fs.statSync(filePath);
          const ext = path.extname(file);
          const { mediaType, mimeType } = detectMediaType(ext);
          mediaRegistry[fileId] = {
            id: fileId,
            originalName: file,
            filename: file,
            mediaType,
            mimeType,
            size: stat.size,
            createdAt: stat.birthtime ? stat.birthtime.toISOString() : new Date().toISOString(),
            userId: 'public',
            folder: 'public',
            views: 0,
            downloads: 0,
          };
          recovered++;
        }
      }
      if (recovered > 0) {
        saveRegistry();
        console.log(`Recovered and indexed ${recovered} files from disk.`);
      }
    }
  } catch (err) {
    console.error('Error auto-discovering disk files:', err);
  }
}

function saveRegistry(): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(mediaRegistry, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving media registry:', err);
  }
}

loadRegistry();

// Fallback search to find a file on disk if missing from in-memory cache
function findOrRecoverFile(idOrFilename: string): StoredMediaItem | null {
  const cleanId = path.parse(idOrFilename).name;
  let item = mediaRegistry[cleanId] || mediaRegistry[idOrFilename];
  if (item) return item;

  try {
    if (!fs.existsSync(UPLOADS_DIR)) return null;
    const files = fs.readdirSync(UPLOADS_DIR);
    const matched = files.find((f) => path.parse(f).name === cleanId || f === idOrFilename);
    if (matched) {
      const filePath = path.join(UPLOADS_DIR, matched);
      const stat = fs.statSync(filePath);
      const ext = path.extname(matched);
      const { mediaType, mimeType } = detectMediaType(ext);
      item = {
        id: cleanId,
        originalName: matched,
        filename: matched,
        mediaType,
        mimeType,
        size: stat.size,
        createdAt: stat.birthtime ? stat.birthtime.toISOString() : new Date().toISOString(),
        userId: 'public',
        folder: 'public',
        views: 0,
        downloads: 0,
      };
      mediaRegistry[cleanId] = item;
      saveRegistry();
      return item;
    }
  } catch (err) {
    console.error('Error in findOrRecoverFile:', err);
  }

  return null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
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
    return res.status(404).json({ error: 'File not found on server' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  if (downloadName) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
  } else {
    res.setHeader('Content-Disposition', 'inline');
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
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : (req.protocol || 'http');
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

async function startServer() {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, X-User-Id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Upload endpoint
  app.post('/api/upload', (req, res) => {
    upload.any()(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum limit of 100MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'Failed to upload media file.' });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      const file = (files && files.length > 0) ? files[0] : (req as any).file;

      if (!file) {
        return res.status(400).json({ error: 'No media file provided in request.' });
      }

      const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'public';
      const folder = (req.body?.folder as string) || 'public';

      const fileId = path.parse(file.filename).name;
      const ext = path.extname(file.filename);
      const { mediaType, mimeType } = detectMediaType(ext, file.mimetype);

      const mediaItem: StoredMediaItem = {
        id: fileId,
        originalName: file.originalname,
        filename: file.filename,
        mediaType,
        mimeType,
        size: file.size,
        createdAt: new Date().toISOString(),
        userId,
        folder,
        views: 0,
        downloads: 0,
      };

      mediaRegistry[fileId] = mediaItem;
      saveRegistry();

      const baseUrl = getBaseUrl(req);
      const directUrl = `${baseUrl}/media/${file.filename}`;
      const playerUrl = `${baseUrl}/?play=${fileId}`;

      let embedHtml = '';
      if (mediaType === 'audio') {
        embedHtml = `<audio controls preload="metadata" src="${directUrl}"></audio>`;
      } else if (mediaType === 'video') {
        embedHtml = `<video controls preload="metadata" playsinline src="${directUrl}"></video>`;
      } else {
        embedHtml = `<img src="${directUrl}" alt="${encodeURIComponent(file.originalname)}" />`;
      }

      return res.status(201).json({
        success: true,
        item: {
          ...mediaItem,
          directUrl,
          directAudioUrl: directUrl,
          playerUrl,
        },
        directUrl,
        directAudioUrl: directUrl,
        playerUrl,
        embedHtml,
      });
    });
  });

  // Query media history per user
  app.get(['/api/media', '/api/audios'], (req, res) => {
    const baseUrl = getBaseUrl(req);
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const filterType = req.query.type as string | undefined;
    const filterFolder = req.query.folder as string | undefined;

    let items = Object.values(mediaRegistry);

    if (userId) {
      items = items.filter((item) => item.userId === userId || item.userId === 'public');
    }

    if (filterType && ['audio', 'video', 'image'].includes(filterType)) {
      items = items.filter((item) => item.mediaType === filterType);
    }

    if (filterFolder && filterFolder !== 'all') {
      items = items.filter((item) => (item.folder || 'public') === filterFolder);
    }

    const formatted = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        ...item,
        directUrl: `${baseUrl}/media/${item.filename}`,
        directAudioUrl: `${baseUrl}/media/${item.filename}`,
        playerUrl: `${baseUrl}/?play=${item.id}`,
      }));

    res.json({ items: formatted });
  });

  // Migrate guest history to authenticated user account
  app.post('/api/migrate-history', (req, res) => {
    const { fromUserId, toUserId } = req.body || {};
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId are required' });
    }

    let count = 0;
    Object.values(mediaRegistry).forEach((item) => {
      if (item.userId === fromUserId) {
        item.userId = toUserId;
        count++;
      }
    });

    if (count > 0) {
      saveRegistry();
    }
    return res.json({ success: true, migrated: count });
  });

  // Single media item metadata with auto-recovery
  app.get(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    const id = req.params.id;
    const item = findOrRecoverFile(id);

    if (!item) {
      return res.status(404).json({ error: 'Media not found', id });
    }

    const baseUrl = getBaseUrl(req);
    const directUrl = `${baseUrl}/media/${item.filename}`;
    return res.json({
      item: {
        ...item,
        directUrl,
        directAudioUrl: directUrl,
        playerUrl: `${baseUrl}/?play=${item.id}`,
      },
    });
  });

  // Direct Stream / Inline Playback Endpoint (Resolves filename or ID with disk fallback)
  app.get(['/media/:filename', '/audio/:filename'], (req, res) => {
    const requested = req.params.filename;
    let item = findOrRecoverFile(requested);

    let filename = item ? item.filename : requested;
    let filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      item = findOrRecoverFile(requested);
      if (item) {
        filename = item.filename;
        filePath = path.join(UPLOADS_DIR, filename);
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media file not found on server' });
    }

    if (item && (!req.headers.range || req.headers.range.startsWith('bytes=0-'))) {
      item.views = (item.views || 0) + 1;
      saveRegistry();
    }

    const ext = path.extname(filename);
    const mimeType = item?.mimeType || detectMediaType(ext).mimeType;
    streamMediaFile(req, res, filePath, mimeType);
  });

  // Download media endpoint
  app.get(['/api/media/:id/download', '/api/audio/:id/download'], (req, res) => {
    const id = req.params.id;
    const item = findOrRecoverFile(id);

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    item.downloads = (item.downloads || 0) + 1;
    saveRegistry();

    const filePath = path.join(UPLOADS_DIR, item.filename);
    streamMediaFile(req, res, filePath, item.mimeType, item.originalName);
  });

  // Complete file deletion from server disk, URL registry and metadata
  app.delete(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    const id = req.params.id;
    const cleanId = path.parse(id).name;
    const item = mediaRegistry[cleanId] || mediaRegistry[id];

    const filename = item ? item.filename : id;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file from disk:', err);
      }
    }

    delete mediaRegistry[cleanId];
    delete mediaRegistry[id];
    saveRegistry();

    return res.json({ success: true, message: 'Media removed from disk and registry' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/media/') || req.path.startsWith('/audio/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediaLink Web Service running on http://0.0.0.0:${PORT}`);
    console.log(`Storage location: ${UPLOADS_DIR}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MediaLink server:', err);
  process.exit(1);
});