import React from 'react';
import { Layers, Upload, Film, Music, Image as ImageIcon } from 'lucide-react';

interface NavbarProps {
  currentTab: 'upload' | 'history' | 'player';
  onSelectTab: (tab: 'upload' | 'history') => void;
  onNewUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onNewUpload }) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div 
          onClick={() => onSelectTab('upload')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-indigo-600 transition-colors">
            <Layers className="w-5 h-5 text-indigo-400 group-hover:text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              MediaLink
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span>Audio</span>
              <span>•</span>
              <span>Video</span>
              <span>•</span>
              <span>Image</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('upload')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'upload' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Studio Upload
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'history' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Media Registry
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewUpload}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>
        </div>
      </div>
    </header>
  );
};