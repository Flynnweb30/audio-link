import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AudioUploader } from './components/AudioUploader';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { MediaHistoryView } from './components/MediaHistoryView';
import { SharePlayerView } from './components/SharePlayerView';
import { QuotaExceededModal } from './components/QuotaExceededModal';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { MediaItem } from './types';
import { 
  getOrCreateGuestId, 
  getLocalHistory, 
  saveLocalHistoryItem, 
  removeLocalHistoryItem,
  isProActivated
} from './utils/userSession';
import { subscribeToAuth, loginWithGoogle, logoutUser } from './firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'upload' | 'history' | 'player'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(isProActivated());
  const [activePlayerMediaId, setActivePlayerMediaId] = useState<string | null>(null);
  const [lastUploadedMedia, setLastUploadedMedia] = useState<MediaItem | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>(getLocalHistory());
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser);
    });
    const handleProChange = () => setIsPro(isProActivated());
    window.addEventListener('pro-status-changed', handleProChange);

    return () => {
      unsubscribe();
      window.removeEventListener('pro-status-changed', handleProChange);
    };
  }, []);

  const currentUserId = user ? user.uid : getOrCreateGuestId();

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const playId = params.get('play') || params.get('audio') || params.get('media');
      if (playId) {
        setActivePlayerMediaId(playId);
        setCurrentTab('player');
      } else {
        setActivePlayerMediaId(null);
        if (currentTab === 'player') {
          setCurrentTab('home');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/media?userId=${encodeURIComponent(currentUserId)}`, {
        headers: { 'X-User-Id': currentUserId },
      });
      if (res.ok) {
        const data = await res.json();
        const serverItems = data.items || [];
        const localItems = getLocalHistory();

        const map = new Map<string, MediaItem>();
        [...serverItems, ...localItems].forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMediaList(merged);
      } else {
        setMediaList(getLocalHistory());
      }
    } catch {
      setMediaList(getLocalHistory());
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [currentUserId]);

  const handleGoogleSignIn = async () => {
    try {
      const guestId = getOrCreateGuestId();
      const signedInUser = await loginWithGoogle();
      if (signedInUser) {
        await fetch('/api/migrate-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromUserId: guestId, toUserId: signedInUser.uid }),
        }).catch(() => {});
        fetchMedia();
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google Sign-In failed:', err);
      }
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    fetchMedia();
  };

  const handleUploadSuccess = (item: MediaItem) => {
    saveLocalHistoryItem(item);
    setLastUploadedMedia(item);
    fetchMedia();
    setTimeout(() => {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 100);
  };

  const handleOpenPlayer = (id: string) => {
    setActivePlayerMediaId(id);
    setCurrentTab('player');
    const newUrl = `${window.location.pathname}?play=${id}`;
    window.history.pushState({ playId: id }, '', newUrl);
  };

  const handleBackToStudio = () => {
    setActivePlayerMediaId(null);
    setCurrentTab('upload');
    const cleanUrl = window.location.pathname;
    window.history.pushState({}, '', cleanUrl);
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      removeLocalHistoryItem(id);
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (lastUploadedMedia?.id === id) setLastUploadedMedia(null);
        if (activePlayerMediaId === id) handleBackToStudio();
        fetchMedia();
      }
    } catch (err) {
      console.error('Failed deleting media:', err);
    }
  };

  const handleNavNewUpload = () => {
    setLastUploadedMedia(null);
    setCurrentTab('upload');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        currentTab={currentTab}
        user={user}
        isPro={isPro}
        onSelectTab={(tab) => {
          if (currentTab === 'player') {
            const cleanUrl = window.location.pathname;
            window.history.pushState({}, '', cleanUrl);
          }
          setCurrentTab(tab);
        }}
        onNewUpload={handleNavNewUpload}
        onSignInWithGoogle={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onOpenProModal={() => setProModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {currentTab === 'player' && activePlayerMediaId ? (
          <SharePlayerView
            audioId={activePlayerMediaId}
            onBackToStudio={handleBackToStudio}
            onDeleteMedia={handleDeleteMedia}
          />
        ) : currentTab === 'history' ? (
          <MediaHistoryView
            items={mediaList}
            onOpenPlayer={handleOpenPlayer}
            onDeleteMedia={handleDeleteMedia}
            onBackToStudio={handleBackToStudio}
            onRefresh={fetchMedia}
          />
        ) : currentTab === 'home' ? (
          <LandingPage
            onStartFree={() => setCurrentTab('upload')}
            onOpenPricing={() => setProModalOpen(true)}
            onSignInWithGoogle={handleGoogleSignIn}
            isSignedIn={Boolean(user)}
          />
        ) : (
          <div className="space-y-8">
            {lastUploadedMedia ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <UrlShareCard
                  media={lastUploadedMedia}
                  onOpenPlayer={handleOpenPlayer}
                  onUploadAnother={() => setLastUploadedMedia(null)}
                  onDelete={handleDeleteMedia}
                />

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Upload Another Media File
                  </h3>
                  <AudioUploader
                    isSignedIn={Boolean(user)}
                    isPro={isPro}
                    currentUserId={currentUserId}
                    onUploadSuccess={handleUploadSuccess}
                    onQuotaExceeded={() => setQuotaModalOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Audio, Video &amp; Image to Direct Stream URL
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Convert MP3, WAV, MP4, WebM, PNG, JPG, or AVIF files into permanent direct streaming URLs with byte-range scrub seeking.
                  </p>
                </div>

                {/* Drop All Media Area */}
                <AudioUploader
                  isSignedIn={Boolean(user)}
                  isPro={isPro}
                  currentUserId={currentUserId}
                  onUploadSuccess={handleUploadSuccess}
                  onQuotaExceeded={() => setQuotaModalOpen(true)}
                />

                {/* Recent Converted Uploads Grid with Red Delete X Icon */}
                <RecentUploadsGrid
                  items={mediaList}
                  onOpenPlayer={handleOpenPlayer}
                  onViewAllHistory={() => setCurrentTab('history')}
                  onDeleteMedia={handleDeleteMedia}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <QuotaExceededModal
        isOpen={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        onSignInWithGoogle={handleGoogleSignIn}
      />

      <ProUpgradeModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
      />

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MediaLink. Direct Audio, Video &amp; Image URLs with RFC 206 Range streaming.</p>
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <span>Audio • Video • Image</span>
            <span>•</span>
            <span>Max 100MB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}