import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radio, 
  Sparkles, 
  History, 
  Code2, 
  Crown, 
  LogIn, 
  LogOut, 
  Loader2, 
  Clapperboard 
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';

import { auth, signInWithGoogle, signOutUser } from './firebase/config';
import { 
  subscribeToOwnerMediaLibrary, 
  deleteMediaRecordFromFirebase, 
  renameMediaRecordInFirestore, 
  moveMediaRecordFolderInFirestore, 
  getUserQuotaStats 
} from './firebase/syncService';
import { MediaItem, UserQuotaStats } from './types';
import { AudioUploader } from './components/AudioUploader';
import { VideoStudio } from './components/VideoStudio';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { FullHistoryModal } from './components/FullHistoryModal';
import { QrCodeModal } from './components/QrCodeModal';
import { ProPricingModal } from './components/ProPricingModal';
import { ApiAccessModal } from './components/ApiAccessModal';
import { SharePlayerView } from './components/SharePlayerView';

export type TabRoute = 'all' | 'audio' | 'video' | 'video-studio' | 'image';

const ROUTE_CONFIG: Record<TabRoute, {
  path: string;
  title: string;
  description: string;
  badge: string;
  heroHeading: string;
  heroSubheading: string;
}> = {
  all: {
    path: '/',
    title: 'AudioLink v2 - Turn Audio, Video & Images into Direct Streamable URLs',
    description: 'Convert any audio, video, or image file into permanent, direct streamable HTTP URLs with 206 Byte-Range streaming. Fast, free, and reliable.',
    badge: 'High-Speed Direct Media CDN & Byte-Streaming',
    heroHeading: 'Turn Any Media into a',
    heroSubheading: 'Upload media and get permanent streamable HTTP links backed by Firebase Storage. Perfect for bots, games, web apps, and embeds.',
  },
  audio: {
    path: '/audio',
    title: 'Audio Direct URLs & MP3 Streaming CDN | AudioLink',
    description: 'Turn MP3, WAV, M4A, OGG, and FLAC files into permanent, direct streamable audio links with instant playback for bots and web apps.',
    badge: 'Direct Audio CDN & Byte-Streaming',
    heroHeading: 'Turn Any Audio into a',
    heroSubheading: 'Upload MP3, WAV, M4A, OGG, and FLAC to generate direct streamable URLs backed by Firebase Storage.',
  },
  video: {
    path: '/video',
    title: 'Video Direct URLs & MP4 Streaming CDN | AudioLink',
    description: 'Convert MP4, WEBM, and MOV video files into permanent direct streamable video URLs with instant streaming playback support.',
    badge: 'Direct Video CDN & Streaming',
    heroHeading: 'Turn Any Video into a',
    heroSubheading: 'Upload MP4, WEBM, and MOV video files to get high-speed permanent direct links for HTML5 players and embeds.',
  },
  'video-studio': {
    path: '/video-studio',
    title: 'Video Studio - Edit, Record & Create Streamable Media | AudioLink',
    description: 'Dedicated VEED-style video editing workspace: Record webcam/screen, split/trim clips, clean audio, and export to direct Firebase Storage URLs.',
    badge: 'Dedicated Video Edit & Record Studio',
    heroHeading: 'Video Studio — Edit, Record & Export to',
    heroSubheading: 'Professional in-browser video editor with timeline trimming, keyboard split (S), canvas aspect ratios, and instant cloud CDN export.',
  },
  image: {
    path: '/images',
    title: 'Image Direct URLs & Media Hosting CDN | AudioLink',
    description: 'Upload PNG, JPG, WEBP, and GIF images with auto-stripped EXIF metadata to generate permanent, fast-loading direct CDN links.',
    badge: 'Direct Image CDN & Instant Hosting (EXIF Stripped)',
    heroHeading: 'Turn Any Image into a',
    heroSubheading: 'Upload PNG, JPG, WEBP, and GIF images to get permanent direct CDN image URLs for markdown, blogs, and websites.',
  },
};

function getRouteFromPathname(pathname: string): TabRoute {
  const normalized = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (normalized === '/audio') return 'audio';
  if (normalized === '/video-studio') return 'video-studio';
  if (normalized === '/video') return 'video';
  if (normalized === '/images' || normalized === '/image') return 'image';
  return 'all';
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [currentTab, setCurrentTab] = useState<TabRoute>(() => {
    if (typeof window !== 'undefined') {
      return getRouteFromPathname(window.location.pathname);
    }
    return 'all';
  });

  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [standaloneViewId, setStandaloneViewId] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);

  // Persistent Owner / Guest ID
  const getOwnerId = useCallback(() => {
    if (user) return user.uid;
    let gid = localStorage.getItem('audiolink_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('audiolink_guest_id', gid);
    }
    return gid;
  }, [user]);

  // Quota statistics
  const quotaStats: UserQuotaStats = getUserQuotaStats(items.length, user);

  // Sync route and SEO metadata
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.pathname.toLowerCase() === '/image') {
      window.history.replaceState({}, '', '/images');
    }

    const cfg = ROUTE_CONFIG[currentTab];
    document.title = cfg.title;

    const canonicalPath = cfg.path === '/' ? '' : cfg.path;
    const canonicalUrl = `https://audiolink-oskn.onrender.com${canonicalPath}`;

    let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = canonicalUrl;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', cfg.description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', cfg.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', cfg.description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
  }, [currentTab]);

  // Handle URL query ?view=ID
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setStandaloneViewId(params.get('view'));
      setCurrentTab(getRouteFromPathname(window.location.pathname));
    };

    const initialParams = new URLSearchParams(window.location.search);
    const initialView = initialParams.get('view');
    if (initialView) setStandaloneViewId(initialView);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: TabRoute) => {
    setCurrentTab(newTab);
    const targetPath = ROUTE_CONFIG[newTab].path;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Firebase Auth & Real-Time Firestore Library Subscription
  useEffect(() => {
    let unsubLibrary: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (unsubLibrary) {
        unsubLibrary();
        unsubLibrary = null;
      }

      const activeOwnerId = currentUser ? currentUser.uid : getOwnerId();
      unsubLibrary = subscribeToOwnerMediaLibrary(activeOwnerId, (libraryRecords) => {
        setItems(libraryRecords);
        if (!activeItem && libraryRecords.length > 0) {
          setActiveItem(libraryRecords[0]);
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubLibrary) unsubLibrary();
    };
  }, [getOwnerId, activeItem]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch {
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setItems([]);
      setActiveItem(null);
    } catch {}
  };

  const handleUploadSuccess = (newItem: MediaItem) => {
    setActiveItem(newItem);
    setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
  };

  const handleBatchUploadSuccess = (newItems: MediaItem[]) => {
    if (newItems.length === 0) return;
    setActiveItem(newItems[0]);
    setItems((prev) => {
      const map = new Map<string, MediaItem>();
      prev.forEach((i) => map.set(i.id, i));
      newItems.forEach((i) => map.set(i.id, i));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const handleDeleteItem = async (itemToDelete: MediaItem) => {
    await deleteMediaRecordFromFirebase(itemToDelete);
    setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    if (activeItem?.id === itemToDelete.id) {
      const remaining = items.filter((i) => i.id !== itemToDelete.id);
      setActiveItem(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleRenameItem = async (documentId: string, newName: string) => {
    await renameMediaRecordInFirestore(documentId, newName);
    setItems((prev) => prev.map((i) => i.id === documentId || i.documentId === documentId ? { ...i, originalName: newName } : i));
    if (activeItem && (activeItem.id === documentId || activeItem.documentId === documentId)) {
      setActiveItem((prev) => prev ? { ...prev, originalName: newName } : null);
    }
  };

  const handleMoveItem = async (documentId: string, newFolder: string) => {
    await moveMediaRecordFolderInFirestore(documentId, newFolder);
    setItems((prev) => prev.map((i) => i.id === documentId || i.documentId === documentId ? { ...i, folder: newFolder } : i));
    if (activeItem && (activeItem.id === documentId || activeItem.documentId === documentId)) {
      setActiveItem((prev) => prev ? { ...prev, folder: newFolder } : null);
    }
  };

  const routeConfig = ROUTE_CONFIG[currentTab];

  if (standaloneViewId) {
    return (
      <SharePlayerView
        mediaId={standaloneViewId}
        onBackToHome={() => {
          window.history.pushState({}, '', ROUTE_CONFIG[currentTab].path);
          setStandaloneViewId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => { setActiveItem(null); handleTabChange('all'); }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                AudioLink <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">v2</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Firebase Media Converter & Free Cloud Hosting</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleTabChange('video-studio')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'video-studio' 
                  ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20' 
                  : 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Video Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Library</span>
              {items.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] font-mono">
                  {items.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsApiOpen(true)}
              className="hidden md:flex px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>API</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProOpen(true)}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Pro</span>
            </button>

            {authLoading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-emerald-500/40" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleSignIn}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10 flex flex-col gap-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{routeConfig.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {routeConfig.heroHeading} <span className="text-emerald-400">Direct URL</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            {routeConfig.heroSubheading}
          </p>
        </div>

        {/* Video Studio or Media Converter */}
        {currentTab === 'video-studio' ? (
          <VideoStudio
            user={user}
            guestRemaining={quotaStats.remaining}
            onExportSuccess={handleUploadSuccess}
            onSignIn={handleSignIn}
          />
        ) : (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
            <AudioUploader
              onUploadSuccess={handleUploadSuccess}
              onBatchUploadSuccess={handleBatchUploadSuccess}
              onSelectSample={() => {}}
              user={user}
              quotaStats={quotaStats}
              onSignIn={handleSignIn}
              isSigningIn={isSigningIn}
              currentFilter={currentTab}
              onFilterChange={handleTabChange}
            />
          </div>
        )}

        {/* Active Upload Result / Preview */}
        {activeItem && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <UrlShareCard
              item={activeItem}
              onOpenQr={() => setIsQrOpen(true)}
              onDeleteItem={handleDeleteItem}
              onRenameItem={handleRenameItem}
              onMoveItem={handleMoveItem}
            />
          </div>
        )}

        {/* Recent Conversions Grid */}
        <RecentUploadsGrid
          items={items}
          activeFilter={currentTab === 'video-studio' ? 'video' : currentTab}
          onViewAllHistory={() => setIsHistoryOpen(true)}
          onSelectItem={(item) => setActiveItem(item)}
          onDeleteItem={handleDeleteItem}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AudioLink v2. Centralized Firebase Storage & Media Hosting.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsApiOpen(true)} className="hover:text-slate-300 cursor-pointer">API Documentation</button>
            <button onClick={() => setIsProOpen(true)} className="hover:text-slate-300 cursor-pointer">Pro Features</button>
            <button onClick={() => setIsHistoryOpen(true)} className="hover:text-slate-300 cursor-pointer">My Storage</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FullHistoryModal
        items={items}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectItem={(item) => { setActiveItem(item); setIsHistoryOpen(false); }}
        onDeleteItem={handleDeleteItem}
        onRenameItem={handleRenameItem}
        onMoveItem={handleMoveItem}
      />

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        url={activeItem?.downloadURL || activeItem?.directUrl || ''}
        title={activeItem?.originalName || 'AudioLink Media'}
      />

      <ProPricingModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
        onUpgrade={() => { setIsProOpen(false); handleSignIn(); }}
      />

      <ApiAccessModal
        isOpen={isApiOpen}
        onClose={() => setIsApiOpen(false)}
      />
    </div>
  );
};

export default App;