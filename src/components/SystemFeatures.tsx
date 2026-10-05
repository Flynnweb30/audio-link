import React from 'react';
import { Radio, PlayCircle, Globe2 } from 'lucide-react';

export const SystemFeatures: React.FC = () => {
  return (
    <section id="system-features" className="pt-8 border-t border-slate-200">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900">
          Audio-to-URL Specifications & Capabilities
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Designed for instant streaming, seamless embeds, and standard RFC HTTP 206 compatibility.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">HTTP 206 Byte Ranges</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Byte-range seeking enables instant timeline scrubbing on iOS, Safari, Android, and Discord bots without waiting for the full file to download.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Smart Autoplay & Fallback</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Automatically initiates playback upon opening the link. If strict browser policies pause audio, a prominent tap-to-play banner seamlessly resumes it.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Universal Direct Stream</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Direct URLs terminate in the real extension (e.g., .mp3), sending <code className="text-slate-800">Content-Disposition: inline</code> so browsers stream natively instead of downloading.
          </p>
        </div>
      </div>
    </section>
  );
};