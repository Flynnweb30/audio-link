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
  Music2,
  Repeat
} from 'lucide-react';
import { AudioItem } from '../types';
import { formatDuration, formatFileSize, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface SharePlayerViewProps {
  audioId: string;
  onBackToStudio: () => void;
}

export const SharePlayerView: React.FC<SharePlayerViewProps> = ({
  audioId,
  onBackToStudio,
}) => {
  const [audioItem, setAudioItem] = useState<AudioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/audio/${audioId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Audio file was not found or has expired.' : 'Failed to fetch audio.');
        }
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setAudioItem(data.item);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err.message || 'Could not load audio.');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [audioId]);

  const attemptAutoplay = () => {
    const el = audioRef.current;
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
        .catch((err) => {
          console.warn('Autoplay restricted by browser policy:', err);
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    const el = audioRef.current;
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
  }, [audioItem, autoplayAttempted, isLooping]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(10);
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const togglePlay = () => {
    const el = audioRef.current;
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
        .catch((err) => {
          console.error('Play request failed:', err);
        });
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipTime = (offsetSecs: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + offsetSecs));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (audioRef.current) {
      audioRef.current.loop = next;
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
        <p className="text-sm font-medium text-slate-700">Connecting to direct audio stream...</p>
      </div>
    );
  }

  if (loadError || !audioItem) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Audio Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{loadError || 'This audio link does not exist.'}</p>
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Audio File</span>
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

      {autoplayBlocked && !isPlaying && (
        <div 
          onClick={togglePlay}
          className="cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 rounded-2xl shadow-md flex items-center justify-between gap-4 transition-transform hover:scale-[1.01] active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-xs group-hover:bg-white group-hover:text-indigo-600 transition-colors">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Tap to Start Audio Playback</p>
              <p className="text-xs text-indigo-100 mt-0.5">
                Browser paused autoplay until first interaction. Click anywhere to begin stream.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-xs">
            Play Now
          </span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <audio
          ref={audioRef}
          src={audioItem.directAudioUrl}
          autoPlay
          preload="auto"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Music2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {audioItem.originalName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-mono">{audioItem.mimeType}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatFileSize(audioItem.size)}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 font-semibold">Direct Stream</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`/api/audio/${audioItem.id}/download`}
              download={audioItem.originalName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Skip back 10s (Left Arrow)"
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Skip forward 10s (Right Arrow)"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleLoop}
              className={`p-2 rounded-lg transition-colors ${
                isLooping ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isLooping ? 'Looping enabled' : 'Enable loop'}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                    playbackRate === rate
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-slate-600 hover:text-slate-900 p-1.5"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Direct Audio Stream URL (Ends in .{audioItem.filename.split('.').pop()})
            </span>
            <span className="text-[11px] text-slate-500">
              Permanent direct endpoint
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={audioItem.directAudioUrl}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono truncate select-all"
            />
            <button
              onClick={() => handleCopy(audioItem.directAudioUrl, 'direct')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {copiedType === 'direct' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <QrCodeModal
        url={window.location.href}
        title="Scan to Listen on Mobile"
        subtitle={audioItem.originalName}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};