import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface QrCodeModalProps {
  url: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  url,
  title,
  subtitle,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUri) => setQrDataUrl(dataUri))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-md"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 mb-2">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex justify-center my-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="QR Code for Audio URL" 
              className="w-56 h-56 rounded-md shadow-xs" 
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
              Generating QR Code...
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono select-all truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-3">
          Scan with your phone camera to test playback instantly on iOS or Android.
        </p>
      </div>
    </div>
  );
};