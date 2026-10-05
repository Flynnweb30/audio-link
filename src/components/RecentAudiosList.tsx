import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Trash2, 
  Search, 
  FileAudio,
  QrCode,
  Music,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatFileSize, formatRelativeTime, copyToClipboard } from '../utils/formatters';
import { QrCodeModal } from './QrCodeModal';

interface RecentAudiosListProps {
  items: MediaItem[];
  onOpenPlayer: (id: string) => void;
  onDeleteAudio: (id: string) => void;
  onRefresh: () => void;
}

export const RecentAudiosList: React.FC<RecentAudiosListProps> = ({
  items,
  onOpenPlayer,
  onDeleteAudio,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video' | 'image'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalItem, setQrModalItem] = useState<MediaItem | null>(null);

  const filteredItems = items
    .filter((item) => filterType === 'all' || item.mediaType === filterType)
    .filter((item) =>
      item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mimeType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleCopyDirectUrl = async (item: MediaItem) => {
    const success = await copyToClipboard(item.directUrl);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Stored Media Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active audio, video, and image files with direct permanent stream URLs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterType('audio')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'audio' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Audio ({items.filter(i => i.mediaType === 'audio').length})
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'video' ? 'bg-white text-violet-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Video ({items.filter(i => i.mediaType === 'video').length})
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'image' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Image ({items.filter(i => i.mediaType === 'image').length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 w-40 sm:w-52"
            />
          </div>

          <button
            onClick={onRefresh}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-12 text-center">
          <FileAudio className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No media items found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchQuery ? 'Try matching another search query.' : 'Upload an audio, video, or image file to generate your first link.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => onOpenPlayer(item.id)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 flex items-center justify-center shrink-0 transition-colors group"
                    title="Open Playback View"
                  >
                    {item.mediaType === 'audio' ? (
                      <Music className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    ) : item.mediaType === 'video' ? (
                      <Film className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    ) : (
                      <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p 
                      onClick={() => onOpenPlayer(item.id)}
                      className="text-sm font-semibold text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                    >
                      {item.originalName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 bg-slate-100 rounded">
                        {item.mediaType}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{item.mimeType}</span>
                      <span>•</span>
                      <span className="font-mono tabular-nums">{formatFileSize(item.size)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyDirectUrl(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors border ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Copy Direct URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Direct URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPlayer(item.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open Play/Preview"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrModalItem(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Show Mobile QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <a
                    href={`/api/media/${item.id}/download`}
                    download={item.originalName}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Download media file"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onDeleteAudio(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete media file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrModalItem && (
        <QrCodeModal
          url={qrModalItem.playerUrl}
          title="Shareable Media QR"
          subtitle={qrModalItem.originalName}
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </div>
  );
};