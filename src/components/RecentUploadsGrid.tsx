import React, { useState } from 'react';
import { Clock, ArrowRight, Music, Film, Copy, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatRelativeTime, copyToClipboard } from '../utils/formatters';

interface RecentUploadsGridProps {
  items: MediaItem[];
  onOpenPlayer: (id: string) => void;
  onViewAllHistory: () => void;
}

export const RecentUploadsGrid: React.FC<RecentUploadsGridProps> = ({
  items,
  onOpenPlayer,
  onViewAllHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (items.length === 0) return null;

  // Display top recent items in grid
  const recentItems = items.slice(0, 8);

  const handleCopy = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    const success = await copyToClipboard(item.directUrl);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header bar matching Image 1 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Recent free image hosting uploads</span>
        </h2>

        <button
          type="button"
          onClick={onViewAllHistory}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          <span>View all history</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of cards matching Image 1 reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {recentItems.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onOpenPlayer(item.id)}
              className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Card Thumbnail Area */}
              <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {item.mediaType === 'image' ? (
                  <img
                    src={item.directUrl}
                    alt={item.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : item.mediaType === 'video' ? (
                  <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                    <video
                      src={item.directUrl}
                      preload="metadata"
                      muted
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Film className="w-8 h-8 text-white/90 drop-shadow-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      <Music className="w-6 h-6" />
                    </div>
                  </div>
                )}

                {/* Quick copy overlay button */}
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, item)}
                  title="Copy Direct URL"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-xs backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Card Info Area */}
              <div className="p-3 flex flex-col justify-between flex-1 gap-1">
                <p className="text-xs font-semibold text-slate-900 truncate" title={item.originalName}>
                  {item.originalName}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatRelativeTime(item.createdAt)}</span>
                </div>

                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">
                    Permanent
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};