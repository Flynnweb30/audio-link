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

export interface AudioItem {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  duration?: number;
}

let audioRegistry: Record<string, AudioItem> = {};

function loadRegistry(): void {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      audioRegistry = JSON.parse(data);
    } else {
      audioRegistry = {};
      saveRegistry();
    }
  } catch (err) {
    console.error('Error loading audio registry:', err);
    audioRegistry = {};
  }
}

function saveRegistry(): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(audioRegistry, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving audio registry:', err);
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

function seedSampleAudios(): void {
  if (Object.keys(audioRegistry).length === 0) {
    const sample1Id = 'aud_sample_acoustic_chime';
    const sample1Filename = `${sample1Id}.wav`;
    const sample1Path = path.join(UPLOADS_DIR, sample1Filename);
    const buf1 = generateSynthesizedWav([523.25, 659.25, 783.99, 987.77, 1046.50], 4.5);
    fs.writeFileSync(sample1Path, buf1);

    audioRegistry[sample1Id] = {
      id: sample1Id,
      originalName: 'Acoustic_Chimes_Demo.wav',
      filename: sample1Filename,
      mimeType: 'audio/wav',
      size: buf1.length,
      createdAt: new Date().toISOString(),
      duration: 4.5,
    };

    const sample2Id = 'aud_sample_lofi_pulse';
    const sample2Filename = `${sample2Id}.wav`;
    const sample2Path = path.join(UPLOADS_DIR, sample2Filename);
    const buf2 = generateSynthesizedWav([261.63, 329.63, 392.00, 440.00, 392.00, 329.63], 5.0);
    fs.writeFileSync(sample2Path, buf2);

    audioRegistry[sample2Id] = {
      id: sample2Id,
      originalName: 'Lofi_Pulse_Demo.wav',
      filename: sample2Filename,
      mimeType: 'audio/wav',
      size: buf2.length,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      duration: 5.0,
    };

    saveRegistry();
  }
}

seedSampleAudios();

function inferAudioMimeType(ext: string, providedMime?: string): string {
  const cleanExt = ext.toLowerCase();
  const extMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',
    '.weba': 'audio/webm',
  };

  if (extMap[cleanExt]) {
    return extMap[cleanExt];
  }
  if (providedMime && providedMime.startsWith('audio/')) {
    return providedMime;
  }
  return 'audio/mpeg';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${id}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/opus',
  'audio/flac',
  'audio/x-flac',
  'audio/webm',
  'application/ogg',
]);

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac', '.webm', '.weba']);

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext || mime}. Allowed: MP3, WAV, M4A, OGG, FLAC, WEBM.`));
    }
  },
});

function streamAudioFile(
  req: express.Request,
  res: express.Response,
  filePath: string,
  mimeType: string,
  downloadName?: string
) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType || 'audio/mpeg');
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.post('/api/upload', (req, res) => {
    upload.single('audio')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum limit of 50MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'Failed to upload audio file.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided in request.' });
      }

      const file = req.file;
      const fileId = path.parse(file.filename).name;
      const ext = path.extname(file.filename);
      const mimeType = inferAudioMimeType(ext, file.mimetype);

      const audioItem: AudioItem = {
        id: fileId,
        originalName: file.originalname,
        filename: file.filename,
        mimeType: mimeType,
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      audioRegistry[fileId] = audioItem;
      saveRegistry();

      const baseUrl = getBaseUrl(req);
      const directAudioUrl = `${baseUrl}/audio/${file.filename}`;
      const playerUrl = `${baseUrl}/?play=${fileId}`;

      return res.status(201).json({
        success: true,
        item: {
          ...audioItem,
          directAudioUrl,
          playerUrl,
        },
        directAudioUrl,
        playerUrl,
        embedHtml: `<audio controls preload="metadata" src="${directAudioUrl}"></audio>`,
      });
    });
  });

  app.get('/api/audios', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const items = Object.values(audioRegistry)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        ...item,
        directAudioUrl: `${baseUrl}/audio/${item.filename}`,
        playerUrl: `${baseUrl}/?play=${item.id}`,
      }));

    res.json({ items });
  });

  app.get('/api/audio/:id', (req, res) => {
    const id = req.params.id;
    const item = audioRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const baseUrl = getBaseUrl(req);
    return res.json({
      item: {
        ...item,
        directAudioUrl: `${baseUrl}/audio/${item.filename}`,
        playerUrl: `${baseUrl}/?play=${item.id}`,
      },
    });
  });

  app.get('/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const fileId = path.parse(filename).name;
    const item = audioRegistry[fileId];

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    const ext = path.extname(filename);
    const mimeType = item?.mimeType || inferAudioMimeType(ext);
    streamAudioFile(req, res, filePath, mimeType);
  });

  app.get('/api/audio/:id/download', (req, res) => {
    const id = req.params.id;
    const item = audioRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const filePath = path.join(UPLOADS_DIR, item.filename);
    streamAudioFile(req, res, filePath, item.mimeType, item.originalName);
  });

  app.delete('/api/audio/:id', (req, res) => {
    const id = req.params.id;
    const item = audioRegistry[id];

    if (!item) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    delete audioRegistry[id];
    saveRegistry();

    return res.json({ success: true, message: 'Audio deleted successfully' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/audio/')) {
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
    console.log(`AudioLink server running on http://0.0.0.0:${PORT}`);
    console.log(`Uploads stored at: ${UPLOADS_DIR}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AudioLink server:', err);
  process.exit(1);
});