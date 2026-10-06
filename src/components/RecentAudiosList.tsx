import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Trash2, 
  Music, 
  Search, 
  Radio, 
  FileAudio,
  QrCode
} from 'lucide-react';
import { AudioItem } from '../types';
import { formatFileSize, formatRelativeTime, copyToClipboard } from '../utils/formatters';
import { QrCodeModal } from './QrCodeModal';

interface RecentAudiosListProps {
  items: AudioItem[];
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalItem, setQrModalItem] = useState<AudioItem | null>(null);

  const filteredItems = items.filter((item) =>
    item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mimeType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyDirectUrl = async (item: AudioItem) => {
    const url = item.directUrl || (item as any).directAudioUrl || '';
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header and Search */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Stored Audio Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All stored audio files with direct permanent stream URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audio by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 sm:w-60"
            />
          </div>
          <button
            onClick={onRefresh}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center">
          <FileAudio className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No audio files found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchQuery ? 'Try matching another search term.' : 'Upload an audio file above to create your first link.'}
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
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 flex items-center justify-center shrink-0 transition-colors group"
                    title="Open Playback View"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p 
                      onClick={() => onOpenPlayer(item.id)}
                      className="text-sm font-semibold text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                    >
                      {item.originalName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{item.mimeType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatFileSize(item.size)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyDirectUrl(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Copy Direct Audio Stream URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Direct URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPlayer(item.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open Autoplay Player"
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
                    href={`/api/audio/${item.id}/download`}
                    download={item.originalName}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Download audio file"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onDeleteAudio(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete audio file"
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
          title="Shareable Player QR"
          subtitle={qrModalItem.originalName}
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </div>
  );
};
