import React, { useState } from 'react';
import { X, Copy, Check, Code2, Terminal } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface ApiAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiAccessModal: React.FC<ApiAccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const curlSnippet = `curl -X POST "${window.location.origin}/api/upload" \\
  -F "file=@your_audio.mp3" \\
  -H "x-user-id: my_app_user"`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(curlSnippet);
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
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-left space-y-4 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>Developer REST API</span>
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

        <p className="text-xs text-slate-400">
          Upload media directly via HTTP multipart POST to generate direct streamable URLs programmatically.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold">
              <Terminal className="w-3.5 h-3.5" /> cURL Example
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto select-all">
            <code>{curlSnippet}</code>
          </pre>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-xl text-[11px] text-slate-300 space-y-1">
          <p className="font-bold text-white">Returns JSON Response:</p>
          <code className="text-slate-400 font-mono block">
            {`{ "success": true, "directUrl": "https://.../media/file.mp3", "mediaType": "audio" }`}
          </code>
        </div>
      </div>
    </div>
  );
};