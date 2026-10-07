/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from './firebase/config';
import { 
  saveMediaToFirestore, 
  subscribeToUserMedia, 
  migrateGuestItemsToUser,
  deleteMediaFromFirestore 
} from './firebase/historySync';
import { getGuestQuota, deductGuestCredit, deductGuestCredits, GuestQuota } from './utils/quota';
import { 
  getLocalGuestHistory, 
  saveLocalGuestItem, 
  saveLocalGuestItems,
  removeLocalGuestItem, 
  clearLocalGuestHistory 
} from './utils/localHistory';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AudioUploader } from './components/AudioUploader';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { FullHistoryModal } from './components/FullHistoryModal';
import { ProPricingModal } from './components/ProPricingModal';
import { ApiAccessModal } from './components/ApiAccessModal';
import { SharePlayerView } from './components/SharePlayerView';
import { SystemFeatures } from './components/SystemFeatures';
import { MediaItem, HistoryAction } from './types';
import { sortHistory, markHistoryAction } from './utils/history';
import { Seo } from './components/Seo';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'landing' | 'upload' | 'history' | 'player'>('landing');
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [lastUploadedMedia, setLastUploadedMedia] = useState<MediaItem | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [guestQuota, setGuestQuota] = useState<GuestQuota>(getGuestQuota());

  // Check URL query parameters (?view=:id or ?play=:id)
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const mediaId = params.get('view') || params.get('play') || params.get('audio');
      if (mediaId) {
        setActiveMediaId(mediaId);
        setCurrentTab('player');
      } else {
        setActiveMediaId(null);
        if (currentTab === 'player') {
          setCurrentTab('upload');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const fetchServerMedia = async () => {
    try {
      const localGuest = getLocalGuestHistory();
      const res = await fetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        const serverItems: MediaItem[] = Array.isArray(data.items) ? data.items : [];
        const serverMap = new Map(serverItems.map((item) => [item.id, item]));

        // Server remains authoritative for file existence, while local guest
        // action/error metadata is preserved so History does not jump backward.
        const mergedMap = new Map<string, MediaItem>();
        serverItems.forEach((serverItem) => {
          const localItem = localGuest.find((item) => item.id === serverItem.id);
          mergedMap.set(serverItem.id, localItem
            ? { ...serverItem, ...pickHistoryMetadata(localItem, serverItem) }
            : { ...serverItem, status: serverItem.status || 'success' });
        });

        // Keep only local error/pending records that have no server file.
        localGuest
          .filter((item) => !serverMap.has(item.id) && item.status === 'error')
          .forEach((item) => mergedMap.set(item.id, item));

        const merged = sortHistory(Array.from(mergedMap.values()));
        setMediaList(merged);
        saveLocalGuestItems(merged.filter((item) => item.status === 'error'));
      } else {
        setMediaList(localGuest);
      }
    } catch (err) {
      console.warn('Failed to fetch media list from server, using local history:', err);
      setMediaList(getLocalGuestHistory());
    }
  };

  const pickHistoryMetadata = (localItem: MediaItem, serverItem: MediaItem): Partial<MediaItem> => ({
    status: serverItem.status || localItem.status || 'success',
    lastAction: localItem.lastAction || serverItem.lastAction,
    lastActionAt: localItem.lastActionAt || serverItem.lastActionAt,
    updatedAt: localItem.updatedAt || serverItem.updatedAt || serverItem.createdAt,
    error: localItem.error,
  });

  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        firestoreUnsubscribe = subscribeToUserMedia(currentUser.uid, (syncedItems) => {
          setMediaList(syncedItems);
        });

        const guestItems = getLocalGuestHistory();
        if (guestItems.length > 0) {
          await migrateGuestItemsToUser(currentUser.uid, guestItems);
          clearLocalGuestHistory();
        }
      } else {
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        setGuestQuota(getGuestQuota());
        fetchServerMedia();
      }
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) firestoreUnsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err?.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this domain to sign in with Google.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not yet listed in Firebase Authorized Domains. Add this domain in your Firebase Authentication settings.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setGuestQuota(getGuestQuota());
      fetchServerMedia();
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const persistHistoryItem = async (item: MediaItem) => {
    setMediaList((prev) => sortHistory([item, ...prev.filter((existing) => existing.id !== item.id)]));
    if (user) {
      try {
        await saveMediaToFirestore(user.uid, item);
      } catch (error) {
        console.error('History sync failed:', error);
        setMediaList((prev) =>
          prev.map((existing) =>
            existing.id === item.id
              ? {
                  ...existing,
                  status: existing.status === 'success' ? 'success' : existing.status,
                  error: `History sync pending: ${error instanceof Error ? error.message : 'Firestore unavailable'}`,
                }
              : existing
          )
        );
      }
    } else {
      saveLocalGuestItem(item);
    }
  };

  const handleUploadSuccess = async (item: MediaItem) => {
    if (!item) return;
    const completed = markHistoryAction({ ...item, status: 'success' }, 'upload', {
      status: 'success',
      error: undefined,
    });
    setLastUploadedMedia(completed);

    if (!user) {
      deductGuestCredit();
      setGuestQuota(getGuestQuota());
    }
    await persistHistoryItem(completed);

    if (!user) await fetchServerMedia();

    setTimeout(() => window.scrollTo({ top: 120, behavior: 'smooth' }), 100);
  };

  const handleUploadError = async (item: MediaItem) => {
    if (!item) return;
    await persistHistoryItem(item);
  };

  const handleBatchUploadSuccess = async (items: MediaItem[]) => {
    if (!items?.length) return;

    const completedItems = items.map((item) =>
      markHistoryAction({ ...item, status: 'success' }, 'upload', {
        status: 'success',
        error: undefined,
      })
    );

    setLastUploadedMedia(completedItems[0]);
    if (!user) {
      deductGuestCredits(completedItems.length);
      setGuestQuota(getGuestQuota());
    }

    setMediaList((prev) => sortHistory([
      ...completedItems,
      ...prev.filter((existing) => !completedItems.some((item) => item.id === existing.id)),
    ]));

    if (user) {
      const results = await Promise.allSettled(
        completedItems.map((item) => saveMediaToFirestore(user.uid, item))
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`History sync failed for ${completedItems[index].id}:`, result.reason);
        }
      });
    } else {
      saveLocalGuestItems(completedItems);
      await fetchServerMedia();
    }

    setTimeout(() => window.scrollTo({ top: 120, behavior: 'smooth' }), 100);
  };

  const handleRecordAction = async (id: string, action: HistoryAction) => {
    const existing = mediaList.find((item) => item.id === id);
    if (!existing) return;

    const updated = markHistoryAction(existing, action);
    setMediaList((prev) => sortHistory(prev.map((item) => item.id === id ? updated : item)));

    try {
      await fetch(`/api/media/${encodeURIComponent(id)}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || 'guest',
        },
        body: JSON.stringify({ action }),
      });
    } catch (error) {
      console.warn('Server action sync failed:', error);
    }

    if (user) {
      try {
        await saveMediaToFirestore(user.uid, updated);
      } catch (error) {
        console.warn('Failed to persist media action:', error);
      }
    } else {
      saveLocalGuestItem(updated);
    }
  };

  const handleOpenViewer = (id: string) => {
    void handleRecordAction(id, 'preview');
    setActiveMediaId(id);
    setCurrentTab('player');
    window.history.pushState({ mediaId: id }, '', `${window.location.pathname}?view=${encodeURIComponent(id)}`);
  };

  const handleBackToStudio = () => {
    setActiveMediaId(null);
    setCurrentTab('upload');
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleDeleteMedia = async (id: string) => {
    const existing = mediaList.find((item) => item.id === id);
    if (!existing) return;

    try {
      const response = await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      let payload: any = null;
      try { payload = await response.json(); } catch {}

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Delete failed with HTTP ${response.status}.`);
      }

      const deleted = markHistoryAction(existing, 'delete', {
        status: 'success',
        error: undefined,
      });

      // A successful server delete is final. Remove the history record next.
      if (user) {
        await deleteMediaFromFirestore(user.uid, id);
      } else {
        removeLocalGuestItem(id);
      }

      setMediaList((prev) => prev.filter((item) => item.id !== id));
      if (lastUploadedMedia?.id === id) setLastUploadedMedia(null);
      if (activeMediaId === id) handleBackToStudio();

      void deleted;
    } catch (error) {
      const failed = markHistoryAction(existing, 'error', {
        status: 'delete_error',
        error: error instanceof Error ? error.message : 'Unable to delete media.',
      });
      await persistHistoryItem(failed);
      console.error('Failed to delete media:', error);
    }
  };

  const handleSelectItemFromHistory = (item: MediaItem) => {
    setHistoryModalOpen(false);
    setLastUploadedMedia(item);
    setCurrentTab('upload');
    setTimeout(() => {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 100);
  };

  const handleNavNewUpload = () => {
    setLastUploadedMedia(null);
    setCurrentTab('upload');
    const cleanUrl = window.location.pathname;
    window.history.pushState({}, '', cleanUrl);
  };

  return (
    <>
      <Seo currentTab={currentTab} media={activeMediaId ? mediaList.find((item) => item.id === activeMediaId) : undefined} />
      <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (currentTab === 'player') {
            const cleanUrl = window.location.pathname;
            window.history.pushState({}, '', cleanUrl);
          }
          setCurrentTab(tab);
        }}
        onNewUpload={handleNavNewUpload}
        onOpenFullHistory={() => setHistoryModalOpen(true)}
        onOpenPricing={() => setPricingModalOpen(true)}
        onOpenApiModal={() => setApiModalOpen(true)}
        user={user}
        guestRemaining={guestQuota.remaining}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSigningIn={isSigningIn}
      />

      {authError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <span>{authError}</span>
            <button
              onClick={() => setAuthError(null)}
              className="text-amber-700 hover:text-amber-900 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentTab === 'player' && activeMediaId ? (
          <SharePlayerView
            mediaId={activeMediaId}
            onBackToStudio={handleBackToStudio}
            onDeleteMedia={handleDeleteMedia}
            onMediaAction={handleRecordAction}
          />
        ) : currentTab === 'landing' ? (
          <LandingPage
            onLaunchStudio={() => setCurrentTab('upload')}
            onOpenPricing={() => setPricingModalOpen(true)}
            onOpenApiModal={() => setApiModalOpen(true)}
          />
        ) : (
          /* Media Studio View */
          <div className="space-y-8 animate-in fade-in duration-200">
            {lastUploadedMedia ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <UrlShareCard
                  media={lastUploadedMedia}
                  onOpenPlayer={handleOpenViewer}
                  onUploadAnother={() => setLastUploadedMedia(null)}
                  onDeleteMedia={handleDeleteMedia}
                />

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Upload Another Media File
                  </h3>
                  <AudioUploader
                    onUploadSuccess={handleUploadSuccess}
                    onBatchUploadSuccess={handleBatchUploadSuccess}
                    onSelectSample={(sampleId) => {
                      const found = mediaList.find((m) => m.id === sampleId);
                      if (found) setLastUploadedMedia(found);
                    }}
                    user={user}
                    guestRemaining={guestQuota.remaining}
                    onSignIn={handleSignIn}
                    isSigningIn={isSigningIn}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Audio, Video & Image to Direct URL
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Upload MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, or AVIF. Generates direct streamable URLs that end with the real extension and play or render in-browser.
                  </p>
                </div>

                <AudioUploader
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  onBatchUploadSuccess={handleBatchUploadSuccess}
                  onSelectSample={(sampleId) => {
                    const found = mediaList.find((m) => m.id === sampleId);
                    if (found) setLastUploadedMedia(found);
                  }}
                  user={user}
                  guestRemaining={guestQuota.remaining}
                  onSignIn={handleSignIn}
                  isSigningIn={isSigningIn}
                />
              </div>
            )}

            {/* Centralized Per-User Recent Uploads Grid (only displays if files exist) */}
            {mediaList.length > 0 && (
              <RecentUploadsGrid
                items={mediaList}
                onOpenHistory={() => setHistoryModalOpen(true)}
                onSelectItem={handleSelectItemFromHistory}
              />
            )}

            <SystemFeatures />
          </div>
        )}
      </main>

      {/* Full History Modal */}
      <FullHistoryModal
        items={mediaList}
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onSelectItem={handleSelectItemFromHistory}
        onDeleteItem={handleDeleteMedia}
        onMediaAction={handleRecordAction}
      />

      {/* Pro Pricing & Strategy Modal */}
      <ProPricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        user={user}
        onSignIn={handleSignIn}
      />

      {/* Developer API Access Modal */}
      <ApiAccessModal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AudioLink. Direct media URLs with HTTP 206 streaming.</p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Audio · Video · Images</span>
            <span aria-hidden="true">·</span>
            <span>{user ? 'Unlimited Account Plan' : `${guestQuota.remaining}/30 Monthly Free Credits`}</span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
