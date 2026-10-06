import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Key, BarChart3, Lock, Layers } from 'lucide-react';
import { isProActivated, setProActivated } from '../utils/userSession';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const [proActive, setProActive] = useState(isProActivated());

  if (!isOpen) return null;

  const togglePro = () => {
    const next = !proActive;
    setProActivated(next);
    setProActive(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">MediaLink Pro Capabilities</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Supercharge your workflow with custom branded links, real-time analytics, and developer APIs.
          </p>
        </div>

        <div className="my-6 space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Custom Branded Link Slugs</p>
              <p className="text-[11px] text-slate-500">Assign memorable URLs like /media/podcast-episode-1.mp3 instead of random IDs.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Real-Time Media Analytics</p>
              <p className="text-[11px] text-slate-500">Track total streams, video views, and download counts on every converted file.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Developer API Access</p>
              <p className="text-[11px] text-slate-500">Upload and stream programmatically via curl, Node.js, and Discord bots.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              togglePro();
              onClose();
            }}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs ${
              proActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {proActive ? '✓ Pro Features Active (Click to Deactivate)' : 'Activate Pro Features (Instant Test)'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};