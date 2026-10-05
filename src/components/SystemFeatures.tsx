import React from 'react';
import { Radio, PlayCircle, Globe2, Film, Image as ImageIcon } from 'lucide-react';

export const SystemFeatures: React.FC = () => {
  return (
    <section id="system-features" className="pt-8 border-t border-slate-200">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900">
          MediaLink Streaming Engine Architecture
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Designed for instant streaming, seamless embeds, and RFC 206 byte-range seeking across audio, video, and image files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Audio &amp; Video 206 Byte Ranges</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Byte-range seeking enables instant timeline scrubbing on iOS Safari, Android, and Discord bots without downloading full tracks or video files first.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Direct In-Browser Playback</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            All generated URLs terminate in the real file extension (e.g. .mp3, .mp4, .png) with <code className="text-slate-800">Content-Disposition: inline</code> so browsers stream natively instead of forcing a download dialog.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Universal Image CDN Headers</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Instant rendering with aggressive caching for PNG, JPG, WebP, and SVG files with ready-to-copy HTML &lt;img&gt; embed tags and mobile QR codes.
          </p>
        </div>
      </div>
    </section>
  );
};