import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Trash2, 
  Music, 
  Film, 
  Image as ImageIcon,
  ArrowLeft,
  FileQuestion,
  X
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatUploadTime, copyToClipboard } from '../utils/formatters';

interface MediaHistoryViewProps {
  items: MediaItem[];
  onOpenPlayer: (id: string) => void;
  onDeleteMedia: (id: string) => void;
  onBackToStudio: () => void;
  onRefresh: () => void;
}

export const MediaHistoryView: React.FC<MediaHistoryViewProps> = ({
  items,
  onOpenPlayer,
  onDeleteMedia,
  onBackToStudio,
  onRefresh,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'folders' | 'date'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const dateBuckets = useMemo(() => {
    const buckets: {
      recent: { label: string; key: string; count: number }[];
      thisMonth: { label: string; key: string; count: number }[];
      older: { label: string; key: string; count: number }[];
    } = {
      recent: [],
      thisMonth: [],
      older: [],
    };

    const dateMap = new Map<string, { label: string; group: 'recent' | 'thisMonth' | 'older'; count: number }>();
    const now = new Date();

    items.forEach((item) => {
      const d = new Date(item.createdAt);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      let key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      let label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      let group: 'recent' | 'thisMonth' | 'older' = 'thisMonth';

      if (isToday) {
        label = 'Today';
        group = 'recent';
      } else if (isYesterday) {
        label = 'Yesterday';
        group = 'recent';
      } else {
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 4) {
          group = 'recent';
        } else if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          group = 'thisMonth';
        } else {
          group = 'older';
          label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      }

      if (dateMap.has(key)) {
        dateMap.get(key)!.count += 1;
      } else {
        dateMap.set(key, { label, group, count: 1 });
      }
    });

    dateMap.forEach((val, key) => {
      if (val.group === 'recent') {
        buckets.recent.push({ label: val.label, key, count: val.count });
      } else if (val.group === 'thisMonth') {
        buckets.thisMonth.push({ label: val.label, key, count: val.count });
      } else {
        buckets.older.push({ label: val.label, key, count: val.count });
      }
    });

    return buckets;
  }, [items]);

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (activeSidebarTab === 'folders') {
        if (selectedFolder === 'all') return true;
        if (selectedFolder === 'public') return (item.folder || 'public') === 'public';
        return item.mediaType === selectedFolder;
      } else {
        if (selectedDateFilter === 'all') return true;
        const d = new Date(item.createdAt);
        const itemKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        return itemKey === selectedDateFilter;
      }
    });
  }, [items, activeSidebarTab, selectedFolder, selectedDateFilter]);

  const handleCopy = async (item: MediaItem) => {
    const success = await copyToClipboard(item.directUrl);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleBatchCopy = async () => {
    if (displayedItems.length === 0) return;
    const allUrls = displayedItems.map((i) => i.directUrl).join('\n');
    await copyToClipboard(allUrls);
    alert(`Copied ${displayedItems.length} direct streaming URLs to clipboard!`);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top action row */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Media</span>
        </button>

        <div className="flex items-center gap-3">
          {displayedItems.length > 0 && (
            <button
              onClick={handleBatchCopy}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy All URLs ({displayedItems.length})</span>
            </button>
          )}

          <span className="text-xs text-slate-500 font-medium">
            Total files: <strong className="text-slate-900">{items.length}</strong>
          </span>
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[600px]">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 border-r border-slate-100 p-4 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSidebarTab('folders');
                setSelectedFolder('all');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'folders'
                  ? 'border border-emerald-400 bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Folders
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSidebarTab('date');
                setSelectedDateFilter('all');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'date'
                  ? 'border border-emerald-400 bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Date
            </button>
          </div>

          {activeSidebarTab === 'folders' && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setSelectedFolder('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'all'
                    ? 'border border-emerald-400 bg-emerald-50/60 text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-600" />
                  <span>All Files</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">{items.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFolder('public')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'public'
                    ? 'border border-emerald-400 bg-emerald-50/60 text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-slate-400" />
                  <span>public</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {items.filter((i) => (i.folder || 'public') === 'public').length}
                </span>
              </button>
            </div>
          )}

          {activeSidebarTab === 'date' && (
            <div className="space-y-4 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDateFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all ${
                  selectedDateFilter === 'all'
                    ? 'border border-emerald-400 bg-emerald-50/60 text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>All Dates</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">{items.length}</span>
              </button>

              {dateBuckets.recent.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">RECENT</p>
                  {dateBuckets.recent.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setSelectedDateFilter(b.key)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                        selectedDateFilter === b.key
                          ? 'border border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{b.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {dateBuckets.thisMonth.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">THIS MONTH</p>
                  {dateBuckets.thisMonth.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setSelectedDateFilter(b.key)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                        selectedDateFilter === b.key
                          ? 'border border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{b.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {dateBuckets.older.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">OLDER</p>
                  {dateBuckets.older.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setSelectedDateFilter(b.key)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                        selectedDateFilter === b.key
                          ? 'border border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{b.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right Main Table */}
        <main className="md:col-span-9 overflow-x-auto">
          {displayedItems.length === 0 ? (
            <div className="py-20 text-center">
              <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">No media items in this selection</p>
              <p className="text-xs text-slate-400 mt-1">Upload an audio, video or image file to start your permanent registry.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">FILENAME</th>
                  <th className="py-3 px-4">EXPIRY</th>
                  <th className="py-3 px-4">ACTIONS</th>
                  <th className="py-3 px-4 text-right">UPLOAD TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedItems.map((item) => {
                  const isCopied = copiedId === item.id;
                  const isDeleting = deleteConfirmId === item.id;
                  const ext = item.filename.split('.').pop()?.toUpperCase() || 'FILE';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => onOpenPlayer(item.id)}
                            className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            {item.mediaType === 'image' ? (
                              <img src={item.directUrl} alt="" className="w-full h-full object-cover" />
                            ) : item.mediaType === 'video' ? (
                              <Film className="w-4 h-4 text-slate-500" />
                            ) : (
                              <Music className="w-4 h-4 text-slate-500" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              onClick={() => onOpenPlayer(item.id)}
                              className="font-semibold text-slate-900 truncate hover:text-emerald-600 cursor-pointer max-w-xs sm:max-w-md"
                              title={item.originalName}
                            >
                              {item.originalName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatFileSize(item.size)} • {ext}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">
                          Permanent
                        </span>
                      </td>

                      {/* ACTIONS Column: Copy & Red X Delete */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(item)}
                            className="px-3.5 py-1 rounded border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-medium text-xs shadow-2xs hover:bg-slate-50 transition-colors"
                          >
                            {isCopied ? <span className="text-emerald-600 font-bold">Copied!</span> : 'Copy'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenPlayer(item.id)}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Open Player"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`/api/media/${item.id}/download`}
                            download={item.originalName}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Red X/Delete Button with Confirmation */}
                          {!isDeleting ? (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete permanently"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-white border border-red-300 p-0.5 rounded-lg shadow-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteMedia(item.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-0.5 text-slate-400 text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatUploadTime(item.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
};