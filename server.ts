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
}

let mediaRegistry: Record<string, StoredMediaItem> = {};

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      mediaRegistry = JSON.parse(data);
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

loadRegistry();

function generateSynthesizedWav(frequencySequence: number[], durationSeconds: number): Buffer {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  const noteDuration = durationSeconds / frequencySequence.length;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.min(Math.floor(t / noteDuration), frequencySequence.length - 1);
    const freq = frequencySequence[noteIndex];
    const noteTime = t - noteIndex * noteDuration;
    
    const attack = Math.min(1, noteTime / 0.05);
    const decay = Math.max(0, 1 - (noteTime / noteDuration) * 0.7);
    const envelope = attack * decay;

    const sampleVal = (Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(4 * Math.PI * freq * t) * 0.3) * envelope;
    const intVal = Math.floor(sampleVal * 18000);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intVal)), offset);
    offset += 2;
  }

  return buffer;
}

function seedSampleMedia(): void {
  let changed = false;

  if (!mediaRegistry['aud_sample_acoustic_chime']) {
    const sample1Id = 'aud_sample_acoustic_chime';
    const sample1Filename = `${sample1Id}.wav`;
    const sample1Path = path.join(UPLOADS_DIR, sample1Filename);
    const buf1 = generateSynthesizedWav([523.25, 659.25, 783.99, 987.77, 1046.50], 4.5);
    fs.writeFileSync(sample1Path, buf1);

    mediaRegistry[sample1Id] = {
      id: sample1Id,
      originalName: 'Acoustic_Chimes_Demo.wav',
      filename: sample1Filename,
      mediaType: 'audio',
      mimeType: 'audio/wav',
      size: buf1.length,
      createdAt: new Date().toISOString(),
      folder: 'public',
      duration: 4.5,
    };
    changed = true;
  }

  if (!mediaRegistry['aud_sample_lofi_pulse']) {
    const sample2Id = 'aud_sample_lofi_pulse';
    const sample2Filename = `${sample2Id}.wav`;
    const sample2Path = path.join(UPLOADS_DIR, sample2Filename);
    const buf2 = generateSynthesizedWav([261.63, 329.63, 392.00, 440.00, 392.00, 329.63], 5.0);
    fs.writeFileSync(sample2Path, buf2);

    mediaRegistry[sample2Id] = {
      id: sample2Id,
      originalName: 'Lofi_Pulse_Demo.wav',
      filename: sample2Filename,
      mediaType: 'audio',
      mimeType: 'audio/wav',
      size: buf2.length,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      folder: 'public',
      duration: 5.0,
    };
    changed = true;
  }

  if (!mediaRegistry['img_sample_modern_gradient']) {
    const imgId = 'img_sample_modern_gradient';
    const imgFilename = `${imgId}.svg`;
    const imgPath = path.join(UPLOADS_DIR, imgFilename);
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="50%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)" />
      <circle cx="600" cy="315" r="180" fill="#ffffff" fill-opacity="0.12" />
      <text x="600" y="300" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="800" fill="#ffffff" letter-spacing="-1">MediaLink Direct CDN</text>
      <text x="600" y="350" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#e0e7ff">Direct Streaming &amp; Display Engine</text>
    </svg>`;
    fs.writeFileSync(imgPath, svgContent, 'utf-8');

    mediaRegistry[imgId] = {
      id: imgId,
      originalName: 'MediaLink_Gradient_Banner.svg',
      filename: imgFilename,
      mediaType: 'image',
      mimeType: 'image/svg+xml',
      size: Buffer.byteLength(svgContent, 'utf-8'),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      folder: 'public',
      width: 1200,
      height: 630,
    };
    changed = true;
  }

  if (changed) {
    saveRegistry();
  }
}

seedSampleMedia();

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

  // Seamless guest-to-account migration
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

  app.get(['/api/media', '/api/audios'], (req, res) => {
    const baseUrl = getBaseUrl(req);
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const filterType = req.query.type as string | undefined;
    const filterFolder = req.query.folder as string | undefined;

    let items = Object.values(mediaRegistry);

    if (userId) {
      items = items.filter((item) => !item.userId || item.userId === userId || item.userId === 'public');
    }

    if (filterType && ['audio', 'video', 'image'].includes(filterType)) {
      items = items.filter((item) => item.mediaType === filterType);
    }

    if (filterFolder && filterFolder !== 'all') {
      items = items.filter((item) => (item.folder || 'public') === filterFolder);
    }

    const formatted = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => {
        const directUrl = `${baseUrl}/media/${item.filename}`;
        return {
          ...item,
          directUrl,
          directAudioUrl: directUrl,
          playerUrl: `${baseUrl}/?play=${item.id}`,
        };
      });

    res.json({ items: formatted });
  });

  app.get(['/api/media/:id', '/api/audio/:id'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
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

  app.get(['/media/:filename', '/audio/:filename'], (req, res) => {
    const filename = req.params.filename;
    const fileId = path.parse(filename).name;
    const item = mediaRegistry[fileId];

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media file not found on server' });
    }

    const ext = path.extname(filename);
    const mimeType = item?.mimeType || detectMediaType(ext).mimeType;
    streamMediaFile(req, res, filePath, mimeType);
  });

  app.get(['/api/media/:id/download', '/api/audio/:id/download'], (req, res) => {
    const id = req.params.id;
    const item = mediaRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = path.join(UPLOADS_DIR, item.filename);
    streamMediaFile(req, res, filePath, item.mimeType, item.originalName);
  });

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
    console.log(`Persistent storage mounted at: ${UPLOADS_DIR}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MediaLink server:', err);
  process.exit(1);
});