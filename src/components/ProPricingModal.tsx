import React, { useState } from 'react';
import { X, Check, Sparkles, Shield, Zap, Lock, Code } from 'lucide-react';
import { User } from 'firebase/auth';

interface ProPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignIn: () => void;
}

export const ProPricingModal: React.FC<ProPricingModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
}) => {
  const [upgraded, setUpgraded] = useState(false);

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    if (!user) {
      onSignIn();
      return;
    }
    setUpgraded(true);
    setTimeout(() => {
      setUpgraded(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center max-w-md mx-auto mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">AudioLink Pro Capabilities</h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose the plan that fits your streaming and storage requirements.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {/* Free Card */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase">Starter</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Free</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">$0 <span className="text-xs font-normal text-slate-500">/ month</span></div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> 30 conversions per calendar month</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> 100MB max file size</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Audio, video & image direct URLs</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> In-browser playback without download</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Local history & QR code sharing</li>
              </ul>
            </div>

            <div className="text-center text-xs text-slate-400 font-medium py-2">
              {user ? 'Google Account Active' : 'Active Guest Plan'}
            </div>
          </div>

          {/* Pro Card */}
          <div className="p-5 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 flex flex-col justify-between space-y-4 relative">
            <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Recommended
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">Pro Unlimited</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Pro</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">$9 <span className="text-xs font-normal text-slate-500">/ month</span></div>
              <ul className="mt-4 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> <strong>Unlimited</strong> media conversions</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Custom vanity slug URLs</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Bulk upload & 1-click batch copy</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Private PIN & password-protected links</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Real-time analytics (views, plays, downloads)</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Developer REST API key access</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {upgraded ? 'Plan Activated!' : user ? 'Upgrade to Pro' : 'Sign in with Google for Pro'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Core service remains free forever. Upgrade anytime for advanced media workflows and custom branding.
        </p>
      </div>
    </div>
  );
};
