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
  QrCode,
  Music2,
  Video as VideoIcon,
  Image as ImageIcon,
  Repeat,
  X,
  Trash2,
  Loader2
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatDuration, formatFileSize, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface SharePlayerViewProps {
  mediaId: string;
  onBackToStudio: () => void;
  onDeleteMedia?: (id: string) => void;
}

export const SharePlayerView: React.FC<SharePlayerViewProps> = ({
  mediaId,
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
  const [isLooping, setIsLooping] = useState(false);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/media/${mediaId}`)
      .then((res) => {
        if (!res.ok) {
          return fetch(`/api/audio/${mediaId}`).then((r) => {
            if (!r.ok) throw new Error('Media file not found or expired.');
            return r.json();
          });
        }
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
  }, [mediaId]);

  const attemptAutoplay = () => {
    const el = audioRef.current || videoRef.current;
    if (!el || autoplayAttempted) return;

    setAutoplayAttempted(true);
    el.volume = volume;

    if (!el.src || el.src === '' || el.currentSrc === '') {
      el.src = playableUrl;
      el.load();
    }

    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch((err) => {
          console.warn('Autoplay restricted by browser:', err);
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    const el = audioRef.current || videoRef.current;
    if (!el) return;

    const handleLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration)) {
        setDuration(el.duration);
      }
      attemptAutoplay();
    };

    const handleCanPlay = () => {
      if (!autoplayAttempted) {
        attemptAutoplay();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(el.currentTime);
    };

    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
      }
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
    const el = audioRef.current || videoRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      if (!el.src || el.src === '' || el.currentSrc === '') {
        el.src = playableUrl;
      }
      if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        el.load();
      }
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('Play request handled:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (newTime: number) => {
    const el = audioRef.current || videoRef.current;
    if (el) {
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipTime = (offsetSecs: number) => {
    const el = audioRef.current || videoRef.current;
    if (el) {
      const newTime = Math.max(0, Math.min(duration, el.currentTime + offsetSecs));
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    const el = audioRef.current || videoRef.current;
    if (el) {
      el.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        el.muted = false;
      }
    }
  };

  const toggleMute = () => {
    const el = audioRef.current || videoRef.current;
    if (el) {
      const nextMuted = !isMuted;
      el.muted = nextMuted;
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteMedia && mediaItem) {
        await onDeleteMedia(mediaItem.id);
      } else {
        await fetch(`/api/media/${mediaId}`, { method: 'DELETE' });
        onBackToStudio();
      }
    } finally {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-700">Loading media stream...</p>
      </div>
    );
  }

  if (loadError || !mediaItem) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Media Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{loadError || 'This media link does not exist.'}</p>
        <button
          onClick={onBackToStudio}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Media Studio</span>
        </button>
      </div>
    );
  }

  const directUrl = mediaItem.directUrl || (mediaItem as any).directAudioUrl || '';
  const playableUrl = mediaItem.filename 
    ? `/media/${encodeURIComponent(mediaItem.filename)}` 
    : directUrl;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Media Studio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(window.location.href, 'share')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
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
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Scan QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mediaItem.mediaType !== 'image' && autoplayBlocked && !isPlaying && (
        <div 
          onClick={togglePlay}
          className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 rounded-2xl shadow-md flex items-center justify-between gap-4 transition-transform hover:scale-[1.01] active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-xs group-hover:bg-white group-hover:text-emerald-700 transition-colors">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Tap to Start Media Playback</p>
              <p className="text-xs text-emerald-100 mt-0.5">
                Browser paused autoplay until first interaction. Click anywhere on this banner to begin.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-white/20 rounded-md text-xs font-semibold backdrop-blur-xs">
            Play Now
          </span>
        </div>
      )}

      {/* Main Studio Viewer Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
              {mediaItem.mediaType === 'image' ? (
                <ImageIcon className="w-6 h-6 text-emerald-400" />
              ) : mediaItem.mediaType === 'video' ? (
                <VideoIcon className="w-6 h-6 text-rose-400" />
              ) : (
                <Music2 className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {mediaItem.originalName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="uppercase font-semibold text-slate-700">{mediaItem.mediaType}</span>
                <span aria-hidden="true">·</span>
                <span>{mediaItem.mimeType}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatFileSize(mediaItem.size)}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 font-medium">Direct Stream</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`/api/media/${mediaItem.id}/download`}
              download={mediaItem.originalName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>

        {mediaItem.mediaType === 'image' ? (
          <div className="flex justify-center bg-slate-50 rounded-2xl p-4 border border-slate-200 overflow-hidden">
            <img
              src={directUrl}
              alt={mediaItem.originalName}
              className="max-h-[60vh] object-contain rounded-xl shadow-xs"
            />
          </div>
        ) : mediaItem.mediaType === 'video' ? (
          <div className="rounded-2xl overflow-hidden bg-black flex justify-center border border-slate-200 shadow-inner">
            <video
              ref={videoRef}
              controls
              className="max-h-[60vh] w-full"
              src={playableUrl}
              preload="auto"
            />
          </div>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={playableUrl}
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
                  title="Skip back 10s"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => skipTime(10)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Skip forward 10s"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-2 rounded-xl transition-colors ${
                    isLooping ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Toggle loop"
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-600 hover:text-slate-900 p-1.5"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>
            </div>
          </>
        )}

        {/* Direct URL Box with Copy and Red X Delete Button */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Direct Media Stream URL
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Plays/Displays in-browser directly
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={directUrl}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono truncate select-all"
            />
            
            {/* Copy Button */}
            <button
              onClick={() => handleCopy(directUrl, 'direct')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {copiedType === 'direct' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Direct URL</span>
                </>
              )}
            </button>

            {/* X / Delete Icon Beside Copy Button with Red Hover & Confirmation */}
            <div className="relative">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="p-2 border border-slate-200 hover:border-red-300 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                title="Delete media and revoke URL"
                aria-label="Delete media"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>

              {/* Confirmation Popover */}
              {showDeleteConfirm && (
                <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-white border border-red-200 rounded-xl shadow-lg z-20 text-left animate-in fade-in zoom-in-95">
                  <p className="text-xs font-bold text-slate-900 mb-1">Delete this file?</p>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    This will permanently remove the media, revoke the URL, and delete the record.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors inline-flex items-center gap-1"
                    >
                      {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QrCodeModal
        url={window.location.href}
        title="Scan to View on Mobile"
        subtitle={mediaItem.originalName}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};
