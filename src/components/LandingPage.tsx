import React from 'react';
import { 
  Zap, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  Globe2, 
  Radio, 
  Film, 
  Image as ImageIcon, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  Layers
} from 'lucide-react';

interface LandingPageProps {
  onStartFree: () => void;
  onOpenPricing: () => void;
  onSignInWithGoogle: () => void;
  isSignedIn: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartFree,
  onOpenPricing,
  onSignInWithGoogle,
  isSignedIn,
}) => {
  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 sm:pt-12 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero Forced Downloads • Instant RFC 206 Streaming Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
          Convert Audio, Video &amp; Images to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Direct Streaming URLs</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload any MP3, WAV, MP4, WebM, PNG or JPG to create real, permanent streamable links that play directly in the browser with timeline scrub seeking.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onStartFree}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>Start Uploading Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isSignedIn && (
            <button
              type="button"
              onClick={onSignInWithGoogle}
              className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-sm font-semibold shadow-2xs transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign In with Google</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPricing}
            className="px-5 py-3 text-slate-600 hover:text-slate-900 rounded-2xl text-sm font-semibold transition-colors"
          >
            <span>View Pro Capabilities</span>
          </button>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Audio Direct URLs</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Generate URLs ending in <code className="text-slate-800">.mp3</code> or <code className="text-slate-800">.wav</code>. Plays directly in browser players, Discord soundboards, and podcast apps.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Video 206 Byte Streaming</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            MP4 and WebM videos stream smoothly with instant scrub seeking on iOS Safari, Android, and desktop without downloading the full video first.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Image CDN Links</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Render PNG, JPG, and AVIF images directly in browser tabs or embed anywhere with ready-to-paste <code className="text-slate-800">&lt;img&gt;</code> snippets and QR codes.
          </p>
        </div>
      </section>

      {/* Free vs Pro Comparison Pricing Section */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Free Forever, Scalable When You Grow
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Enjoy full access with generous free monthly credits, or upgrade to Pro for enterprise-grade media tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="rounded-2xl border border-slate-200 p-6 space-y-5 bg-slate-50/50">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free Tier</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>30 Free Conversions</strong> / month for guests</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Unlimited Conversions</strong> with free Google Sign-In</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Direct URLs (.mp3, .mp4, .png, .jpg)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>HTTP 206 Byte-Range streaming</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Persistent upload history with Folders/Date filter</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onStartFree}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Use Free Now
            </button>
          </div>

          {/* Pro Tier */}
          <div className="rounded-2xl border-2 border-indigo-600 p-6 space-y-5 bg-indigo-50/30 relative">
            <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wide uppercase">
              Popular Pro
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Pro Creator</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">$9</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Custom URL Names</strong> &amp; Branded Slugs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Media Analytics:</strong> Real-time Views &amp; Downloads</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Batch Conversion:</strong> Multi-file upload &amp; bulk copy</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Password Protection</strong> &amp; Expiry Controls</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Developer API:</strong> Programmatic direct streaming</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onOpenPricing}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};