import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { getActiveFirebaseConfig, saveCustomFirebaseConfig } from '../firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const current = getActiveFirebaseConfig();
  const [apiKey, setApiKey] = useState(current.apiKey || '');
  const [authDomain, setAuthDomain] = useState(current.authDomain || '');
  const [projectId, setProjectId] = useState(current.projectId || '');
  const [appId, setAppId] = useState(current.appId || '');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      alert('API Key and Project ID are required for Firebase Authentication.');
      return;
    }

    saveCustomFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: `${projectId.trim()}.appspot.com`,
      messagingSenderId: '1234567890',
      appId: appId.trim() || '1:1234567890:web:medialink',
    });
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Firebase Authentication Setup</h3>
            <p className="text-xs text-slate-500">Enable real Google Sign-In with your Firebase project</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Web API Key (apiKey)</label>
            <input
              type="text"
              required
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project ID (projectId)</label>
            <input
              type="text"
              required
              placeholder="your-project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Auth Domain (authDomain)</label>
            <input
              type="text"
              placeholder="your-project-id.firebaseapp.com"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">App ID (appId)</label>
            <input
              type="text"
              placeholder="1:1234567890:web:abcdef"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            Note: Remember to add this site domain to <strong>Authorized Domains</strong> under Firebase Console &gt; Authentication &gt; Settings.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              Save &amp; Initialize Real Auth
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};