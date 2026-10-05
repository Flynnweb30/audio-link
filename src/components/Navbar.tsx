import React from 'react';
import { Radio, Upload } from 'lucide-react';

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
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-indigo-600 transition-colors">
            <Radio className="w-5 h-5 text-indigo-400 group-hover:text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              AudioLink
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('upload')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'upload' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Studio Upload
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'history' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Stored Audios
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio</span>
          </button>
        </div>
      </div>
    </header>
  );
};