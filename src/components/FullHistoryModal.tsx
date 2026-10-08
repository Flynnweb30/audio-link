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
  Trash2, 
  FileSpreadsheet,
  Edit3,
  FolderInput,
  Plus
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/formatters';

interface FullHistoryModalProps {
  items: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MediaItem) => void;
  onDeleteItem: (item: MediaItem) => void;
  onRenameItem?: (documentId: string, newName: string) => void;
  onMoveItem?: (documentId: string, newFolder: string) => void;
}

export const FullHistoryModal: React.FC<FullHistoryModalProps> = ({
  items,
  isOpen,
  onClose,
  onSelectItem,
  onDeleteItem,
  onRenameItem,
  onMoveItem,
}) => {
  const [activeTab, setActiveTab] = useState<'folders' | 'date'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);

  // Edit / Rename / Move Dialog states
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingItem, setMovingItem] = useState<MediaItem | null>(null);
  const [moveValue, setMoveValue] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Extract distinct folders list
  const distinctFolders = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.folder && i.folder.trim()) set.add(i.folder.trim());
    });
    set.add('public');
    return Array.from(set);
  }, [items]);

  // Group by Date
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
        key = 'today'; label = 'Today'; group = 'recent';
      } else if (isYesterday) {
        key = 'yesterday'; label = 'Yesterday'; group = 'recent';
      } else if (isThisMonth) {
        const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
        key = `${monthShort}_${d.getDate()}`;
        label = `${monthShort} ${d.getDate()}`;
        group = 'thisMonth';
      } else {
        const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
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
        if (!item.originalName?.toLowerCase().includes(q) && !item.filename?.toLowerCase().includes(q) && !item.format?.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (activeTab === 'folders') {
        if (selectedFolder !== 'all') {
          return (item.folder || 'public') === selectedFolder;
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

        if (selectedDateFilter === 'today') return itemDate.getTime() === today.getTime();
        if (selectedDateFilter === 'yesterday') return itemDate.getTime() === yesterday.getTime();

        const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
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
    const allUrls = filteredItems.map((i) => i.downloadURL || i.directUrl).join('\n');
    if (!allUrls) return;
    const ok = await copyToClipboard(allUrls);
    if (ok) {
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2000);
    }
  };

  const handleExportCsv = () => {
    const headers = 'ID,Filename,Type,Size_Bytes,Folder,StoragePath,DownloadURL\n';
    const rows = filteredItems.map((i) => `"${i.id}","${i.originalName}","${i.format}",${i.size},"${i.folder}","${i.storagePath}","${i.downloadURL || i.directUrl}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audiolink_library_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 text-slate-800">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => { setActiveTab('folders'); setSelectedFolder('all'); }}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'folders' ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-400/60' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folders
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('date'); setSelectedDateFilter('all'); }}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'date' ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-400/60' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date
              </button>
            </div>

            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search library..."
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
                >
                  {batchCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{batchCopied ? 'Copied All' : 'Copy All URLs'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
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
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar + Items Table */}
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-48 sm:w-56 border-r border-slate-200 p-3 sm:p-4 bg-slate-50/40 overflow-y-auto shrink-0 select-none">
            {activeTab === 'folders' ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedFolder === 'all' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${selectedFolder === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>All Files</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{items.length}</span>
                </button>

                {distinctFolders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFolder(f)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedFolder === f ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className={`w-4 h-4 ${selectedFolder === f ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="truncate">{f}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {items.filter((i) => (i.folder || 'public') === f).length}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="w-full mt-2 py-1.5 border border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedDateFilter === 'all' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Recent</p>
                    <div className="space-y-0.5">
                      {dateGroups.recent.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDateFilter(d.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedDateFilter === d.key ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">This Month</p>
                    <div className="space-y-0.5">
                      {dateGroups.thisMonth.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDateFilter(d.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedDateFilter === d.key ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
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

          {/* Main Table */}
          <main className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4 sm:px-6">FILENAME</th>
                  <th className="py-3 px-4 text-center">STORAGE</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                  <th className="py-3 px-4 sm:px-6 text-right">UPLOAD TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400">
                      No verified media records in this view.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCopied = copiedId === item.id;
                    const persistentUrl = item.downloadURL || item.directUrl;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectItem(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.mediaType === 'image' ? (
                                <img
                                  src={persistentUrl}
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
                                {item.originalName || item.filename}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {formatFileSize(item.size)} · {item.format} · <span className="text-emerald-600">{item.folder || 'public'}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-block border border-sky-200 bg-sky-50 text-sky-700 rounded-md px-2.5 py-0.5 text-[10px] font-semibold leading-none">
                            Verified
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, persistentUrl, item.id)}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>

                            <button
                              type="button"
                              onClick={() => { setEditingItem(item); setRenameValue(item.originalName || item.filename); }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Rename"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => { setMovingItem(item); setMoveValue(item.folder || 'public'); }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Move Folder"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={persistentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => onDeleteItem(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-right font-mono text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </main>
        </div>

        {/* Rename Dialog */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Rename Media File</h4>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingItem(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRenameItem && renameValue.trim()) {
                      onRenameItem(editingItem.documentId || editingItem.id, renameValue.trim());
                      setEditingItem(null);
                    }
                  }}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move Folder Dialog */}
        {movingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Move to Folder</h4>
              <input
                type="text"
                value={moveValue}
                onChange={(e) => setMoveValue(e.target.value)}
                placeholder="Folder name"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setMovingItem(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    if (onMoveItem && moveValue.trim()) {
                      onMoveItem(movingItem.documentId || movingItem.id, moveValue.trim());
                      setMovingItem(null);
                    }
                  }}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Folder Dialog */}
        {isNewFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">Create New Folder</h4>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Music, Screenshots, Projects"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewFolderOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    if (newFolderName.trim()) {
                      setSelectedFolder(newFolderName.trim());
                      setIsNewFolderOpen(false);
                      setNewFolderName('');
                    }
                  }}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};