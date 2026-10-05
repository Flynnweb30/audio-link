import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AudioUploader } from './components/AudioUploader';
import { UrlShareCard } from './components/UrlShareCard';
import { RecentAudiosList } from './components/RecentAudiosList';
import { SharePlayerView } from './components/SharePlayerView';
import { SystemFeatures } from './components/SystemFeatures';
import { AudioItem } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'upload' | 'history' | 'player'>('upload');
  const [activePlayerAudioId, setActivePlayerAudioId] = useState<string | null>(null);
  const [lastUploadedAudio, setLastUploadedAudio] = useState<AudioItem | null>(null);
  const [audioList, setAudioList] = useState<AudioItem[]>([]);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const playId = params.get('play') || params.get('audio');
      if (playId) {
        setActivePlayerAudioId(playId);
        setCurrentTab('player');
      } else {
        setActivePlayerAudioId(null);
        if (currentTab === 'player') {
          setCurrentTab('upload');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const fetchAudios = async () => {
    try {
      const res = await fetch('/api/audios');
      if (res.ok) {
        const data = await res.json();
        setAudioList(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch audio list:', err);
    }
  };

  useEffect(() => {
    fetchAudios();
  }, []);

  const handleUploadSuccess = (item: AudioItem) => {
    setLastUploadedAudio(item);
    fetchAudios();
    setTimeout(() => {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 100);
  };

  const handleOpenPlayer = (id: string) => {
    setActivePlayerAudioId(id);
    setCurrentTab('player');
    const newUrl = `${window.location.pathname}?play=${id}`;
    window.history.pushState({ playId: id }, '', newUrl);
  };

  const handleBackToStudio = () => {
    setActivePlayerAudioId(null);
    setCurrentTab('upload');
    const cleanUrl = window.location.pathname;
    window.history.pushState({}, '', cleanUrl);
  };

  const handleDeleteAudio = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this audio file? Its direct URL will stop streaming.')) {
      return;
    }

    try {
      const res = await fetch(`/api/audio/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (lastUploadedAudio?.id === id) {
          setLastUploadedAudio(null);
        }
        if (activePlayerAudioId === id) {
          handleBackToStudio();
        }
        fetchAudios();
      }
    } catch (err) {
      console.error('Failed to delete audio:', err);
    }
  };

  const handleSelectSample = (sampleId: string) => {
    const found = audioList.find((a) => a.id === sampleId);
    if (found) {
      setLastUploadedAudio(found);
      setTimeout(() => {
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }, 100);
    } else {
      handleOpenPlayer(sampleId);
    }
  };

  const handleNavNewUpload = () => {
    setLastUploadedAudio(null);
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
        {currentTab === 'player' && activePlayerAudioId ? (
          <SharePlayerView
            audioId={activePlayerAudioId}
            onBackToStudio={handleBackToStudio}
          />
        ) : currentTab === 'history' ? (
          <div className="space-y-6">
            <RecentAudiosList
              items={audioList}
              onOpenPlayer={handleOpenPlayer}
              onDeleteAudio={handleDeleteAudio}
              onRefresh={fetchAudios}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {lastUploadedAudio ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <UrlShareCard
                  audio={lastUploadedAudio}
                  onOpenPlayer={handleOpenPlayer}
                  onUploadAnother={() => setLastUploadedAudio(null)}
                />

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Upload Another Audio File
                  </h3>
                  <AudioUploader
                    onUploadSuccess={handleUploadSuccess}
                    onSelectSample={handleSelectSample}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Audio to Direct Stream URL
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Convert MP3, WAV, M4A, OGG, or FLAC files into permanent streaming URLs with byte-range scrub support and auto-playing web player links.
                  </p>
                </div>

                <AudioUploader
                  onUploadSuccess={handleUploadSuccess}
                  onSelectSample={handleSelectSample}
                />
              </div>
            )}

            {audioList.length > 0 && !lastUploadedAudio && (
              <RecentAudiosList
                items={audioList}
                onOpenPlayer={handleOpenPlayer}
                onDeleteAudio={handleDeleteAudio}
                onRefresh={fetchAudios}
              />
            )}

            <SystemFeatures />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AudioLink. Direct audio URLs with RFC 206 Range streaming.</p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>MP3 / WAV / M4A / OGG / FLAC / WEBM</span>
            <span aria-hidden="true">·</span>
            <span>Max 50MB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}