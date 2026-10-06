import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { AudioUploader } from './components/AudioUploader';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { MediaHistoryView } from './components/MediaHistoryView';
import { SharePlayerView } from './components/SharePlayerView';
import { QuotaExceededModal } from './components/QuotaExceededModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { MediaItem } from './types';
import { 
  getOrCreateGuestId, 
  getLocallyCachedHistory, 
  saveLocallyCachedHistory, 
  appendItemToLocalCache, 
  removeItemFromLocalCache 
} from './utils/userSession';
import { 
  subscribeToAuth, 
  loginWithGoogle, 
  logoutUser, 
  hasFirebaseCredentials 
} from './firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'upload' | 'history' | 'player'>('upload');
  const [user, setUser] = useState<User | null>(null);
  const [activePlayerMediaId, setActivePlayerMediaId] = useState<string | null>(null);
  const [lastUploadedMedia, setLastUploadedMedia] = useState<MediaItem | null>(null);
  
  // Instantly restores guest conversion history from persistent local storage
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => getLocallyCachedHistory());
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
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
          setCurrentTab('upload');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Sync server items with local persistent cache
  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/media?userId=${encodeURIComponent(currentUserId)}`, {
        headers: { 'X-User-Id': currentUserId },
      });
      if (res.ok) {
        const data = await res.json();
        const serverItems: MediaItem[] = data.items || [];
        
        // Merge without losing any local guest records
        setMediaList((prev) => {
          const map = new Map<string, MediaItem>();
          serverItems.forEach((i) => map.set(i.id, i));
          prev.forEach((i) => {
            if (!map.has(i.id)) map.set(i.id, i);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveLocallyCachedHistory(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Network fetch error, retaining local persistent history:', err);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [currentUserId]);

  // Real Google Sign-In with automatic guest-to-account history migration
  const handleGoogleSignIn = async () => {
    if (!hasFirebaseCredentials) {
      setConfigModalOpen(true);
      return;
    }

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
      if (err.message === 'MISSING_CONFIG') {
        setConfigModalOpen(true);
      } else if (err.code === 'auth/unauthorized-domain') {
        alert('This domain is not yet authorized in Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        alert('Google Sign-In failed: ' + (err.message || err.code));
      }
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    fetchMedia();
  };

  const handleUploadSuccess = (item: MediaItem) => {
    setLastUploadedMedia(item);
    appendItemToLocalCache(item);
    setMediaList((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
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
    if (!window.confirm('Are you sure you want to delete this file? Its direct URL will stop streaming.')) {
      return;
    }

    removeItemFromLocalCache(id);
    setMediaList((prev) => prev.filter((i) => i.id !== id));

    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (lastUploadedMedia?.id === id) setLastUploadedMedia(null);
        if (activePlayerMediaId === id) handleBackToStudio();
      }
    } catch (err) {
      console.error('Failed to delete media on server:', err);
    }
  };

  const handleNavNewUpload = () => {
    setLastUploadedMedia(null);
    handleBackToStudio();
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        currentTab={currentTab}
        user={user}
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
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {currentTab === 'player' && activePlayerMediaId ? (
          <SharePlayerView
            audioId={activePlayerMediaId}
            onBackToStudio={handleBackToStudio}
          />
        ) : currentTab === 'history' ? (
          <MediaHistoryView
            items={mediaList}
            onOpenPlayer={handleOpenPlayer}
            onDeleteMedia={handleDeleteMedia}
            onBackToStudio={handleBackToStudio}
            onRefresh={fetchMedia}
          />
        ) : (
          <div className="space-y-8">
            {lastUploadedMedia ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <UrlShareCard
                  media={lastUploadedMedia}
                  onOpenPlayer={handleOpenPlayer}
                  onUploadAnother={() => setLastUploadedMedia(null)}
                />

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Upload Another Media File
                  </h3>
                  <AudioUploader
                    isSignedIn={Boolean(user)}
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

                <AudioUploader
                  isSignedIn={Boolean(user)}
                  currentUserId={currentUserId}
                  onUploadSuccess={handleUploadSuccess}
                  onQuotaExceeded={() => setQuotaModalOpen(true)}
                />

                <RecentUploadsGrid
                  items={mediaList}
                  onOpenPlayer={handleOpenPlayer}
                  onViewAllHistory={() => setCurrentTab('history')}
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

      <FirebaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
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