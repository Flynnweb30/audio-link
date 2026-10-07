import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radio, 
  Sparkles, 
  History, 
  Code2, 
  Crown, 
  LogIn, 
  LogOut, 
  Loader2, 
  Video 
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';

import { auth, signInWithGoogle, signOutUser } from './firebase/config';
import { 
  syncRecordToFirebase, 
  syncBatchToFirebase, 
  deleteRecordFromFirebase, 
  subscribeToUserHistory 
} from './firebase/syncService';
import { MediaItem, GuestQuotaInfo } from './types';
import { AudioUploader } from './components/AudioUploader';
import { VideoStudio } from './components/VideoStudio';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { FullHistoryModal } from './components/FullHistoryModal';
import { QrCodeModal } from './components/QrCodeModal';
import { ProPricingModal } from './components/ProPricingModal';
import { ApiAccessModal } from './components/ApiAccessModal';
import { SharePlayerView } from './components/SharePlayerView';

export type TabRoute = 'all' | 'audio' | 'video' | 'image';

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
    heroSubheading: 'Upload media and get permanent streamable HTTP links with 206 Byte-Range streaming. Perfect for bots, games, web apps, and embeds.',
  },
  audio: {
    path: '/audio',
    title: 'Audio Direct URLs & MP3 Streaming CDN | AudioLink',
    description: 'Turn MP3, WAV, M4A, OGG, and FLAC files into permanent, direct streamable audio links with instant byte-range playback for bots and web apps.',
    badge: 'Direct Audio CDN & Byte-Streaming',
    heroHeading: 'Turn Any Audio into a',
    heroSubheading: 'Upload MP3, WAV, M4A, OGG, and FLAC to generate direct streamable URLs with HTTP 206 Byte-Range streaming.',
  },
  video: {
    path: '/video',
    title: 'Video Edit, Record & Streaming CDN Studio | AudioLink',
    description: 'Edit, record, trim, and convert video files into permanent direct streamable video URLs with HTTP 206 chunked playback support.',
    badge: 'Video Edit, Record & Direct CDN Studio',
    heroHeading: 'Record, Edit & Stream Any Video into a',
    heroSubheading: 'Record webcam, trim clips, split audio tracks, and export directly into permanent HTTP 206 Byte-Range streaming links.',
  },
  image: {
    path: '/images',
    title: 'Image Direct URLs & Media Hosting CDN | AudioLink',
    description: 'Upload PNG, JPG, WEBP, and GIF images to generate permanent, fast-loading direct CDN links for embedding anywhere.',
    badge: 'Direct Image CDN & Instant Hosting',
    heroHeading: 'Turn Any Image into a',
    heroSubheading: 'Upload PNG, JPG, WEBP, and GIF images to get permanent direct CDN image URLs for markdown, blogs, and websites.',
  },
};

function getRouteFromPathname(pathname: string): TabRoute {
  const normalized = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (normalized === '/audio') return 'audio';
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

  const [guestQuota, setGuestQuota] = useState<GuestQuotaInfo>({
    remaining: 5,
    maxDaily: 5,
    used: 0,
    retentionHours: 48,
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);

  const activeUnsubscribeRef = useRef<(() => void) | null>(null);

  const getGuestId = useCallback(() => {
    let gid = localStorage.getItem('audiolink_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('audiolink_guest_id', gid);
    }
    return gid;
  }, []);

  const refreshGuestQuota = useCallback(async () => {
    try {
      const gid = getGuestId();
      const res = await fetch(`/api/guest-quota?guestId=${encodeURIComponent(gid)}`);
      if (res.ok) {
        const data = await res.json();
        setGuestQuota(data);
      }
    } catch {}
  }, [getGuestId]);

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

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', cfg.title);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', cfg.description);

    const twUrl = document.querySelector('meta[name="twitter:url"]');
    if (twUrl) twUrl.setAttribute('content', canonicalUrl);
  }, [currentTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewId = params.get('view');
      setStandaloneViewId(viewId);
      setCurrentTab(getRouteFromPathname(window.location.pathname));
    };

    const initialParams = new URLSearchParams(window.location.search);
    const initialView = initialParams.get('view');
    if (initialView) {
      setStandaloneViewId(initialView);
    }

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

  const loadAndReconcileHistory = useCallback(async (activeUser: User | null) => {
    const effectiveUserId = activeUser ? activeUser.uid : getGuestId();

    try {
      const res = await fetch(`/api/media?userId=${encodeURIComponent(effectiveUserId)}`, {
        headers: {
          'x-user-id': effectiveUserId,
          'x-user-email': activeUser?.email || '',
        },
      });

      let serverItems: MediaItem[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          serverItems = data.items;
        }
      }

      setItems(serverItems);

      if (activeUnsubscribeRef.current) {
        activeUnsubscribeRef.current();
        activeUnsubscribeRef.current = null;
      }

      const unsub = subscribeToUserHistory(effectiveUserId, (firebaseItems) => {
        setItems((prev) => {
          const map = new Map<string, MediaItem>();
          prev.forEach((i) => map.set(i.id, i));
          firebaseItems.forEach((i) => map.set(i.id, { ...map.get(i.id), ...i }));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      });

      if (unsub) {
        activeUnsubscribeRef.current = unsub;
      }

      if (activeUser && serverItems.length > 0) {
        syncBatchToFirebase(serverItems, activeUser);
      }
    } catch {}
  }, [getGuestId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      loadAndReconcileHistory(currentUser);

      if (!currentUser) {
        refreshGuestQuota();
      }
    });

    return () => {
      unsubscribe();
      if (activeUnsubscribeRef.current) {
        activeUnsubscribeRef.current();
      }
    };
  }, [loadAndReconcileHistory, refreshGuestQuota]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch {}
    finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (activeUnsubscribeRef.current) {
        activeUnsubscribeRef.current();
        activeUnsubscribeRef.current = null;
      }
      await signOutUser();
      setItems([]);
      setActiveItem(null);
    } catch {}
  };

  const handleUploadSuccess = async (newItem: MediaItem) => {
    const safeItem: MediaItem = {
      ...newItem,
      userId: user ? user.uid : getGuestId(),
      userEmail: user?.email || undefined,
      isGuest: !user,
      expiresAt: user ? undefined : newItem.expiresAt,
      duration: Number(newItem?.duration ?? newItem?.metadata?.duration ?? 0),
    };

    setActiveItem(safeItem);
    setItems((prev) => [safeItem, ...prev.filter((i) => i.id !== safeItem.id)]);
    await syncRecordToFirebase(safeItem, user);

    if (!user) {
      refreshGuestQuota();
    }
  };

  const handleBatchUploadSuccess = async (newItems: MediaItem[]) => {
    if (newItems.length === 0) return;
    const safeItems = newItems.map((item) => ({
      ...item,
      userId: user ? user.uid : getGuestId(),
      userEmail: user?.email || undefined,
      isGuest: !user,
      expiresAt: user ? undefined : item.expiresAt,
      duration: Number(item?.duration ?? item?.metadata?.duration ?? 0),
    }));

    setActiveItem(safeItems[0]);

    setItems((prev) => {
      const map = new Map<string, MediaItem>();
      prev.forEach((i) => map.set(i.id, i));
      safeItems.forEach((i) => map.set(i.id, i));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    await syncBatchToFirebase(safeItems, user);

    if (!user) {
      refreshGuestQuota();
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/media/${id}`, { method: 'DELETE' });
    } catch {}

    await deleteRecordFromFirebase(id);

    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeItem?.id === id) {
      const remaining = items.filter((i) => i.id !== id);
      setActiveItem(remaining.length > 0 ? remaining[0] : null);
    }

    if (!user) {
      refreshGuestQuota();
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
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => {
              setActiveItem(null);
              handleTabChange('all');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                AudioLink <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">v2</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Audio, Video & Direct Media Streaming</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleTabChange('video')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentTab === 'video' 
                  ? 'bg-lime-500 text-slate-950 border-lime-400' 
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
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

      {/* Main Content Area */}
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

        {/* Video Studio Module on /video or Media Uploader on others */}
        {currentTab === 'video' ? (
          <VideoStudio
            user={user}
            guestRemaining={guestQuota.remaining}
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
              guestRemaining={guestQuota.remaining}
              onSignIn={handleSignIn}
              isSigningIn={isSigningIn}
              currentFilter={currentTab}
              onFilterChange={handleTabChange}
            />
          </div>
        )}

        {/* Active Upload Result / Preview Widget */}
        {activeItem && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <UrlShareCard
              item={activeItem}
              onOpenQr={() => setIsQrOpen(true)}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        )}

        {/* Centralized Recent Conversion History (matching Image 1) */}
        <RecentUploadsGrid
          items={items}
          activeFilter={currentTab}
          onViewAllHistory={() => setIsHistoryOpen(true)}
          onSelectItem={(item) => setActiveItem(item)}
          onDeleteItem={handleDeleteItem}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AudioLink v2. Centralized Media Service.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsApiOpen(true)} className="hover:text-slate-300 cursor-pointer">API Documentation</button>
            <button onClick={() => setIsProOpen(true)} className="hover:text-slate-300 cursor-pointer">Pro Features</button>
            <button onClick={() => setIsHistoryOpen(true)} className="hover:text-slate-300 cursor-pointer">My Storage</button>
          </div>
        </div>
      </footer>

      {/* View All History Modal (matching Images 2 & 3) */}
      <FullHistoryModal
        items={items}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectItem={(item) => {
          setActiveItem(item);
          setIsHistoryOpen(false);
        }}
        onDeleteItem={handleDeleteItem}
      />

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        url={activeItem?.directUrl || activeItem?.playerUrl || ''}
        title={activeItem?.originalName || 'AudioLink Media'}
      />

      <ProPricingModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
        onUpgrade={() => {
          setIsProOpen(false);
          handleSignIn();
        }}
      />

      <ApiAccessModal
        isOpen={isApiOpen}
        onClose={() => setIsApiOpen(false)}
      />
    </div>
  );
};

export default App;