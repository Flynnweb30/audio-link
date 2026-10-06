import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AudioUploader } from './components/AudioUploader';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentUploadsGrid } from './components/RecentUploadsGrid';
import { MediaHistoryView } from './components/MediaHistoryView';
import { SharePlayerView } from './components/SharePlayerView';
import { MediaItem } from './types';
import { getOrCreateUserId } from './utils/userSession';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'upload' | 'history' | 'player'>('upload');
  const [activePlayerMediaId, setActivePlayerMediaId] = useState<string | null>(null);
  const [lastUploadedMedia, setLastUploadedMedia] = useState<MediaItem | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

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

  const fetchMedia = async () => {
    try {
      const userId = getOrCreateUserId();
      const res = await fetch(`/api/media?userId=${encodeURIComponent(userId)}`, {
        headers: { 'X-User-Id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch media list:', err);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUploadSuccess = (item: MediaItem) => {
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
    if (!window.confirm('Are you sure you want to delete this file? Its direct URL will stop streaming.')) {
      return;
    }

    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (lastUploadedMedia?.id === id) setLastUploadedMedia(null);
        if (activePlayerMediaId === id) handleBackToStudio();
        fetchMedia();
      }
    } catch (err) {
      console.error('Failed to delete media:', err);
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
        onSelectTab={(tab) => {
          if (currentTab === 'player') {
            const cleanUrl = window.location.pathname;
            window.history.pushState({}, '', cleanUrl);
          }
          setCurrentTab(tab);
        }}
        onNewUpload={handleNavNewUpload}
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
                  <AudioUploader onUploadSuccess={handleUploadSuccess} />
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

                {/* Primary Upload Area */}
                <AudioUploader onUploadSuccess={handleUploadSuccess} />

                {/* Image 1 Reference: Recent Uploads Grid Below Drop Area */}
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