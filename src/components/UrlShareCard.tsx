import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  QrCode, 
  Code, 
  CheckCircle2,
  Film,
  Music,
  Image as ImageIcon
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatDuration, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface UrlShareCardProps {
  media: MediaItem;
  onOpenPlayer: (id: string) => void;
  onUploadAnother: () => void;
}

export const UrlShareCard: React.FC<UrlShareCardProps> = ({
  media,
  onOpenPlayer,
  onUploadAnother,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = media.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration)) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('ended', onEnded);
    };
  }, [media.id, media.mediaType]);

  const togglePlay = () => {
    const el = media.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Play failed:', err));
    }
  };

  const handleSeek = (newTime: number) => {
    const el = media.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    const el = media.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      el.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleCopy = async (text: string, typeKey: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedType(typeKey);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const openQr = (url: string, title: string) => {
    setQrUrl(url);
    setQrTitle(title);
    setQrModalOpen(true);
  };

  const embedCode = media.mediaType === 'audio'
    ? `<audio controls preload="metadata" src="${media.directUrl}"></audio>`
    : media.mediaType === 'video'
    ? `<video controls preload="metadata" playsinline src="${media.directUrl}"></video>`
    : `<img src="${media.directUrl}" alt="${encodeURIComponent(media.originalName)}" />`;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {media.mediaType === 'audio' && (
        <audio ref={audioRef} src={media.directUrl} preload="metadata" />
      )}

      <div className="bg-slate-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Direct {media.mediaType.toUpperCase()} URL Generated
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate max-w-xl">
            {media.originalName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="font-mono">{media.mimeType}</span>
            <span>•</span>
            <span className="font-mono tabular-nums">{formatFileSize(media.size)}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">HTTP 206 Byte-Range Enabled</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUploadAnother}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {media.mediaType === 'audio' ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-indigo-600" />
                  Audio Preview &amp; Waveform
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div className="my-2">
                <WaveformVisualizer
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  barCount={72}
                  height={50}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <a
                  href={`/api/media/${media.id}/download`}
                  download={media.originalName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : media.mediaType === 'video' ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-violet-600" />
                  Video Stream Preview
                </span>
                <a
                  href={`/api/media/${media.id}/download`}
                  download={media.originalName}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-96">
                <video
                  ref={videoRef}
                  src={media.directUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-96 object-contain"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Image Display Preview
                </span>
                <a
                  href={`/api/media/${media.id}/download`}
                  download={media.originalName}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
              <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center p-2">
                <img
                  src={media.directUrl}
                  alt={media.originalName}
                  className="max-h-80 w-auto rounded-lg object-contain shadow-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 border-2 border-emerald-500/20 bg-emerald-50/20 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <label className="text-xs font-bold text-slate-900">
                  Direct Raw {media.mediaType.toUpperCase()} URL (Streams/Displays in Browser, Ends in .{media.filename.split('.').pop()})
                </label>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Permanent Direct URL
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={media.directUrl}
                className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-medium select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(media.directUrl, 'direct')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedType === 'direct' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Direct URL</span>
                    </>
                  )}
                </button>
                <a
                  href={media.directUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Open Raw File in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When opened in any browser, this URL directly streams audio/video or displays the image in the browser window without forcing a download dialog.
            </p>
          </div>

          <div className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <label className="text-xs font-bold text-slate-900">
                  Shareable Web Player Link (Autoplay Ready + Interactive UI)
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={media.playerUrl}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(media.playerUrl, 'player')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedType === 'player' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Player Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPlayer(media.id)}
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Open Player Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openQr(media.playerUrl, 'Shareable Player QR')}
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Show Mobile QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 bg-white rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-xs font-semibold text-slate-900">
                HTML Embed Snippet
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={embedCode}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono select-all truncate"
              />
              <button
                type="button"
                onClick={() => handleCopy(embedCode, 'embed')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
              >
                {copiedType === 'embed' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <QrCodeModal
        url={qrUrl}
        title={qrTitle}
        subtitle={media.originalName}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};