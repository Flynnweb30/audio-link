import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ArrowLeft, 
  AlertCircle, 
  Volume1, 
  QrCode,
  Music,
  Film,
  Image as ImageIcon,
  Repeat,
  X,
  Trash2
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatDuration, formatFileSize, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface SharePlayerViewProps {
  audioId: string;
  onBackToStudio: () => void;
  onDeleteMedia: (id: string) => void;
}

export const SharePlayerView: React.FC<SharePlayerViewProps> = ({
  audioId,
  onBackToStudio,
  onDeleteMedia,
}) => {
  const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/media/${audioId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Media not found or has expired.');
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setMediaItem(data.item);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err.message || 'Could not load media.');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [audioId]);

  const attemptAutoplay = () => {
    const el = mediaRef.current;
    if (!el || autoplayAttempted) return;

    setAutoplayAttempted(true);
    el.volume = volume;

    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const handleLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration)) setDuration(el.duration);
      attemptAutoplay();
    };

    const handleCanPlay = () => {
      if (!autoplayAttempted) attemptAutoplay();
    };

    const handleTimeUpdate = () => setCurrentTime(el.currentTime);
    const handleEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('ended', handleEnded);

    return () => {
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('canplay', handleCanPlay);
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('ended', handleEnded);
    };
  }, [mediaItem, autoplayAttempted, isLooping]);

  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch((err) => console.error(err));
    }
  };

  const handleSeek = (newTime: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipTime = (offsetSecs: number) => {
    if (mediaRef.current) {
      const newTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + offsetSecs));
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (mediaRef.current) {
      mediaRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        mediaRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      const nextMuted = !isMuted;
      mediaRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleCopy = async (text: string, typeKey: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedType(typeKey);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-700">Connecting to stream...</p>
      </div>
    );
  }

  if (loadError || !mediaItem) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Media Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{loadError || 'This link does not exist.'}</p>
        <button
          onClick={onBackToStudio}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Studio</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload Studio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(window.location.href, 'share')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            {copiedType === 'share' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </>
            )}
          </button>

          <button
            onClick={() => setQrModalOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Scan QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              {mediaItem.mediaType === 'audio' ? (
                <Music className="w-6 h-6 text-indigo-400" />
              ) : mediaItem.mediaType === 'video' ? (
                <Film className="w-6 h-6 text-violet-400" />
              ) : (
                <ImageIcon className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {mediaItem.originalName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-mono uppercase font-semibold">{mediaItem.mediaType}</span>
                <span>•</span>
                <span className="font-mono">{mediaItem.mimeType}</span>
                <span>•</span>
                <span className="font-mono tabular-nums">{formatFileSize(mediaItem.size)}</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold">Direct Stream</span>
              </div>
            </div>
          </div>

          <a
            href={`/api/media/${mediaItem.id}/download`}
            download={mediaItem.originalName}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>

        {mediaItem.mediaType === 'audio' ? (
          <div className="space-y-4">
            <audio
              ref={(node) => { mediaRef.current = node; }}
              src={mediaItem.directUrl}
              autoPlay
              preload="auto"
            />
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <WaveformVisualizer
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                barCount={80}
                height={64}
              />
              <div className="flex justify-between text-xs font-mono tabular-nums text-slate-500 px-0.5">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => skipTime(-10)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => skipTime(10)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-slate-600 hover:text-slate-900 p-1.5">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-slate-200 rounded-lg accent-slate-900"
                />
              </div>
            </div>
          </div>
        ) : mediaItem.mediaType === 'video' ? (
          <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={(node) => { mediaRef.current = node; }}
              src={mediaItem.directUrl}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="w-full max-h-[500px] object-contain"
            />
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center p-4">
            <img
              src={mediaItem.directUrl}
              alt={mediaItem.originalName}
              className="max-h-[600px] w-auto rounded-xl object-contain shadow-xs"
            />
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Direct Raw {mediaItem.mediaType.toUpperCase()} Stream URL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={mediaItem.directUrl}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono truncate select-all"
            />
            <button
              onClick={() => handleCopy(mediaItem.directUrl, 'direct')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {copiedType === 'direct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'direct' ? 'Copied!' : 'Copy URL'}</span>
            </button>

            {/* Red X/Delete button */}
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2 border border-slate-300 hover:border-red-400 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Delete media permanently"
              >
                <X className="w-4 h-4 hover:text-red-600" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-white border border-red-300 p-1 rounded-xl shadow-md">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMedia(mediaItem.id);
                    onBackToStudio();
                  }}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="p-1 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <QrCodeModal
        url={window.location.href}
        title="Scan to Open on Mobile"
        subtitle={mediaItem.originalName}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};