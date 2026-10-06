import React from 'react';
import { Radio, PlayCircle, Globe2, ShieldCheck, Film, Image as ImageIcon } from 'lucide-react';

export const SystemFeatures: React.FC = () => {
  return (
    <section id="system-features" className="pt-8 border-t border-slate-200">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900">
          Universal Media-to-URL Specifications
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Designed for seamless browser playback and embedding without forced file downloads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">HTTP 206 Byte Streaming</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Byte-range requests enable instant seek scrubbing on MP3/WAV audio and MP4/WEBM video across iOS, Safari, Android, and desktop browsers.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PlayCircle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Real Extension Direct URLs</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every generated URL ends with the real file extension (<code className="text-slate-800">.mp3</code>, <code className="text-slate-800">.mp4</code>, <code className="text-slate-800">.png</code>, <code className="text-slate-800">.avif</code>) and serves with <code className="text-slate-800">inline</code> headers.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Globe2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Centralized History & Organization</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Automatic per-user conversion tracking with folder and date grouping. URLs remain permanent and accessible across sessions.
          </p>
        </div>
      </div>
    </section>
  );
};
