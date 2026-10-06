import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Key, Code } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface ApiAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiAccessModal: React.FC<ApiAccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('al_live_' + Math.random().toString(36).substring(2, 12));
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const curlSnippet = `curl -X POST "${window.location.origin}/api/upload" \\
  -H "x-api-key: ${apiKey}" \\
  -F "file=@your-file.mp3"`;

  const jsSnippet = `const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('${window.location.origin}/api/upload', {
  method: 'POST',
  headers: { 'x-api-key': '${apiKey}' },
  body: formData
});
const { directUrl } = await res.json();
console.log('Stream URL:', directUrl);`;

  const handleCopyKey = async () => {
    const ok = await copyToClipboard(apiKey);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopySnippet = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Developer API Access</h2>
            <p className="text-xs text-slate-500">Programmatic media upload and URL generation.</p>
          </div>
        </div>

        {/* API Key box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 mb-5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Your Live API Key</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={apiKey}
              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800"
            />
            <button
              onClick={handleCopyKey}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* cURL Example */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Terminal cURL Example</span>
            <button
              onClick={() => handleCopySnippet(curlSnippet)}
              className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
            >
              {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>Copy cURL</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
            {curlSnippet}
          </pre>
        </div>

        {/* JavaScript Example */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>JavaScript / Node.js Snippet</span>
          </div>
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
            {jsSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
