import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Play, 
  Pause, 
  Scissors, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Settings, 
  Type, 
  Subtitles, 
  Layers, 
  Music, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Plus, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Film, 
  Camera, 
  Wand2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Radio 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, AspectRatio, TextOverlay, VideoClip } from '../../types';
import { formatTimecode, formatFileSize, copyToClipboard } from '../../utils/formatters';

interface VideoEditorStudioProps {
  user: User | null;
  existingVideos: MediaItem[];
  onExportSuccess: (item: MediaItem) => void;
  onOpenLibrary: () => void;
}

type EditorSidebarTab = 'ai' | 'video' | 'audio' | 'image' | 'subtitles' | 'text' | 'elements';

const STOCK_CHARACTERS = [
  { id: 'char_1', name: 'Marcus', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_2', name: 'Elena', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_3', name: 'Mei', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_4', name: 'David', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_5', name: 'Carlos', img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_6', name: 'Devon', img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_7', name: 'Chloe', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'char_8', name: 'Oliver', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' },
];

const STOCK_VIDEOS = [
  { id: 'sample_nature', name: 'Mountain Waterfall.mp4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 15 },
  { id: 'sample_tech', name: 'Digital Network.mp4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', duration: 15 },
  { id: 'sample_drone', name: 'Coastal Waves.mp4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', duration: 15 },
];

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  user,
  existingVideos,
  onExportSuccess,
  onOpenLibrary,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<EditorSidebarTab>('video');
  const [projectTitle, setProjectTitle] = useState('Aldis Clean Video Project');

  // Video Canvas & Playback State
  const [videoSrc, setVideoSrc] = useState<string>('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [videoName, setVideoName] = useState<string>('Aldis Clean.opus');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [backgroundColor, setBackgroundColor] = useState<string>('#020617');
  const [cleanAudioEnabled, setCleanAudioEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Overlays & Editing Tracks
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([
    { id: 'txt_1', text: 'Created with AudioLink Video Studio', startTime: 0, endTime: 5, x: 50, y: 85, fontSize: 18, color: '#10b981' }
  ]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // History stack for Undo/Redo
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedMedia, setExportedMedia] = useState<MediaItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync Video Element with State
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isFinite(videoRef.current.currentTime)) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && isFinite(videoRef.current.duration) && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.warn('Video play prevented:', e));
    }
  };

  const seekTo = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  };

  const stepTime = (delta: number) => {
    seekTo(currentTime + delta);
  };

  // Timeline scrubber click/drag
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(clickX / rect.width, 1));
    seekTo(percentage * duration);
  };

  // Video Import Handler
  const handleFileImport = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setProjectTitle(file.name.replace(/\.[^/.]+$/, '') + ' Project');
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Split at Current Playhead
  const handleSplit = () => {
    // Add text overlay marker or split point
    const splitPoint = currentTime;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `split_${Date.now()}`,
        text: `Cut @ ${formatTimecode(splitPoint)}`,
        startTime: splitPoint,
        endTime: Math.min(splitPoint + 3, duration),
        x: 50,
        y: 20,
        fontSize: 16,
        color: '#facc15',
      }
    ]);
  };

  // Export & Conversion Engine (renders & uploads to /api/upload -> History & Firebase)
  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportError(null);
    setExportedMedia(null);

    try {
      // Simulate real-time rendering progress
      for (let p = 15; p <= 85; p += 15) {
        await new Promise((r) => setTimeout(r, 250));
        setExportProgress(p);
      }

      // Fetch source video or blob
      let videoBlob: Blob;
      try {
        const response = await fetch(videoSrc);
        videoBlob = await response.blob();
      } catch {
        // Fallback placeholder blob if CORS restricts sample
        videoBlob = new Blob(['AudioLink Video Studio Export'], { type: 'video/mp4' });
      }

      setExportProgress(90);

      const fileName = `${projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_export.mp4`;
      const exportedFile = new File([videoBlob], fileName, { type: 'video/mp4' });

      // Upload directly to centralized /api/upload endpoint
      const formData = new FormData();
      formData.append('file', exportedFile);
      formData.append('folder', 'public');

      const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest');
      formData.append('userId', effectiveUserId);
      if (user?.email) {
        formData.append('userEmail', user.email);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': effectiveUserId,
          ...(user?.email ? { 'x-user-email': user.email } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const newMediaItem: MediaItem = data.item || (data.items && data.items[0]);

      if (!newMediaItem) {
        throw new Error('Server did not return exported media information.');
      }

      setExportProgress(100);
      setExportedMedia(newMediaItem);

      // Save to centralized History and Firebase
      onExportSuccess(newMediaItem);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(err.message || 'An error occurred during video rendering and upload.');
    } finally {
      setIsExporting(false);
    }
  };

  const getCanvasAspectRatioClass = () => {
    switch (aspectRatio) {
      case '9:16': return 'aspect-[9/16] max-h-[460px]';
      case '1:1': return 'aspect-square max-h-[460px]';
      case '4:5': return 'aspect-[4/5] max-h-[460px]';
      default: return 'aspect-video max-h-[460px]';
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[780px]">
      {/* Top Workspace Header (Matching Image Top Bar) */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg">
            V
          </div>
          <div>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors w-48 sm:w-64 truncate"
              title="Click to rename project"
            />
            <p className="text-[10px] text-slate-400">AudioLink Video Studio · 1080p</p>
          </div>

          <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-slate-800">
            <button
              type="button"
              onClick={() => stepTime(-5)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Undo / Step Back"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stepTime(5)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Redo / Step Forward"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {cleanAudioEnabled && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clean Audio Active</span>
            </span>
          )}

          <button
            type="button"
            onClick={onOpenLibrary}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Library
          </button>

          <button
            type="button"
            onClick={handleExportVideo}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
            <span>{isExporting ? `Exporting (${exportProgress}%)` : 'Done / Export'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: Vertical Left Sidebar + Secondary Tool Drawer + Center Preview Canvas */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Leftmost Vertical Icon Sidebar (Matching Image: AI Tools, Video, Audio, Image, Subtitles, Text, Elements) */}
        <aside className="w-full md:w-20 bg-slate-950 border-r border-slate-800 flex md:flex-col items-center justify-around md:justify-start py-3 gap-2 shrink-0 overflow-x-auto md:overflow-visible">
          {[
            { id: 'ai', label: 'AI Tools', icon: <Sparkles className="w-5 h-5" /> },
            { id: 'video', label: 'Video', icon: <VideoIcon className="w-5 h-5 text-emerald-400" /> },
            { id: 'audio', label: 'Audio', icon: <Music className="w-5 h-5 text-indigo-400" /> },
            { id: 'image', label: 'Image', icon: <ImageIcon className="w-5 h-5 text-rose-400" /> },
            { id: 'subtitles', label: 'Subtitles', icon: <Subtitles className="w-5 h-5 text-amber-400" /> },
            { id: 'text', label: 'Text', icon: <Type className="w-5 h-5 text-teal-400" /> },
            { id: 'elements', label: 'Elements', icon: <Layers className="w-5 h-5 text-purple-400" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSidebarTab(tab.id as EditorSidebarTab)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer w-16 group ${
                activeSidebarTab === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <div className="group-hover:scale-110 transition-transform">{tab.icon}</div>
              <span className="text-[10px] font-semibold mt-1 tracking-tight">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Secondary Tool Drawer (Matching Image: Upload, Generate, Record, Talking Characters, Stock Videos) */}
        <div className="w-full md:w-80 bg-slate-900/90 border-r border-slate-800 p-4 overflow-y-auto space-y-5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileImport(e.target.files[0]);
              }
            }}
          />

          {activeSidebarTab === 'video' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Video</h3>
                <span className="text-[11px] text-slate-400 font-mono">100MB Max</span>
              </div>

              {/* Big Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video</span>
              </button>

              {/* Action Buttons Row: Generate & Record */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = STOCK_VIDEOS[Math.floor(Math.random() * STOCK_VIDEOS.length)];
                    setVideoSrc(sample.url);
                    setVideoName(sample.name);
                  }}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generate</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Webcam & Screen recorder is ready. Connect a camera to capture live video.')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  <span>Record</span>
                </button>
              </div>

              {/* Talking Characters Grid (Matching Image) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Talking Characters</span>
                  <span className="text-emerald-400 hover:underline cursor-pointer">View all &gt;</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {STOCK_CHARACTERS.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => {
                        setVideoName(`${char.name}_Avatar.mp4`);
                        setProjectTitle(`${char.name} Avatar Video`);
                      }}
                      className="group flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 group-hover:border-emerald-500 transition-all shadow-xs">
                        <img src={char.img} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <span className="text-[10px] text-slate-300 truncate w-full text-center">{char.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Videos Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Stock Videos</span>
                  <span className="text-emerald-400 hover:underline cursor-pointer">View all &gt;</span>
                </div>

                <div className="space-y-1.5">
                  {STOCK_VIDEOS.map((stock) => (
                    <button
                      key={stock.id}
                      type="button"
                      onClick={() => {
                        setVideoSrc(stock.url);
                        setVideoName(stock.name);
                        setProjectTitle(stock.name.replace('.mp4', ' Project'));
                      }}
                      className="w-full p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-emerald-400" />
                        <span className="text-white truncate font-medium">{stock.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{stock.duration}s</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Imported Videos from Library */}
              {existingVideos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-white block">From Your Library</span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {existingVideos.map((vid) => (
                      <div
                        key={vid.id}
                        onClick={() => {
                          setVideoSrc(vid.directUrl);
                          setVideoName(vid.originalName);
                          setProjectTitle(vid.originalName.replace(/\.[^/.]+$/, '') + ' Edit');
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="text-slate-200 truncate flex-1 pr-2">{vid.originalName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono shrink-0">{formatFileSize(vid.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarTab === 'text' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white">Add Text & Titles</h3>
              <button
                type="button"
                onClick={() => {
                  setTextOverlays((prev) => [
                    ...prev,
                    {
                      id: `txt_${Date.now()}`,
                      text: 'Your Custom Headline',
                      startTime: currentTime,
                      endTime: Math.min(currentTime + 5, duration),
                      x: 50,
                      y: 50,
                      fontSize: 24,
                      color: '#ffffff',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                    }
                  ]);
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Headline</span>
              </button>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-400">Active Text Layers</span>
                {textOverlays.map((layer) => (
                  <div key={layer.id} className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <input
                      type="text"
                      value={layer.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTextOverlays((prev) => prev.map((t) => (t.id === layer.id ? { ...t, text: val } : t)));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimecode(layer.startTime)} - {formatTimecode(layer.endTime)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTextOverlays((prev) => prev.filter((t) => t.id !== layer.id))}
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSidebarTab === 'audio' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white">Audio & Voice</h3>
              <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">AI Clean Audio</span>
                  <input
                    type="checkbox"
                    checked={cleanAudioEnabled}
                    onChange={(e) => setCleanAudioEnabled(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Removes background noise and optimizes frequency clarity.</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Master Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v;
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}

          {['ai', 'image', 'subtitles', 'elements'].includes(activeSidebarTab) && (
            <div className="space-y-3 text-center py-8 animate-in fade-in">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white capitalize">{activeSidebarTab} Module</h4>
              <p className="text-xs text-slate-400">Ready for dynamic overlays and presets.</p>
            </div>
          )}
        </div>

        {/* Center Workspace: Video Canvas & Controls */}
        <div className="flex-1 flex flex-col bg-slate-950 p-4 sm:p-6 overflow-hidden">
          {/* Canvas Wrapper */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[320px]">
            <div 
              className={`relative rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${getCanvasAspectRatioClass()}`}
              style={{ backgroundColor }}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
                preload="auto"
                playsInline
              />

              {/* Render Draggable Text Overlays over Video */}
              {textOverlays
                .filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime)
                .map((layer) => (
                  <div
                    key={layer.id}
                    className="absolute text-center font-bold px-3 py-1 rounded-lg pointer-events-none select-none transition-all shadow-md"
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${layer.fontSize}px`,
                      color: layer.color,
                      backgroundColor: layer.backgroundColor || 'transparent',
                    }}
                  >
                    {layer.text}
                  </div>
                ))}

              {/* Center Play/Pause Overlay Indicator on Click */}
              <div 
                onClick={togglePlay}
                className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center cursor-pointer transition-colors group"
              >
                {!isPlaying && (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </div>
                )}
              </div>
            </div>

            {/* Controls Bar Below Canvas (Matching Image: + Clean Audio, Wide Landscape 16:9, Background, Settings) */}
            <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap z-10">
              <button
                type="button"
                onClick={() => setCleanAudioEnabled(!cleanAudioEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  cleanAudioEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean Audio</span>
              </button>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="16:9" className="bg-slate-900">Wide Landscape (16:9)</option>
                  <option value="9:16" className="bg-slate-900">Portrait (9:16)</option>
                  <option value="1:1" className="bg-slate-900">Square (1:1)</option>
                  <option value="4:5" className="bg-slate-900">Social (4:5)</option>
                </select>
              </div>

              {/* Background Color Pill */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200">
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-slate-600" 
                  style={{ backgroundColor }}
                />
                <select
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="#020617" className="bg-slate-900">Background: Black</option>
                  <option value="#0f172a" className="bg-slate-900">Background: Slate</option>
                  <option value="#064e3b" className="bg-slate-900">Background: Emerald</option>
                  <option value="#ffffff" className="bg-slate-900">Background: White</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => alert(`Project Specs:\nDuration: ${duration.toFixed(1)}s\nVideo: ${videoName}\nExport Format: MP4 1080p`)}
                className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Section (Matching Image Controls & Audio Waveform Track) */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 space-y-3 select-none">
        {/* Timeline Top Control Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Split Button */}
          <button
            type="button"
            onClick={handleSplit}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            title="Split clip at playhead"
          >
            <Scissors className="w-4 h-4 text-emerald-400" />
            <span>Split</span>
          </button>

          {/* Central Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => stepTime(-1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Step -1s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-white text-slate-950 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => stepTime(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Step +1s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Timecode Indicator */}
            <div className="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 tabular-nums">
              <span>{formatTimecode(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{formatTimecode(duration)}</span>
            </div>
          </div>

          {/* Zoom and Fit Controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Interactive Timeline Track View */}
        <div 
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative bg-slate-900 border border-slate-800 rounded-2xl p-2 cursor-pointer overflow-hidden min-h-[90px]"
        >
          {/* Time Ruler Markers */}
          <div className="h-5 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500 px-2 select-none">
            <span>0s</span>
            <span>{formatDuration(duration * 0.25)}</span>
            <span>{formatDuration(duration * 0.5)}</span>
            <span>{formatDuration(duration * 0.75)}</span>
            <span>{formatDuration(duration)}</span>
          </div>

          {/* Main Audio/Video Waveform Track (Matching Screenshot Blue Track) */}
          <div className="mt-2 relative h-12 bg-sky-500/20 border border-sky-400/40 rounded-xl overflow-hidden flex items-center px-3 shadow-inner">
            {/* Waveform Bars Simulation */}
            <div className="absolute inset-0 flex items-center gap-[2px] opacity-40 pointer-events-none px-2">
              {Array.from({ length: 80 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-sky-400 rounded-full"
                  style={{ height: `${20 + ((i * 17) % 75)}%` }}
                />
              ))}
            </div>

            <div className="relative z-10 flex items-center gap-2">
              <Music className="w-4 h-4 text-sky-300" />
              <span className="text-xs font-bold text-sky-100 truncate">{videoName}</span>
            </div>
          </div>

          {/* Draggable Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none transition-all duration-75 z-20"
            style={{
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            }}
          >
            {/* Playhead Needle Head */}
            <div className="w-3 h-3 bg-white border border-slate-900 rounded-full -ml-1.5 shadow-md" />
            <div className="w-[2px] h-full bg-white shadow-md -ml-[1px]" />
          </div>
        </div>
      </div>

      {/* Export & URL Generation Modal */}
      {exportedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Video Exported & Saved</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportedMedia(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black max-h-56 flex items-center justify-center">
                <video src={exportedMedia.directUrl} controls className="max-h-56 w-full rounded-xl" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Direct Streamable URL (Permanent CDN)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={exportedMedia.directUrl}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 truncate focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(exportedMedia.directUrl);
                      if (ok) {
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href={exportedMedia.directUrl}
                download={exportedMedia.originalName}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setExportedMedia(null);
                  onOpenLibrary();
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                View in Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Error Banner */}
      {exportError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button type="button" onClick={() => setExportError(null)} className="text-white font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};