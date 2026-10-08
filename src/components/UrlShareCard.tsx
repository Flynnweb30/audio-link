import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Trash2, 
  Edit3, 
  FolderInput, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X 
} from 'lucide-react';
import { MediaItem } from '../types';
import { 
  formatFileSize, 
  formatDuration, 
  copyToClipboard, 
  generateEmbedCodes 
} from '../utils/formatters';

interface UrlShareCardProps {
  item: MediaItem;
  onOpenQr: () => void;
  onDeleteItem: (item: MediaItem) => void;
  onRenameItem?: (documentId: string, newName: string) => void;
  onMoveItem?: (documentId: string, newFolder: string) => void;
}

export const UrlShareCard: React.FC<UrlShareCardProps> = ({
  item,
  onOpenQr,
  onDeleteItem,
  onRenameItem,
  onMoveItem,
}) => {
  if (!item) return null;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [embedTab, setEmbedTab] = useState<'direct' | 'markdown' | 'html' | 'bbcode'>('direct');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(item.duration || 0);

  // Dialog states for Rename & Move
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(item.originalName || item.filename);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveValue, setMoveValue] = useState(item.folder || 'public');

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const embedCodes = generateEmbedCodes(item);
  const persistentUrl = item.downloadURL || item.directUrl;

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
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onRenameItem && renameValue.trim()) {
      onRenameItem(item.documentId || item.id, renameValue.trim());
      setIsRenameOpen(false);
    }
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onMoveItem && moveValue.trim()) {
      onMoveItem(item.documentId || item.id, moveValue.trim());
      setIsMoveOpen(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            {item.mediaType === 'audio' ? <Music className="w-5 h-5" /> : item.mediaType === 'video' ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate" title={item.originalName || item.filename}>
              {item.originalName || item.filename}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {formatFileSize(item.size)} · {item.format || item.mediaType.toUpperCase()} · Folder: <span className="text-emerald-400">{item.folder || 'public'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => copyUrl('header-copy', persistentUrl)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {copiedKey === 'header-copy' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey === 'header-copy' ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRenameOpen(true)}
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Rename File"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsMoveOpen(true)}
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Move to Folder"
          >
            <FolderInput className="w-4 h-4" />
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
            href={persistentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => onDeleteItem(item)}
            className="p-2 bg-slate-700/80 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Delete File"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Preview Section */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/70 p-4">
        {item.mediaType === 'audio' && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={persistentUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
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
                  max={duration > 0 ? duration : 100}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    if (audioRef.current) audioRef.current.currentTime = val;
                  }}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {item.mediaType === 'video' && (
          <div className="rounded-xl overflow-hidden bg-black max-h-80 flex items-center justify-center">
            <video src={persistentUrl} controls className="max-h-80 w-auto max-w-full rounded-xl" preload="metadata" />
          </div>
        )}

        {item.mediaType === 'image' && (
          <div className="rounded-xl overflow-hidden bg-slate-950 max-h-80 flex items-center justify-center p-2">
            <img src={persistentUrl} alt={item.originalName} className="max-h-76 w-auto max-w-full object-contain rounded-lg" loading="lazy" />
          </div>
        )}
      </div>

      {/* Direct URL, Markdown, HTML, BBCode Tabs */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setEmbedTab('direct')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                embedTab === 'direct' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct URL
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('markdown')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                embedTab === 'markdown' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('html')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                embedTab === 'html' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('bbcode')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                embedTab === 'bbcode' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BBCode
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyUrl(embedTab, embedCodes[embedTab])}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            {copiedKey === embedTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === embedTab ? 'Copied' : `Copy ${embedTab.toUpperCase()}`}</span>
          </button>
        </div>

        <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto select-all">
          <code>{embedCodes[embedTab]}</code>
        </pre>
      </div>

      {/* Rename Dialog */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form onSubmit={handleRenameSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Rename Media Record</h4>
              <button type="button" onClick={() => setIsRenameOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Filename"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsRenameOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Folder Dialog */}
      {isMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form onSubmit={handleMoveSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Move to Folder</h4>
              <button type="button" onClick={() => setIsMoveOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={moveValue}
              onChange={(e) => setMoveValue(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Folder name (e.g. public, Music, Projects)"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsMoveOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold">
                Move
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};