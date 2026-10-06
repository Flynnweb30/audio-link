import React from 'react';
import { History, ArrowRight, Play, Music, Video, Image as ImageIcon } from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatRelativeTime } from '../utils/formatters';

interface RecentUploadsGridProps {
  items: MediaItem[];
  onOpenHistory: () => void;
  onSelectItem: (item: MediaItem) => void;
}

export const RecentUploadsGrid: React.FC<RecentUploadsGridProps> = ({
  items,
  onOpenHistory,
  onSelectItem,
}) => {
  // Show the most recent 8 items like in the screenshot
  const displayItems = items.slice(0, 8);

  if (displayItems.length === 0) return null;

  return (
    <section className="space-y-4 pt-4">
      {/* Header matching Image 1: Clock icon + "Recent free image hosting uploads" + "View all history >" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Recent media hosting uploads
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenHistory}
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
        >
          <span>View all history</span>
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>

      {/* 4-column Grid matching Image 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="group bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            {/* Thumbnail Preview Area */}
            <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden relative mb-2.5 flex items-center justify-center border border-slate-100">
              {item.mediaType === 'image' ? (
                <img
                  src={item.directUrl}
                  alt={item.originalName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to stylized SVG placeholder if thumbnail fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : item.mediaType === 'video' ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center relative group-hover:bg-slate-800 transition-colors">
                  <video
                    src={item.directUrl}
                    className="w-full h-full object-cover opacity-80"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-sm">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-3 relative group-hover:scale-105 transition-transform duration-200">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1">
                    <Music className="w-5 h-5 text-indigo-300" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                    Audio Track
                  </span>
                </div>
              )}
            </div>

            {/* Meta details matching Image 1 */}
            <div className="space-y-1">
              <p
                className="text-xs font-semibold text-slate-900 truncate group-hover:text-teal-600 transition-colors"
                title={item.originalName}
              >
                {item.originalName}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono tabular-nums">{formatFileSize(item.size)}</span>
                <span>{formatRelativeTime(item.createdAt)}</span>
              </div>

              {/* Light blue pill badge matching screenshot */}
              <div className="pt-0.5">
                <span className="inline-block bg-sky-50 text-sky-600 border border-sky-100 rounded-md px-2 py-0.5 text-[10px] font-medium leading-none">
                  Permanent
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
