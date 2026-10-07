import React, { useState, useMemo } from 'react';
import { 
  X, 
  Folder, 
  FolderOpen, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  FileSpreadsheet 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/formatters';

interface FullHistoryModalProps {
  items: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MediaItem) => void;
  onDeleteItem: (id: string) => void;
}

export const FullHistoryModal: React.FC<FullHistoryModalProps> = ({
  items,
  isOpen,
  onClose,
  onSelectItem,
  onDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<'folders' | 'date'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewCopied, setPreviewCopied] = useState(false);
  const [previewDeleteConfirm, setPreviewDeleteConfirm] = useState(false);

  const dateGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const recent: { label: string; key: string; count: number }[] = [];
    const thisMonth: { label: string; key: string; count: number }[] = [];
    const older: { label: string; key: string; count: number }[] = [];

    const map = new Map<string, { label: string; group: 'recent' | 'thisMonth' | 'older'; count: number }>();

    items.forEach((item) => {
      const d = new Date(item.createdAt);
      const itemDate = new Date(d);
      itemDate.setHours(0, 0, 0, 0);

      const isToday = itemDate.getTime() === today.getTime();
      const isYesterday = itemDate.getTime() === yesterday.getTime();
      const isThisMonth = itemDate >= startOfMonth && !isToday && !isYesterday;

      let key = '';
      let label = '';
      let group: 'recent' | 'thisMonth' | 'older' = 'older';

      if (isToday) {
        key = 'today';
        label = 'Today';
        group = 'recent';
      } else if (isYesterday) {
        key = 'yesterday';
        label = 'Yesterday';
        group = 'recent';
      } else if (isThisMonth) {
        const monthShort = d.toLocaleDateString(undefined, { month: 'short' });
        key = `${monthShort}_${d.getDate()}`;
        label = `${monthShort} ${d.getDate()}`;
        group = 'thisMonth';
      } else {
        const monthShort = d.toLocaleDateString(undefined, { month: 'short' });
        key = `${monthShort}_${d.getDate()}_${d.getFullYear()}`;
        label = `${monthShort} ${d.getDate()}, ${d.getFullYear()}`;
        group = 'older';
      }

      if (!map.has(key)) {
        map.set(key, { label, group, count: 1 });
      } else {
        map.get(key)!.count += 1;
      }
    });

    map.forEach((val, key) => {
      if (val.group === 'recent') recent.push({ label: val.label, key, count: val.count });
      else if (val.group === 'thisMonth') thisMonth.push({ label: val.label, key, count: val.count });
      else older.push({ label: val.label, key, count: val.count });
    });

    return { recent, thisMonth, older };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.originalName.toLowerCase().includes(q) && !item.mimeType.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (activeTab === 'folders') {
        if (selectedFolder === 'public') {
          return item.folder === 'public';
        }
        return true;
      } else {
        if (selectedDateFilter === 'all') return true;

        const d = new Date(item.createdAt);
        const itemDate = new Date(d);
        itemDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (selectedDateFilter === 'today') {
          return itemDate.getTime() === today.getTime();
        }
        if (selectedDateFilter === 'yesterday') {
          return itemDate.getTime() === yesterday.getTime();
        }

        const monthShort = d.toLocaleDateString(undefined, { month: 'short' });
        const keyThisMonth = `${monthShort}_${d.getDate()}`;
        const keyOlder = `${monthShort}_${d.getDate()}_${d.getFullYear()}`;

        return selectedDateFilter === keyThisMonth || selectedDateFilter === keyOlder;
      }
    });
  }, [items, activeTab, selectedFolder, selectedDateFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleBatchCopyAll = async () => {
    const allUrls = filteredItems.map((i) => i.directUrl).join('\n');
    if (!allUrls) return;
    const ok = await copyToClipboard(allUrls);
    if (ok) {
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2000);
    }
  };

  const handleExportCsv = () => {
    const headers = 'ID,Filename,Type,Size_Bytes,Created_At,Direct_URL\n';
    const rows = filteredItems
      .map(
        (i) =>
          `"${i.id}","${i.originalName}","${i.mediaType}",${i.size},"${i.createdAt}","${i.directUrl}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audiolink_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatUploadTimeCol = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      if (isToday) return timeStr;
      if (isYesterday) return `Yesterday ${timeStr}`;
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('folders');
                  setSelectedFolder('all');
                }}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'folders'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folders
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('date');
                  setSelectedDateFilter('all');
                }}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'date'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date
              </button>
            </div>

            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleBatchCopyAll}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy all filtered URLs"
                >
                  {batchCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{batchCopied ? 'Copied All' : 'Copy All URLs'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title="Export to CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close History"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-48 sm:w-56 border-r border-slate-200 p-3 sm:p-4 bg-slate-50/40 overflow-y-auto shrink-0 select-none">
            {activeTab === 'folders' ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedFolder === 'all'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${selectedFolder === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>All Files</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{items.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFolder('public')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedFolder === 'public'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-4 h-4 ${selectedFolder === 'public' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>public</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {items.filter((i) => i.folder === 'public').length}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedDateFilter === 'all'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${selectedDateFilter === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>All Dates</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{items.length}</span>
                </button>

                {dateGroups.recent.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                      Recent
                    </p>
                    <div className="space-y-0.5">
                      {dateGroups.recent.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDateFilter(d.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedDateFilter === d.key
                              ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{d.label}</span>
                          <span className="font-mono text-[11px] text-slate-400">{d.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {dateGroups.thisMonth.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                      This Month
                    </p>
                    <div className="space-y-0.5">
                      {dateGroups.thisMonth.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDateFilter(d.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedDateFilter === d.key
                              ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{d.label}</span>
                          <span className="font-mono text-[11px] text-slate-400">{d.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>

          <main className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Filename</th>
                  <th className="py-3 px-4 text-center">Expiry</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Upload Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400">
                      No media files stored yet.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCopied = copiedId === item.id;
                    const isConfirmingDelete = deleteConfirmId === item.id;
                    const ext = item.originalName.split('.').pop()?.toUpperCase() || 'FILE';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setPreviewItem(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.mediaType === 'image' ? (
                                <img
                                  src={item.directUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : item.mediaType === 'video' ? (
                                <Video className="w-4 h-4 text-slate-700" />
                              ) : (
                                <Music className="w-4 h-4 text-indigo-600" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md group-hover:text-emerald-700 transition-colors">
                                {item.originalName}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {formatFileSize(item.size)} · {ext}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-block bg-sky-50 text-sky-600 border border-sky-100 rounded-md px-2.5 py-0.5 text-[10px] font-medium leading-none">
                            {item.expiresAt ? 'Expiring' : 'Permanent'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, item.directUrl, item.id)}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>

                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmId(null);
                                    onDeleteItem(item.id);
                                  }}
                                  className="px-2 py-0.5 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Delete File (X)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onSelectItem(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              title="Open Viewer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-right font-mono text-[11px] text-slate-400">
                          {formatUploadTimeCol(item.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </main>
        </div>

        {previewItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setPreviewItem(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-lg w-[95vw] sm:w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {previewItem.mediaType} Preview
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatFileSize(previewItem.size)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-1" title={previewItem.originalName}>
                    {previewItem.originalName}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 relative">
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await copyToClipboard(previewItem.directUrl);
                      if (success) {
                        setPreviewCopied(true);
                        setTimeout(() => setPreviewCopied(false), 2000);
                      }
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
                    title="Copy direct URL"
                  >
                    {previewCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] hidden sm:inline text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-200" />
                        <span className="text-[11px] hidden sm:inline">Copy URL</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPreviewDeleteConfirm(!previewDeleteConfirm)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer active:scale-95 flex items-center gap-1 ${
                        previewDeleteConfirm
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white'
                      }`}
                      title="Delete media (X)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {previewDeleteConfirm && (
                      <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-white border border-red-200 rounded-xl shadow-2xl z-40 text-left animate-in fade-in zoom-in-95 text-slate-900">
                        <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs mb-1">
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span>Delete Media File?</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                          Permanently deletes stored media, revokes the direct URL, and removes history.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDeleteConfirm(false)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const id = previewItem.id;
                              setPreviewItem(null);
                              setPreviewDeleteConfirm(false);
                              onDeleteItem(id);
                            }}
                            className="px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewItem(null);
                      setPreviewDeleteConfirm(false);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Close Preview (X)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto flex-1 flex flex-col justify-center items-center bg-slate-50 min-h-[200px]">
                {previewItem.mediaType === 'image' ? (
                  <img
                    src={previewItem.directUrl || (previewItem.filename ? `/media/${encodeURIComponent(previewItem.filename)}` : '')}
                    alt={previewItem.originalName}
                    className="max-h-72 w-auto object-contain rounded-xl shadow-xs border border-slate-200 bg-white"
                  />
                ) : previewItem.mediaType === 'video' ? (
                  <video
                    src={previewItem.directUrl || (previewItem.filename ? `/media/${encodeURIComponent(previewItem.filename)}` : '')}
                    controls
                    className="max-h-72 w-full rounded-xl bg-black shadow-xs"
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <Music className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{previewItem.originalName}</p>
                    <audio
                      src={previewItem.directUrl || (previewItem.filename ? `/media/${encodeURIComponent(previewItem.filename)}` : '')}
                      controls
                      className="w-full"
                      preload="metadata"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    readOnly
                    value={previewItem.directUrl}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-700 flex-1 truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await copyToClipboard(previewItem.directUrl);
                      if (success) {
                        setPreviewCopied(true);
                        setTimeout(() => setPreviewCopied(false), 2000);
                      }
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1 font-semibold cursor-pointer"
                    title="Copy direct URL"
                  >
                    {previewCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[11px]">{previewCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const item = previewItem;
                      setPreviewItem(null);
                      onSelectItem(item);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Open in Studio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
