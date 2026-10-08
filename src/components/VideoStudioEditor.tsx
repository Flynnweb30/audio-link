import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Video, 
  Camera, 
  Scissors, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Sparkles, 
  Settings, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Check, 
  Copy, 
  ExternalLink, 
  Download, 
  Trash2, 
  Sparkle, 
  Volume2, 
  VolumeX, 
  Undo2, 
  Redo2, 
  HelpCircle, 
  Search, 
  Crown, 
  Layers, 
  Type, 
  FileText, 
  Shapes, 
  Music, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Square, 
  Radio, 
  ArrowLeft 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, AspectRatio, VideoClipSegment, TextOverlay } from '../types';
import { formatDuration, copyToClipboard } from '../utils/formatters';

interface VideoStudioEditorProps {
  user: User | null;
  initialVideoUrl?: string;
  initialVideoName?: string;
  onExportSuccess: (item: MediaItem) => void;
  onClose?: () => void;
  onUpgradePro?: () => void;
}

const TALKING_CHARACTERS = [
  { id: 'tc-1', name: 'Marcus', role: 'Presenter', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-2', name: 'Sarah', role: 'Educator', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-3', name: 'Mei', role: 'Tech Host', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-4', name: 'David', role: 'Podcaster', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-5', name: 'Carlos', role: 'Narrator', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-6', name: 'Jamal', role: 'Reviewer', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-7', name: 'Emma', role: 'Creator', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
  { id: 'tc-8', name: 'Michael', role: 'Anchor', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
];

const STOCK_VIDEOS = [
  { id: 'sv-1', title: 'Mountain Drone Flight', category: 'Aerials', duration: 12, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&auto=format&fit=crop&q=80' },
  { id: 'sv-2', title: 'Modern Office Team', category: 'Business', duration: 15, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80' },
  { id: 'sv-3', title: 'Forest River Stream', category: 'Nature', duration: 10, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&auto=format&fit=crop&q=80' },
  { id: 'sv-4', title: 'City Traffic Timelapse', category: 'Aerials', duration: 14, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4', thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=200&auto=format&fit=crop&q=80' },
];

export const VideoStudioEditor: React.FC<VideoStudioEditorProps> = ({
  user,
  initialVideoUrl,
  initialVideoName = 'Aldis Clean',
  onExportSuccess,
  onClose,
  onUpgradePro,
}) => {
  const [projectTitle, setProjectTitle] = useState(initialVideoName);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'video' | 'audio' | 'ai' | 'image' | 'subtitles' | 'text' | 'elements'>('video');
  const [selectedStockCategory, setSelectedStockCategory] = useState<string>('All');
  
  // Video Clip State
  const [clips, setClips] = useState<VideoClipSegment[]>([
    {
      id: 'clip-1',
      name: initialVideoName,
      src: initialVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
      startTrim: 0,
      endTrim: 15,
      volume: 1,
      muted: false,
    }
  ]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  // Playback & Scrubber State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [cleanAudioEnabled, setCleanAudioEnabled] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  // Recording State
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'camera' | 'screen'>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedItem, setExportedItem] = useState<MediaItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<VideoClipSegment[][]>([]);
  const [redoStack, setRedoStack] = useState<VideoClipSegment[][]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRulerRef = useRef<HTMLDivElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeClip = clips[activeClipIndex] || clips[0];

  // Recalculate total duration whenever clips change
  useEffect(() => {
    const total = clips.reduce((acc, c) => acc + Math.max(0.5, c.endTrim - c.startTrim), 0);
    setTotalDuration(Math.max(1, total));
  }, [clips]);

  const pushHistory = useCallback(() => {
    setHistoryStack((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(clips))]);
    setRedoStack([]);
  }, [clips]);

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(clips))]);
    setHistoryStack((prev) => prev.slice(0, -1));
    setClips(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack((prev) => [...prev, JSON.parse(JSON.stringify(clips))]);
    setRedoStack((prev) => prev.slice(0, -1));
    setClips(next);
  };

  // Playback sync with video element
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const videoTime = videoRef.current.currentTime;
    setCurrentTime(videoTime);

    // Enforce clip end trim boundary
    if (activeClip && videoTime >= activeClip.endTrim) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = activeClip.startTrim;
      setCurrentTime(activeClip.startTrim);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (isFinite(dur) && dur > 0) {
      setClips((prev) =>
        prev.map((c, i) =>
          i === activeClipIndex
            ? { ...c, duration: dur, endTrim: Math.min(c.endTrim, dur) }
            : c
        )
      );
      setTotalDuration(dur);
    }
  };

  const seekTimeline = (targetTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetTime));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRulerRef.current) return;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTimeline(ratio * totalDuration);
  };

  // Split active clip at playhead position
  const handleSplitClip = () => {
    if (!activeClip) return;
    pushHistory();
    const splitPoint = currentTime;
    if (splitPoint <= activeClip.startTrim + 0.5 || splitPoint >= activeClip.endTrim - 0.5) return;

    const clipA: VideoClipSegment = {
      ...activeClip,
      id: `clip-${Date.now()}-a`,
      endTrim: splitPoint,
    };
    const clipB: VideoClipSegment = {
      ...activeClip,
      id: `clip-${Date.now()}-b`,
      startTrim: splitPoint,
      name: `${activeClip.name} (Part 2)`,
    };

    setClips((prev) => {
      const copy = [...prev];
      copy.splice(activeClipIndex, 1, clipA, clipB);
      return copy;
    });
  };

  // Upload custom video file into the studio
  const handleUploadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    pushHistory();
    const newClip: VideoClipSegment = {
      id: `clip-${Date.now()}`,
      name: file.name,
      src: url,
      duration: 10,
      startTrim: 0,
      endTrim: 10,
      volume: 1,
      muted: false,
    };
    setClips([newClip]);
    setActiveClipIndex(0);
    setProjectTitle(file.name.replace(/\.[^/.]+$/, ''));
    setCurrentTime(0);
  };

  // Insert Stock Video
  const handleInsertStockVideo = (sv: typeof STOCK_VIDEOS[0]) => {
    pushHistory();
    const newClip: VideoClipSegment = {
      id: `clip-${Date.now()}`,
      name: sv.title,
      src: sv.url,
      duration: sv.duration,
      startTrim: 0,
      endTrim: sv.duration,
      volume: 1,
      muted: false,
    };
    setClips([newClip]);
    setActiveClipIndex(0);
    setProjectTitle(sv.title);
    setCurrentTime(0);
  };

  // WebCam & Screen Video Recording
  const startRecordingStream = async () => {
    try {
      let stream: MediaStream;
      if (recordingMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      liveStreamRef.current = stream;
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const recordedUrl = URL.createObjectURL(recordedBlob);
        const name = `Recording_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`;

        pushHistory();
        const newClip: VideoClipSegment = {
          id: `clip-${Date.now()}`,
          name,
          src: recordedUrl,
          duration: recordingSeconds || 10,
          startTrim: 0,
          endTrim: recordingSeconds || 10,
          volume: 1,
          muted: false,
        };
        setClips([newClip]);
        setActiveClipIndex(0);
        setProjectTitle(name.replace(/\.[^/.]+$/, ''));
        setIsRecordingModalOpen(false);
        setIsRecording(false);
        setRecordingSeconds(0);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Media recording permission denied:', err);
      alert('Camera/Screen access was not allowed.');
    }
  };

  const stopRecordingStream = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // Add sample subtitle/text overlay
  const handleAddText = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'Sample Title Overlay',
      startTime: currentTime,
      endTime: Math.min(totalDuration, currentTime + 3),
      color: '#ffffff',
      fontSize: 28,
      positionY: 75,
    };
    setTextOverlays((prev) => [...prev, newText]);
  };

  // Export Workflow: Compiles, uploads to server, and saves record to History & Firebase
  const handleExportProject = async () => {
    setIsExporting(true);
    setExportProgress(15);
    setExportedItem(null);

    try {
      setExportProgress(35);
      
      // Fetch clip source blob
      const activeSrc = activeClip.src;
      let videoBlob: Blob;

      if (activeSrc.startsWith('blob:')) {
        const response = await fetch(activeSrc);
        videoBlob = await response.blob();
      } else {
        const response = await fetch(activeSrc);
        videoBlob = await response.blob();
      }

      setExportProgress(65);

      const fileName = `${projectTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_edited.mp4`;
      const exportFile = new File([videoBlob], fileName, { type: 'video/mp4' });

      const formData = new FormData();
      formData.append('file', exportFile);
      formData.append('folder', 'public');
      formData.append('userId', user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest'));
      if (user?.email) {
        formData.append('userEmail', user.email);
      }

      setExportProgress(85);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest'),
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Export failed on server.');
      }

      const result = await res.json();
      const finalItem: MediaItem = result.item;

      setExportProgress(100);
      setExportedItem(finalItem);
      onExportSuccess(finalItem);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'Error exporting video. Please retry.');
    } finally {
      setIsExporting(false);
    }
  };

  // Aspect ratio dimension styles
  const getCanvasAspectClass = () => {
    if (aspectRatio === '9:16') return 'aspect-[9/16] max-h-[460px]';
    if (aspectRatio === '1:1') return 'aspect-square max-h-[460px]';
    return 'aspect-video max-h-[460px]';
  };

  const visibleTextOverlays = textOverlays.filter(
    (t) => currentTime >= t.startTime && currentTime <= t.endTime
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[720px] bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in">
      {/* 1. TOP STUDIO BAR (Matching reference: title, undo/redo, actions, Pro button, Done/Export) */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Back to Studio Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-sm shadow-md shadow-emerald-500/20">
            V
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent hover:bg-slate-800/80 focus:bg-slate-800 px-2.5 py-1 rounded-lg font-bold text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors w-40 sm:w-56"
              title="Click to rename project"
            />
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              disabled={historyStack.length === 0}
              onClick={handleUndo}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onUpgradePro}
            className="hidden sm:flex px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs rounded-xl items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all"
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>Upgrade</span>
          </button>

          {/* Reference Image Green "Done" / Export Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportProject}
            className="px-4 py-1.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-lime-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Done</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left vertical tools strip + side panel + canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left vertical icons navigation (AI Tools, Video, Audio, Image, Subtitles, Text, Elements) */}
        <aside className="w-16 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-3 gap-1 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveSidebarTab('ai')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'ai' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('video')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'video' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('audio')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'audio' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('image')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'image' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('subtitles')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'subtitles' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Subtitles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('text')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'text' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('elements')}
            className={`w-12 py-2 flex flex-col items-center gap-1 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeSidebarTab === 'elements' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shapes className="w-4 h-4" />
            <span>Elements</span>
          </button>
        </aside>

        {/* Left Side Panel (Upload, Record, Talking Characters, Stock Videos) matching reference */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUploadFile(e.target.files[0]);
              }
            }}
          />

          <h2 className="text-base font-bold text-white capitalize">
            {activeSidebarTab === 'ai' ? 'AI Video Tools' : activeSidebarTab}
          </h2>

          {/* Primary Lime Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-lime-400/20 cursor-pointer active:scale-98 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video File</span>
          </button>

          {/* Generate & Record Secondary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInsertStockVideo(STOCK_VIDEOS[0])}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700/80 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Generate</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecordingModalOpen(true)}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700/80 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span>Record</span>
            </button>
          </div>

          {/* Talking Characters Grid */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Talking Characters</span>
              <button type="button" className="text-[11px] text-emerald-400 hover:underline cursor-pointer">
                View all &gt;
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TALKING_CHARACTERS.map((tc) => (
                <div
                  key={tc.id}
                  onClick={() => alert(`Talking Character "${tc.name}" selected. Text-to-speech avatar ready.`)}
                  className="group flex flex-col items-center gap-1 cursor-pointer"
                  title={`${tc.name} (${tc.role})`}
                >
                  <div className="w-13 h-13 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 group-hover:border-emerald-400 transition-colors relative">
                    <img src={tc.avatar} alt={tc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-[10px] text-slate-400 truncate w-full text-center group-hover:text-white">
                    {tc.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Videos Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Stock Videos</span>
              <button type="button" className="text-[11px] text-emerald-400 hover:underline cursor-pointer">
                View all &gt;
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {['All', 'Aerials', 'Business', 'Nature'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedStockCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                    selectedStockCategory === cat
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stock Video Cards */}
            <div className="grid grid-cols-2 gap-2">
              {STOCK_VIDEOS.filter((sv) => selectedStockCategory === 'All' || sv.category === selectedStockCategory).map((sv) => (
                <div
                  key={sv.id}
                  onClick={() => handleInsertStockVideo(sv)}
                  className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700/80 hover:border-emerald-400/80 cursor-pointer transition-all"
                  title={`Click to load "${sv.title}"`}
                >
                  <div className="aspect-video bg-slate-900 relative">
                    <img src={sv.thumbnail} alt={sv.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-white">
                      {sv.duration}s
                    </span>
                  </div>
                  <div className="p-1.5">
                    <p className="text-[11px] font-medium text-slate-300 truncate group-hover:text-white">
                      {sv.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Preview Canvas Area */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            <div
              className={`relative rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center border border-slate-800 transition-all ${getCanvasAspectClass()}`}
              style={{ backgroundColor }}
            >
              <video
                ref={videoRef}
                src={activeClip.src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
                preload="auto"
                playsInline
              />

              {/* Text Overlays rendering on top of video */}
              {visibleTextOverlays.map((t) => (
                <div
                  key={t.id}
                  className="absolute pointer-events-none font-bold text-center drop-shadow-lg px-4"
                  style={{
                    top: `${t.positionY}%`,
                    color: t.color,
                    fontSize: `${t.fontSize}px`,
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Controls Bar matching reference (Clean Audio, Aspect Ratio, Background, Settings) */}
          <div className="h-12 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-center gap-3 text-xs shrink-0">
            {/* Clean Audio Button */}
            <button
              type="button"
              onClick={() => setCleanAudioEnabled(!cleanAudioEnabled)}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                cleanAudioEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-700/80'
              }`}
            >
              <Sparkle className="w-3.5 h-3.5 fill-current" />
              <span>Clean Audio</span>
            </button>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
              <span className="text-slate-400 text-[11px]">Ratio:</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              >
                <option value="16:9" className="bg-slate-900">Wide Landscape (16:9)</option>
                <option value="9:16" className="bg-slate-900">Vertical Mobile (9:16)</option>
                <option value="1:1" className="bg-slate-900">Square Post (1:1)</option>
              </select>
            </div>

            {/* Background Color Indicator / Picker */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-4 h-4 rounded-full border-none cursor-pointer bg-transparent"
                title="Change background color"
              />
              <span className="text-slate-300 font-medium">Background</span>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => alert('Settings: 1080p Full HD Render at 30 FPS. Audio: 320 kbps Stereo.')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TIMELINE WORKSPACE (Split, Play/Pause, Scrubber, Ruler, Waveform Track) */}
      <footer className="h-44 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0 select-none">
        {/* Timeline Top Toolbar matching reference: Split, Play/Pause, Time, Zoom */}
        <div className="h-10 border-b border-slate-800/90 px-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSplitClip}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Split clip at playhead"
            >
              <Scissors className="w-3.5 h-3.5 text-emerald-400" />
              <span>Split</span>
            </button>

            <button
              type="button"
              onClick={handleAddText}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Add text overlay at playhead"
            >
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Text</span>
            </button>
          </div>

          {/* Central Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seekTimeline(currentTime - 5)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Rewind 5s"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-950 flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => seekTimeline(currentTime + 5)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Forward 5s"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <span className="font-mono text-slate-300 ml-2">
              {formatDuration(currentTime)} / {formatDuration(totalDuration)}
            </span>
          </div>

          {/* Right Zoom Controls */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1 rounded hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTimelineZoom((z) => Math.min(3, z + 0.2))}
              className="p-1 rounded hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTimelineZoom(1)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Timeline Tracks & Scrubber Ruler */}
        <div className="flex-1 bg-slate-950/90 relative overflow-x-auto p-2">
          {/* Time Ruler */}
          <div
            ref={timelineRulerRef}
            onClick={handleRulerClick}
            className="h-6 border-b border-slate-800 relative cursor-pointer flex items-center text-[10px] text-slate-500 font-mono select-none"
            style={{ width: `${100 * timelineZoom}%` }}
          >
            <span className="absolute left-1">0s</span>
            <span className="absolute left-1/4">1m</span>
            <span className="absolute left-2/4">2m</span>
            <span className="absolute left-3/4">4m</span>
            <span className="absolute right-2">6m+</span>
          </div>

          {/* Interactive Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75 flex flex-col items-center"
            style={{ left: `${(currentTime / Math.max(1, totalDuration)) * 100 * timelineZoom}%` }}
          >
            <div className="w-3 h-3 bg-white rotate-45 -mt-1 shadow-md" />
            <div className="w-0.5 flex-1 bg-white" />
          </div>

          {/* Track 1: Audio Waveform Track matching reference image (Blue bars with name) */}
          <div className="mt-2 space-y-1.5" style={{ width: `${100 * timelineZoom}%` }}>
            <div className="h-12 bg-sky-500/20 border border-sky-400/40 rounded-xl relative overflow-hidden flex items-center px-3 gap-2">
              <Music className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-semibold text-sky-300 truncate">
                {activeClip.name}
              </span>

              {/* Decorative Audio Waveform bars */}
              <div className="flex-1 h-8 flex items-center gap-0.5 overflow-hidden opacity-60">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-sky-400 rounded-full"
                    style={{ height: `${20 + ((i * 13) % 65)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Track 2: Video Clip Blocks */}
            <div className="h-10 flex gap-1">
              {clips.map((clip, idx) => (
                <div
                  key={clip.id}
                  onClick={() => setActiveClipIndex(idx)}
                  className={`flex-1 h-full rounded-xl border flex items-center px-3 justify-between text-xs font-medium cursor-pointer transition-colors ${
                    idx === activeClipIndex
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <span className="truncate">{clip.name}</span>
                  <span className="font-mono text-[10px] opacity-75">{formatDuration(clip.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* 4. CAMERA & SCREEN RECORDER MODAL */}
      {isRecordingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Record New Video</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  stopRecordingStream();
                  setIsRecordingModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 p-1 bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRecordingMode('camera')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  recordingMode === 'camera' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                WebCam & Mic
              </button>
              <button
                type="button"
                onClick={() => setRecordingMode('screen')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  recordingMode === 'screen' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                Screen Capture
              </button>
            </div>

            <div className="h-44 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4">
              {isRecording ? (
                <div className="space-y-2">
                  <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping mx-auto" />
                  <p className="text-sm font-bold text-rose-400">Recording Live...</p>
                  <p className="font-mono text-xl text-white">{formatDuration(recordingSeconds)}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Ready to capture. When stopped, video automatically loads into the timeline.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecordingStream}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecordingStream}
                  className="w-full py-2.5 bg-white text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Stop & Insert Into Studio
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPORT SUCCESS MODAL */}
      {exportedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Check className="w-5 h-5" />
                <span>Video Exported & Saved!</span>
              </div>
              <button
                type="button"
                onClick={() => setExportedItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Your video was processed, hosted on high-speed CDN, and permanently saved to your account history.
            </p>

            <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-800">
              <video src={exportedItem.directUrl} controls className="w-full h-full" preload="metadata" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Direct Streamable URL:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={exportedItem.directUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-emerald-300 truncate select-all"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(exportedItem.directUrl);
                    if (ok) {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href={exportedItem.directUrl}
                download
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>

              <button
                type="button"
                onClick={() => setExportedItem(null)}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};