import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { GuestQuota, getGuestQuota } from '../utils/quotaManager';

interface QuotaBadgeProps {
  isSignedIn: boolean;
  onOpenSignIn: () => void;
}

export const QuotaBadge: React.FC<QuotaBadgeProps> = ({ isSignedIn, onOpenSignIn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quota, setQuota] = useState<GuestQuota>(getGuestQuota());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setQuota(getGuestQuota());
    window.addEventListener('quota-updated', handleUpdate);
    return () => window.removeEventListener('quota-updated', handleUpdate);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center text-xs" ref={dropdownRef}>
      {/* Trigger matching screenshot layout: "Image Hosting Quota: [17/30]" */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 px-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
      >
        <span className="text-slate-600 font-semibold whitespace-nowrap">Image Hosting Quota:</span>
        <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50/80 font-mono text-slate-800 text-xs font-semibold">
          {isSignedIn ? 'Unlimited' : `${quota.used}/${quota.total}`}
        </span>
      </button>

      {/* Popover dropdown matching attached image */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200/90 py-3 px-4 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Used</span>
              <span className="font-mono font-semibold text-slate-900">
                {isSignedIn ? 'Active' : quota.used}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Total</span>
              <span className="font-mono font-semibold text-slate-900">
                {isSignedIn ? '∞' : quota.total}
              </span>
            </div>

            <div className="border-t border-slate-100 my-2 pt-2">
              <p className="text-[11px] text-slate-400 font-medium">
                {isSignedIn ? 'Unlimited Plan (Google Account)' : 'Lifetime (always free)'}
              </p>
            </div>

            {!isSignedIn && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSignIn();
                  }}
                  className="w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get Unlimited Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};