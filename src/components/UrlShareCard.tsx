import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Trash2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Code2, 
  Download, 
  X 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatDuration, copyToClipboard } from '../utils/formatters';

interface UrlShareCardProps {
  item: MediaItem;
  onOpenQr: () => void;
  onDeleteItem: (id: string) => void;
}

export const UrlShareCard: React.FC<UrlShareCardProps> = ({
  item,
  onOpenQr,
  onDeleteItem,
}) => {
  if (!item) return null;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [mediaDuration, setMediaDuration] = useState<number>(() => {
    return Number(item?.duration ?? item?.metadata?.duration ?? 0);
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [embedTab, setEmbedTab] = useState<'direct' | 'html' | 'markdown'>('direct');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setMediaDuration(Number(item?.duration ?? item?.metadata?.duration ?? 0));
    setShowDeleteConfirm(false);
  }, [item?.id]);

  const copyUrl = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.warn('Audio playback error:', e));
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio && isFinite(audio.currentTime)) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio && isFinite(audio.duration) && !isNaN(audio.duration)) {
      setMediaDuration(audio.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const directUrl = item.directUrl || '';
  const playerUrl = item.playerUrl || directUrl;
  const isAudio = item.mediaType === 'audio';
  const isVideo = item.mediaType === 'video';
  const isImage = item.mediaType === 'image';

  const embedCodes = {
    direct: directUrl,
    html: isAudio
      ? `<audio controls src="${directUrl}"></audio>`
      : isVideo
      ? `<video controls src="${directUrl}"></video>`
      : `<img src="${directUrl}" alt="${item.originalName || 'media'}" />`,
    markdown: isImage
      ? `![${item.originalName || 'media'}](${directUrl})`
      : `[${item.originalName || 'Stream Media'}](${directUrl})`,
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Top Header with prominent Copy & "X" Delete icons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            {isAudio ? <Music className="w-5 h-5" /> : isVideo ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate" title={item.originalName}>
              {item.originalName}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {formatFileSize(item.size)} · {item.mediaType.toUpperCase()}
              {mediaDuration > 0 && ` · ${formatDuration(mediaDuration)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => copyUrl('header-copy', directUrl)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Copy Direct URL"
          >
            {copiedKey === 'header-copy' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey === 'header-copy' ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenQr}
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Generate QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <a
            href={playerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors"
            title="Open Player in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* "X" Delete Icon with Confirmation */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showDeleteConfirm ? 'bg-rose-600 text-white' : 'bg-slate-700/80 hover:bg-rose-600 text-slate-300 hover:text-white'
              }`}
              title="Delete File (X)"
            >
              <X className="w-4 h-4" />
            </button>

            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-rose-500/40 rounded-2xl p-3 shadow-2xl z-30 text-left animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs mb-1">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete This Media?</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  This revokes the direct link and removes it permanently from your storage.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      onDeleteItem(item.id);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Media Preview Section */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/70 p-4">
        {isAudio && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={directUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              preload="metadata"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min="0"
                  max={mediaDuration > 0 ? mediaDuration : 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(mediaDuration)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {isVideo && (
          <div className="rounded-xl overflow-hidden bg-black max-h-80 flex items-center justify-center">
            <video
              src={directUrl}
              controls
              className="max-h-80 w-auto max-w-full rounded-xl"
              preload="metadata"
            />
          </div>
        )}

        {isImage && (
          <div className="rounded-xl overflow-hidden bg-slate-950 max-h-80 flex items-center justify-center p-2">
            <img
              src={directUrl}
              alt={item.originalName || 'Preview'}
              className="max-h-76 w-auto max-w-full object-contain rounded-lg"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Direct URL Box */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Direct Streamable URL (Permanent CDN)</span>
          <span className="text-[10px] text-emerald-400 font-mono">HTTP 206 Byte-Range Enabled</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={directUrl}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-300 truncate focus:outline-none focus:ring-1 focus:ring-emerald-500 select-all"
          />
          <button
            type="button"
            onClick={() => copyUrl('direct-box', directUrl)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            {copiedKey === 'direct-box' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey === 'direct-box' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Embed Code Snippets */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setEmbedTab('direct')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                embedTab === 'direct' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Link
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('html')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                embedTab === 'html' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HTML Embed
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('markdown')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                embedTab === 'markdown' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Markdown
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyUrl('embed-snippet', embedCodes[embedTab])}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === 'embed-snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'embed-snippet' ? 'Copied Snippet' : 'Copy Snippet'}</span>
          </button>
        </div>

        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto select-all">
          <code>{embedCodes[embedTab]}</code>
        </pre>
      </div>
    </div>
  );
};