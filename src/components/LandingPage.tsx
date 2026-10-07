import React from 'react';
import { 
  Radio, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Globe2, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Code2, 
  BarChart3, 
  Lock, 
  Clock,
  Layers
} from 'lucide-react';

interface LandingPageProps {
  onLaunchStudio: () => void;
  onOpenPricing: () => void;
  onOpenApiModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchStudio,
  onOpenPricing,
  onOpenApiModal,
}) => {
  return (
    <div className="space-y-16 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Universal Audio, Video & Image to Direct URL Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Turn Any Media File Into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
            Permanent Direct Streaming URL
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload audio, MP4 video, or high-res images and get a direct link that plays or displays in any browser immediately—without forcing unwanted downloads.
        </p>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onLaunchStudio}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
          >
            <span>Launch Media Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onOpenPricing}
            className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>View Pro Capabilities</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free 30 Conversions / Mo
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> HTTP 206 Range Streaming
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Direct File Extension URLs
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> In-Browser Inline Playback
          </span>
        </div>
      </section>

      {/* Media Types Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-sm transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Music className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Audio to Direct Stream</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Convert MP3, WAV, M4A, OGG, and FLAC into direct CDN streaming URLs. Compatible with HTML5 audio tags, Discord bots, podcast RSS, and game audio engines.
          </p>
          <div className="text-[11px] font-mono text-indigo-600 font-medium">
            .mp3 · .wav · .m4a · .ogg · .flac
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-sm transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Video to In-Browser Stream</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload MP4, MOV, and WebM video files. Instant seek scrubbing with partial byte range headers, mobile lock-screen player support, and video embeds.
          </p>
          <div className="text-[11px] font-mono text-rose-600 font-medium">
            .mp4 · .mov · .webm · .mkv
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-sm transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Image to Permanent Hosting</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Host PNG, JPG, WebP, AVIF, and SVG images with fast public URLs for websites, social sharing cards, documentation, and app assets.
          </p>
          <div className="text-[11px] font-mono text-emerald-600 font-medium">
            .png · .jpg · .webp · .avif · .svg
          </div>
        </div>
      </section>

      {/* Free vs Pro Strategy Comparison */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md mb-2">
            Free + Premium Strategy
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Free Core Service with Powerful Pro Capabilities
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Enjoy full access with generous free monthly limits, or upgrade for enterprise features and developer tooling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Starter Plan</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">Free Forever</div>
              <p className="text-xs text-slate-500 mt-1">Ideal for individuals sharing occasional media.</p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>30 conversions</strong> per calendar month (auto-resets)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Audio, Video, and Image support</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real file extension URLs (.mp3, .mp4, .png)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>In-browser streaming (no forced download)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Local conversion history persistence</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onLaunchStudio}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Start Uploading Free
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-5 shadow-md relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
              Popular
            </div>

            <div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Pro Tier</span>
              <div className="text-2xl font-extrabold text-white mt-1">Unlimited Pro</div>
              <p className="text-xs text-slate-300 mt-1">Full power for creators, podcasters, and developers.</p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Unlimited media conversions</strong> with Google Sign-In</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Custom Vanity Slugs</strong> (e.g. /media/my-song.mp3)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Bulk Upload & Batch Copy</strong> (up to 10 files at once)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Analytics Dashboard</strong> (Views, plays, downloads)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Password Protection & Expiration Controls</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Developer REST API Access</strong> with cURL & API keys</span>
              </li>
            </ul>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenPricing}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
              >
                Explore Pro Features
              </button>
              <button
                type="button"
                onClick={onOpenApiModal}
                className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                title="Developer API Specs"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>API</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900">Engineered for Production Reliability</h2>
          <p className="text-xs text-slate-500 mt-1">Every link is built with high-availability media streaming protocols.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900">Zero Buffering</h3>
            <p className="text-[11px] text-slate-500">Audio and video start playing immediately via HTTP partial byte content.</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900">Private Links</h3>
            <p className="text-[11px] text-slate-500">Add an optional access password or PIN to sensitive media streams.</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">Analytics Tracking</h3>
            <p className="text-[11px] text-slate-500">Track total plays, page views, and download counts in real-time.</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
            <Code2 className="w-5 h-5 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-900">REST API Ready</h3>
            <p className="text-[11px] text-slate-500">Upload and generate links programmatically from any backend or script.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
