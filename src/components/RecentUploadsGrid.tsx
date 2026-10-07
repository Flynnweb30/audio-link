import React, { useState } from 'react';
import { 
  Clock, 
  ChevronRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Music, 
  Video, 
  Trash2, 
  Layers 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatRelativeTime, formatExpiryLabel, copyToClipboard } from '../utils/formatters';

interface RecentUploadsGridProps {
  items: MediaItem[];
  activeFilter: 'all' | 'audio' | 'video' | 'image';
  onViewAllHistory: () => void;
  onSelectItem: (item: MediaItem) => void;
  onDeleteItem: (id: string) => void;
}

export const RecentUploadsGrid: React.FC<RecentUploadsGridProps> = ({
  items,
  activeFilter,
  onViewAllHistory,
  onSelectItem,
  onDeleteItem,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  // Filter items matching active tab (or all)
  const filtered = items.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.mediaType === activeFilter;
  });

  if (filtered.length === 0) {
    return null;
  }

  // Show up to 8 recent uploads
  const recentSlice = filtered.slice(0, 8);

  const getSectionTitle = () => {
    if (activeFilter === 'image') return 'Recent free image hosting uploads';
    if (activeFilter === 'audio') return 'Recent free audio streaming uploads';
    if (activeFilter === 'video') return 'Recent free video streaming uploads';
    return 'Recent media conversions';
  };

  const handleCopy = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <section className="w-full space-y-4 pt-2">
      {/* Header matching Image 1: Clock icon + Title on left, "View all history >" on right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{getSectionTitle()}</span>
        </div>

        <button
          type="button"
          onClick={onViewAllHistory}
          className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold inline-flex items-center gap-0.5 cursor-pointer transition-colors"
        >
          <span>View all history</span>
          <ChevronRight className="w-3.5 h-3.5 mt-0.5" />
        </button>
      </div>

      {/* 4-column responsive grid matching Image 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recentSlice.map((item) => {
          const isCopied = copiedId === item.id;
          const expiryInfo = formatExpiryLabel(item.expiresAt);

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col text-left cursor-pointer"
            >
              {/* Card Media Preview Area (Square aspect ratio matching Image 1) */}
              <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-2 border-b border-slate-100">
                {item.mediaType === 'image' ? (
                  <img
                    src={item.directUrl}
                    alt={item.originalName}
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-102 transition-transform duration-200"
                  />
                ) : item.mediaType === 'video' ? (
                  <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center relative">
                    <video
                      src={item.directUrl}
                      preload="metadata"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                        <Video className="w-5 h-5 text-rose-600" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-indigo-50/50 rounded-lg flex flex-col items-center justify-center text-indigo-600 p-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-2xs mb-2">
                      <Music className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      {item.originalName.split('.').pop() || 'AUDIO'}
                    </span>
                  </div>
                )}

                {/* Hover Quick Action Buttons */}
                <div 
                  className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, item.directUrl, item.id)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Copy direct URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <a
                    href={item.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Meta Area matching Image 1 */}
              <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2">
                <div>
                  <h4 
                    className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors"
                    title={item.originalName}
                  >
                    {item.originalName}
                  </h4>
                  
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span className="font-mono">{formatFileSize(item.size)}</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>

                {/* Expiry Pill Badge matching Image 1: Cyan/Sky Blue "Permanent" */}
                <div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md leading-none ${
                    expiryInfo.isPermanent
                      ? 'bg-sky-50 text-sky-600 border border-sky-100'
                      : expiryInfo.isExpired
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {expiryInfo.label}
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