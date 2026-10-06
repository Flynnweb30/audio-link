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
  Trash2,
  Eye,
  BarChart2,
  X,
  Loader2
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatDuration, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface UrlShareCardProps {
  media: MediaItem;
  onOpenPlayer: (id: string) => void;
  onUploadAnother: () => void;
  onDeleteMedia: (id: string) => void;
}

export const UrlShareCard: React.FC<UrlShareCardProps> = ({
  media,
  onOpenPlayer,
  onUploadAnother,
  onDeleteMedia,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const directUrl = media.directUrl || (media as any).directAudioUrl || '';
  
  // Use relative path for in-app browser playback to guarantee same-origin and avoid CORS
  const playableUrl = media.filename 
    ? `/media/${encodeURIComponent(media.filename)}` 
    : directUrl;

  useEffect(() => {
    setPlaybackError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.src = playableUrl;
      el.load();
    }
  }, [media.id, playableUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration)) {
        setDuration(el.duration);
      }
      setPlaybackError(null);
      setIsLoadingAudio(false);
    };
    const onCanPlay = () => {
      setIsLoadingAudio(false);
      setPlaybackError(null);
    };
    const onWaiting = () => setIsLoadingAudio(true);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      const err = el.error;
      let msg = 'Audio source could not be played.';
      if (err?.code === 4) {
        msg = 'Audio format not streamable by this browser or file is unavailable.';
      } else if (err?.code === 2) {
        msg = 'Network error while loading audio stream.';
      } else if (err?.code === 3) {
        msg = 'Audio decoding failed (unsupported or corrupted stream).';
      }
      setPlaybackError(msg);
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };
  }, [media.id]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    setPlaybackError(null);
    setIsLoadingAudio(true);

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
          setIsLoadingAudio(false);
          setPlaybackError(null);
        })
        .catch((err: any) => {
          setIsPlaying(false);
          setIsLoadingAudio(false);
          if (err.name === 'NotAllowedError') {
            setPlaybackError('Autoplay blocked. Tap Play again to listen.');
          } else if (err.name === 'NotSupportedError') {
            setPlaybackError('Audio playback failed: this audio stream format or source is not supported by your browser.');
          } else {
            setPlaybackError(`Playback failed: ${err.message || 'Unknown error'}`);
          }
        });
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
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

  const embedCode = media.mediaType === 'image'
    ? `<img src="${directUrl}" alt="${media.originalName}" />`
    : media.mediaType === 'video'
    ? `<video controls preload="metadata" src="${directUrl}"></video>`
    : `<audio controls preload="metadata" src="${directUrl}"></audio>`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {media.mediaType === 'audio' && (
        <audio
          ref={audioRef}
          src={playableUrl}
          preload="metadata"
        />
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Direct URL Ready
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate max-w-xl">
            {media.originalName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="uppercase font-semibold text-slate-300">{media.mediaType}</span>
            <span aria-hidden="true">·</span>
            <span>{media.mimeType}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatFileSize(media.size)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-300">Permanent Direct Stream</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUploadAnother}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Media Preview Widget */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl relative">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {media.mediaType} In-Browser Preview
              </span>
              {media.mediaType === 'audio' && (
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              )}
            </div>

            {/* Preview Header Quick Access: Copy URL & X Delete Icon */}
            <div className="flex items-center gap-1.5 relative">
              <button
                type="button"
                onClick={() => handleCopy(directUrl, 'quick_preview')}
                className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium shadow-2xs active:scale-95"
                title="Copy Direct URL to clipboard"
                aria-label="Copy Direct URL"
              >
                {copiedType === 'quick_preview' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-600 hidden sm:inline font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[11px] hidden sm:inline">Copy URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={`p-1.5 border rounded-lg transition-colors shadow-2xs disabled:opacity-50 active:scale-95 flex items-center gap-1 ${
                  showDeleteConfirm
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-300'
                }`}
                title="Delete Media File (X)"
                aria-label="Delete Media File"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Confirmation notification popover right in preview header */}
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-white border border-red-200 rounded-xl shadow-xl z-30 text-left animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs mb-1">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Delete Media File?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    This permanently removes stored media, revokes the direct URL, and deletes history.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await onDeleteMedia(media.id);
                        } finally {
                          setShowDeleteConfirm(false);
                          setIsDeleting(false);
                        }
                      }}
                      className="px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      <span>Yes, Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {media.mediaType === 'image' ? (
            <div className="my-2 flex justify-center bg-white rounded-xl p-3 border border-slate-200 overflow-hidden">
              <img
                src={directUrl}
                alt={media.originalName}
                className="max-h-72 object-contain rounded-lg shadow-2xs"
              />
            </div>
          ) : media.mediaType === 'video' ? (
            <div className="my-2 rounded-xl overflow-hidden bg-black flex justify-center border border-slate-200">
              <video
                src={directUrl}
                controls
                className="max-h-80 w-full"
                preload="metadata"
              />
            </div>
          ) : (
            <>
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

              {playbackError && (
                <div className="my-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{playbackError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaybackError(null);
                      if (audioRef.current) {
                        audioRef.current.load();
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-2 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-semibold rounded-md text-[11px] shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={isLoadingAudio}
                    className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 disabled:opacity-75 cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
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

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/media/${media.id}/download`}
                    download={media.originalName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* URL Options & Actions */}
        <div className="space-y-4">
          {/* 1. Direct Raw Media URL */}
          <div className="p-4 border border-emerald-100 bg-emerald-50/40 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <label className="text-xs font-bold text-slate-900">
                  Direct Media URL (Ends with real extension)
                </label>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">
                In-browser streaming (No download forced)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(directUrl, 'direct')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedType === 'direct' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Direct URL</span>
                    </>
                  )}
                </button>

                {/* X / Delete Icon beside Copy URL with Red Hover & Confirmation */}
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

                  {/* Delete Confirmation Popover */}
                  {showDeleteConfirm && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-white border border-red-200 rounded-xl shadow-lg z-20 text-left animate-in fade-in zoom-in-95">
                      <p className="text-xs font-bold text-slate-900 mb-1">Permanently delete?</p>
                      <p className="text-[11px] text-slate-500 mb-2.5">
                        This will remove the file, revoke the URL, and delete the record.
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
                          onClick={async () => {
                            setIsDeleting(true);
                            try {
                              await onDeleteMedia(media.id);
                            } finally {
                              setShowDeleteConfirm(false);
                              setIsDeleting(false);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <a
                  href={directUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Open Directly in Browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => openQr(directUrl, 'Direct Media URL')}
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Show QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Interactive Shareable Player / Viewer Link */}
          <div className="p-4 border border-slate-200 bg-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <label className="text-xs font-bold text-slate-900">
                  Shareable Web Viewer Link (Autoplay Ready)
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={media.playerUrl}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(media.playerUrl, 'player')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  {copiedType === 'player' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPlayer(media.id)}
                  className="p-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
                  title="Open Viewer Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. HTML Embed Snippet */}
          <div className="p-4 border border-slate-200 bg-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-xs font-bold text-slate-900">
                  HTML5 Embed Snippet
                </label>
              </div>
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
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
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
