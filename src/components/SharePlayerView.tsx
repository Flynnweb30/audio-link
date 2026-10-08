import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Download, 
  Radio, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  X,
  RotateCcw 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatDuration, copyToClipboard } from '../utils/formatters';
import { fetchMediaRecordById } from '../firebase/syncService';

interface SharePlayerViewProps {
  mediaId: string;
  onBackToHome: () => void;
}

const BUILTIN_SAMPLES: Record<string, MediaItem> = {
  sample_lofi_beat: {
    id: 'sample_lofi_beat',
    documentId: 'sample_lofi_beat',
    storagePath: 'samples/sample_lofi_beat.mp3',
    downloadURL: 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3',
    directUrl: 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3',
    filename: 'sample_lofi_beat.mp3',
    originalName: 'Lofi Chill Acoustic (Sample).mp3',
    mediaType: 'audio',
    mimeType: 'audio/mpeg',
    size: 2450000,
    format: 'MP3',
    folder: 'public',
    createdAt: new Date().toISOString(),
    ownerId: 'system',
    status: 'ready',
    isGuest: false,
    duration: 65,
  },
  sample_nature_ambience: {
    id: 'sample_nature_ambience',
    documentId: 'sample_nature_ambience',
    storagePath: 'samples/sample_nature_ambience.mp3',
    downloadURL: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
    directUrl: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
    filename: 'sample_nature_ambience.mp3',
    originalName: 'Forest Birds Ambience (Sample).mp3',
    mediaType: 'audio',
    mimeType: 'audio/mpeg',
    size: 1820000,
    format: 'MP3',
    folder: 'public',
    createdAt: new Date().toISOString(),
    ownerId: 'system',
    status: 'ready',
    isGuest: false,
    duration: 42,
  }
};

export const SharePlayerView: React.FC<SharePlayerViewProps> = ({
  mediaId,
  onBackToHome,
}) => {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);

    // 1. Check built-in sample registry
    if (BUILTIN_SAMPLES[mediaId]) {
      const sampleItem = BUILTIN_SAMPLES[mediaId];
      setItem(sampleItem);
      setDuration(sampleItem.duration || 60);
      setLoading(false);
      return;
    }

    // 2. Fetch directly from Firestore as single source of truth
    try {
      const record = await fetchMediaRecordById(mediaId);
      if (record) {
        setItem(record);
        setDuration(record.duration || 0);
        setLoading(false);
        return;
      }
    } catch {}

    setError('Media record could not be found or was removed.');
    setLoading(false);
  };

  useEffect(() => {
    loadMedia();
  }, [mediaId]);

  const handleCopy = async () => {
    const url = item?.downloadURL || item?.directUrl;
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading Media from Firebase Storage...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Media Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'Media not found'}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Media Converter
            </button>
            <button
              type="button"
              onClick={loadMedia}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Link</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mediaUrl = item.downloadURL || item.directUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBackToHome}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">AudioLink Media Viewer</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              {item.mediaType === 'audio' ? <Music className="w-6 h-6" /> : item.mediaType === 'video' ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white truncate">{item.originalName || item.filename}</h1>
              <p className="text-xs text-slate-400 font-mono">
                {formatFileSize(item.size)} · {item.format} · Folder: {item.folder}
              </p>
            </div>
          </div>

          {item.mediaType === 'audio' && (
            <div className="space-y-4 pt-2">
              <audio
                ref={audioRef}
                src={mediaUrl}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => setIsPlaying(false)}
                muted={isMuted}
              />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration > 0 ? duration : 100}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setCurrentTime(v);
                      if (audioRef.current) audioRef.current.currentTime = v;
                    }}
                    className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {item.mediaType === 'video' && (
            <div className="rounded-2xl overflow-hidden bg-black max-h-96 flex items-center justify-center">
              <video src={mediaUrl} controls className="max-h-96 w-full rounded-2xl" preload="metadata" />
            </div>
          )}

          {item.mediaType === 'image' && (
            <div className="rounded-2xl overflow-hidden bg-slate-950 max-h-96 flex items-center justify-center p-2">
              <img src={mediaUrl} alt={item.originalName} className="max-h-92 w-auto object-contain rounded-xl" />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-mono truncate select-all">{mediaUrl}</span>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              download={item.originalName}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};