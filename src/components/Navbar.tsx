import React from 'react';
import { Radio, Upload, LogOut, Sparkles, Code2, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentTab: 'landing' | 'upload' | 'history' | 'player';
  onSelectTab: (tab: 'landing' | 'upload') => void;
  onNewUpload: () => void;
  onOpenFullHistory: () => void;
  onOpenPricing: () => void;
  onOpenApiModal: () => void;
  user: User | null;
  guestRemaining: number;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewUpload,
  onOpenFullHistory,
  onOpenPricing,
  onOpenApiModal,
  user,
  guestRemaining,
  onSignIn,
  onSignOut,
  isSigningIn = false,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Wordmark Brand */}
        <div
          onClick={() => onSelectTab('landing')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-colors">
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              AudioLink
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('landing')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'landing' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab('upload')}
            className={`transition-colors hover:text-slate-900 ${
              currentTab === 'upload' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''
            }`}
          >
            Media Studio
          </button>
          <button
            onClick={onOpenFullHistory}
            className="transition-colors hover:text-slate-900"
          >
            History
          </button>
          <button
            onClick={onOpenPricing}
            className="transition-colors hover:text-emerald-700 flex items-center gap-1 text-emerald-700 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pro Plans</span>
          </button>
          <button
            onClick={onOpenApiModal}
            className="transition-colors hover:text-slate-900 flex items-center gap-1"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500" />
            <span>API</span>
          </button>
        </nav>

        {/* Actions & User Quota Status */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <button
              onClick={onOpenPricing}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pro Plan Active</span>
            </button>
          ) : (
            <div
              title="Guest limit: 30 conversions per month. Resets automatically on the 1st."
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 font-mono"
            >
              <span className={guestRemaining === 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                {guestRemaining}/30
              </span>
              <span className="text-slate-400 font-sans hidden sm:inline">remaining</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pl-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 hidden lg:inline max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || 'Account'}
                </span>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-xl shadow-2xs hover:bg-slate-50 transition-all whitespace-nowrap disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {isSigningIn ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
            </button>
          )}

          <button
            onClick={onNewUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
};
