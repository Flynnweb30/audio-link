import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { copyToClipboard } from '../utils/formatters';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      })
        .then(setDataUrl)
        .catch(console.error);
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Media QR Code</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {dataUrl ? (
          <div className="bg-white p-4 rounded-2xl inline-block shadow-md">
            <img src={dataUrl} alt="QR Code" className="w-52 h-52 mx-auto" />
          </div>
        ) : (
          <div className="w-52 h-52 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
            Generating QR...
          </div>
        )}

        <p className="text-xs text-slate-400 truncate font-mono px-2" title={title || url}>
          {title || url}
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>

          {dataUrl && (
            <a
              href={dataUrl}
              download="audiolink-qr.png"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};