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
  Edit3, 
  FolderInput,
  FileSpreadsheet,
  Image as ImageIcon 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatRelativeTime, copyToClipboard } from '../utils/formatters';
import { renameMediaRecord, moveMediaRecord } from '../firebase/syncService';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Rename and Move Modals
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [newName, setNewName] = useState('');
  const [movingItem, setMovingItem] = useState<MediaItem | null>(null);
  const [targetFolder, setTargetFolder] = useState('');

  const folders = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.folder || 'public'));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.filename.toLowerCase().includes(q) && !(item.format || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeTab === 'folders' && selectedFolder !== 'all') {
        return (item.folder || 'public') === selectedFolder;
      }
      return true;
    });
  }, [items, activeTab, selectedFolder, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const submitRename = async () => {
    if (!editingItem || !newName.trim()) return;
    await renameMediaRecord(editingItem.documentId || editingItem.id, newName.trim());
    setEditingItem(null);
  };

  const submitMove = async () => {
    if (!movingItem || !targetFolder.trim()) return;
    await moveMediaRecord(movingItem.documentId || movingItem.id, targetFolder.trim());
    setMovingItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 text-slate-800">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => { setActiveTab('folders'); setSelectedFolder('all'); }}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'folders'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-400/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'date'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-400/60'
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
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Folders Sidebar */}
          <aside className="w-48 sm:w-56 border-r border-slate-200 p-3 sm:p-4 bg-slate-50/40 overflow-y-auto shrink-0 select-none space-y-1.5">
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
                <Folder className="w-4 h-4 text-emerald-600" />
                <span>All Files</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">{items.length}</span>
            </button>

            {folders.map((fld) => (
              <button
                key={fld}
                type="button"
                onClick={() => setSelectedFolder(fld)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  selectedFolder === fld
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-400" />
                  <span>{fld}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {items.filter((i) => (i.folder || 'public') === fld).length}
                </span>
              </button>
            ))}
          </aside>

          {/* Table */}
          <main className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4 sm:px-6">FILENAME</th>
                  <th className="py-3 px-4 text-center">STORAGE</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                  <th className="py-3 px-4 sm:px-6 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400">
                      No media files stored in this folder.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCopied = copiedId === (item.documentId || item.id);
                    const directUrl = item.downloadURL || item.directUrl;

                    return (
                      <tr
                        key={item.documentId || item.id}
                        onClick={() => onSelectItem(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.mediaType === 'image' ? (
                                <img src={directUrl} alt="" className="w-full h-full object-cover" />
                              ) : item.mediaType === 'video' ? (
                                <Video className="w-4 h-4 text-slate-700" />
                              ) : (
                                <Music className="w-4 h-4 text-indigo-600" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md group-hover:text-emerald-700">
                                {item.filename}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {formatFileSize(item.size)} · {item.format}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-block border rounded-md px-2.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-600 border-sky-100">
                            Firebase Cloud
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, directUrl, item.documentId || item.id)}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                              }`}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>

                            <button
                              type="button"
                              onClick={() => { setEditingItem(item); setNewName(item.filename); }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Rename"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => { setMovingItem(item); setTargetFolder(item.folder || 'public'); }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Move Folder"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.documentId || item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                              title="Delete File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={directUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-right font-mono text-[11px] text-slate-400">
                          {formatRelativeTime(item.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </main>
        </div>
      </div>

      {/* Rename Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-900">Rename Media File</h4>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRename}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Folder Modal */}
      {movingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-900">Move to Folder</h4>
            <input
              type="text"
              placeholder="e.g. public, work, archive"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMovingItem(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitMove}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};