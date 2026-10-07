import React, { useState } from 'react';
import { History, ChevronRight, Music, Video, Copy, Check, ExternalLink } from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/formatters';

interface RecentUploadsGridProps {
  items: MediaItem[];
  currentTab: 'all' | 'audio' | 'video' | 'image';
  onViewAllHistory: () => void;
  onSelectItem: (item: MediaItem) => void;
}

export const RecentUploadsGrid: React.FC<RecentUploadsGridProps> = ({
  items,
  currentTab,
  onViewAllHistory,
  onSelectItem,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const filteredItems = items.filter((item) => {
    if (currentTab === 'all') return true;
    return item.mediaType === currentTab;
  });

  const displayItems = filteredItems.slice(0, 8);
  if (displayItems.length === 0) return null;

  const getSectionTitle = () => {
    if (currentTab === 'image') return 'Recent free image hosting uploads';
    if (currentTab === 'audio') return 'Recent audio streaming uploads';
    if (currentTab === 'video') return 'Recent video streaming uploads';
    return 'Recent media hosting uploads';
  };

  const handleCopy = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return 'Yesterday';
    } catch {
      return 'Just now';
    }
  };

  return (
    <section className="w-full mt-10 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {getSectionTitle()}
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAllHistory}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>View all history</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {displayItems.map((item) => {
          const isCopied = copiedId === item.id;
          const isImage = item.mediaType === 'image';
          const isAudio = item.mediaType === 'audio';
          const isVideo = item.mediaType === 'video';

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-emerald-500/60 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col group text-slate-900"
            >
              {/* Media Preview Box matching Reference Image 1 */}
              <div className="w-full aspect-square bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 relative p-2">
                {isImage ? (
                  <img
                    src={item.directUrl}
                    alt={item.originalName}
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : isVideo ? (
                  <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-rose-400">
                    <Video className="w-10 h-10 transition-transform group-hover:scale-110" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-emerald-400">
                    <Music className="w-10 h-10 transition-transform group-hover:scale-110" />
                  </div>
                )}

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, item.directUrl, item.id)}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs shadow-md transition-all cursor-pointer"
                    title="Copy direct URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={item.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs shadow-md transition-all cursor-pointer"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Card Meta matching Reference Image 1 */}
              <div className="p-3 flex flex-col justify-between flex-1 space-y-1.5 bg-white">
                <p className="text-xs font-semibold text-slate-800 truncate" title={item.originalName}>
                  {item.originalName}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{getRelativeTime(item.createdAt)}</span>
                </div>

                <div className="pt-0.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                    item.expiresAt
                      ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                      : 'bg-sky-50 text-sky-600 border border-sky-100'
                  }`}>
                    {item.expiresAt ? '48h Guest' : 'Permanent'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};