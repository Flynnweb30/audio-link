import React from 'react';
import { X, Check, Crown, Zap, Shield, Sparkles } from 'lucide-react';

interface ProPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ProPricingModal: React.FC<ProPricingModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-left space-y-5 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>AudioLink Pro</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Unlimited Conversions & Batches</p>
              <p className="text-[11px] text-slate-400">Zero guest quotas or daily upload ceilings.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Custom Slugs & Password Protection</p>
              <p className="text-[11px] text-slate-400">Branded direct URLs and secure restricted sharing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">High-Speed Global CDN</p>
              <p className="text-[11px] text-slate-400">Immediate HTTP 206 Byte-Range streaming everywhere.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onUpgrade}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>Sign In with Google to Activate Unlimited Free Tier</span>
        </button>
      </div>
    </div>
  );
};