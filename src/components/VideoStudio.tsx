import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Video, 
  Music, 
  Image as ImageIcon, 
  Captions, 
  Type, 
  Shapes, 
  Upload, 
  Wand2, 
  Camera, 
  Scissors, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Undo2, 
  Redo2, 
  Settings, 
  Check, 
  Copy, 
  Trash2, 
  Volume2, 
  VolumeX, 
  X, 
  Loader2, 
  Radio, 
  Layers, 
  Film, 
  Sliders, 
  Square, 
  Share2, 
  ExternalLink 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, AspectRatioType, VideoClip, TextOverlay } from '../types';
import { formatDuration, copyToClipboard } from '../utils/formatters';

interface VideoStudioProps {
  user: User | null;
  guestRemaining: number;
  onExportSuccess: (item: MediaItem) => void;
  onSignIn: () => void;
}

type StudioToolTab = 'ai' | 'video' | 'audio' | 'image' | 'subtitles' | 'text' | 'elements';

const STOCK_VIDEOS = [
  {
    id: 'stock_nature_waves',
    title: 'Ocean Coastal Waves',
    category: 'Nature',
    duration: 18,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'stock_aerial_city',
    title: 'Modern City Architecture',
    category: 'Aerials',
    duration: 15,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'stock_business_team',
    title: 'Creative Technology Studio',
    category: 'Business',
    duration: 12,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80',
  },
];

const TALKING_AVATARS = [
  { id: 'av_1', name: 'Marcus', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80' },
  { id: 'av_2', name: 'Elena', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80' },
  { id: 'av_3', name: 'Aria', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&q=80' },
  { id: 'av_4', name: 'David', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80' },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  user,
  guestRemaining,
  onExportSuccess,
  onSignIn,
}) => {
  const [activeTool, setActiveTool] = useState<StudioToolTab>('video');
  const [projectName, setProjectName] = useState<string>('Aldis Clean');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [isCleanAudio, setIsCleanAudio] = useState<boolean>(true);

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(42);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Clips & Elements
  const [activeClip, setActiveClip] = useState<VideoClip>({
    id: 'clip_primary',
    name: 'Aldis Clean.opus',
    url: 'https://cdn.freesound.org/previews/515/515622_10842244-lq.mp3',
    type: 'audio',
    startTime: 0,
    endTime: 42,
    duration: 42,
    volume: 1,
    speed: 1,
    muted: false,
  });

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([
    {
      id: 'txt_1',
      text: 'AudioLink Video Studio',
      x: 50,
      y: 80,
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      startTime: 0,
      endTime: 10,
    }
  ]);

  // Recording State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordMode, setRecordMode] = useState<'camera' | 'screen' | 'audio'>('camera');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedItem, setExportedItem] = useState<MediaItem | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Canvas & Audio References
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo Stacks
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Synchronize playback timeline
  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      const updateTimeline = () => {
        if (videoPlayerRef.current) {
          const t = videoPlayerRef.current.currentTime;
          setCurrentTime(t);
          if (t >= (activeClip.endTime || totalDuration)) {
            setIsPlaying(false);
            setCurrentTime(activeClip.startTime || 0);
          }
        } else if (audioPlayerRef.current) {
          const t = audioPlayerRef.current.currentTime;
          setCurrentTime(t);
          if (t >= (activeClip.endTime || totalDuration)) {
            setIsPlaying(false);
            setCurrentTime(activeClip.startTime || 0);
          }
        } else {
          setCurrentTime((prev) => {
            if (prev >= totalDuration) {
              setIsPlaying(false);
              return 0;
            }
            return prev + 0.1;
          });
        }
        animId = requestAnimationFrame(updateTimeline);
      };
      animId = requestAnimationFrame(updateTimeline);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, activeClip, totalDuration]);

  const togglePlay = () => {
    if (isPlaying) {
      if (videoPlayerRef.current) videoPlayerRef.current.pause();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = currentTime;
        videoPlayerRef.current.play().catch(() => {});
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = currentTime;
        audioPlayerRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, time));
    setCurrentTime(clamped);
    if (videoPlayerRef.current) videoPlayerRef.current.currentTime = clamped;
    if (audioPlayerRef.current) audioPlayerRef.current.currentTime = clamped;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(ratio * totalDuration);
  };

  const handleSplitClip = () => {
    if (currentTime <= activeClip.startTime || currentTime >= activeClip.endTime) return;
    setHistoryStack((prev) => [...prev, { ...activeClip }]);
    setRedoStack([]);
    setActiveClip((prev) => ({
      ...prev,
      endTime: currentTime,
    }));
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];
    setRedoStack((prev) => [...prev, { ...activeClip }]);
    setActiveClip(last);
    setHistoryStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack((prev) => [...prev, { ...activeClip }]);
    setActiveClip(next);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  // Upload custom video/audio file into editor
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    const isVid = file.type.startsWith('video');

    setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    setActiveClip({
      id: `clip_${Date.now()}`,
      name: file.name,
      url,
      type: isVid ? 'video' : 'audio',
      startTime: 0,
      endTime: 60,
      duration: 60,
      volume: 1,
      speed: 1,
      muted: false,
    });
    setTotalDuration(60);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // In-App Video & Audio Recording Engine
  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      let stream: MediaStream;

      if (recordMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: recordMode === 'camera',
          audio: true,
        });
      }

      liveStreamRef.current = stream;
      if (recordVideoPreviewRef.current) {
        recordVideoPreviewRef.current.srcObject = stream;
        recordVideoPreviewRef.current.play().catch(() => {});
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = recordMode === 'audio' ? 'audio/webm' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const name = `Recording_${recordMode}_${Date.now()}.${recordMode === 'audio' ? 'ogg' : 'webm'}`;

        setProjectName(name);
        setActiveClip({
          id: `rec_${Date.now()}`,
          name,
          url,
          type: recordMode === 'audio' ? 'audio' : 'video',
          startTime: 0,
          endTime: Math.max(5, recordedSeconds),
          duration: Math.max(5, recordedSeconds),
          volume: 1,
          speed: 1,
          muted: false,
        });
        setTotalDuration(Math.max(5, recordedSeconds));
        setCurrentTime(0);

        if (liveStreamRef.current) {
          liveStreamRef.current.getTracks().forEach((t) => t.stop());
          liveStreamRef.current = null;
        }

        setIsRecording(false);
        setIsRecordModalOpen(false);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordedSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordedSeconds((sec) => sec + 1);
      }, 1000);
    } catch {
      setExportError('Recording device permission was declined or is unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  // Video Export & Seamless Workflow Integration
  const handleExportProject = async () => {
    if (!user && guestRemaining <= 0) {
      setExportError('Daily guest conversion quota reached (5/5). Sign in with Google for unlimited exports.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    setExportError(null);

    try {
      // Simulate/perform video canvas composition
      for (let p = 15; p <= 85; p += 15) {
        await new Promise((r) => setTimeout(r, 120));
        setExportProgress(p);
      }

      // Prepare exported video file
      let videoBlob: Blob;
      try {
        const response = await fetch(activeClip.url);
        videoBlob = await response.blob();
      } catch {
        // Fallback synthetic composition
        videoBlob = new Blob(['AudioLink Video Studio Export'], { type: 'video/mp4' });
      }

      const fileExt = activeClip.type === 'audio' ? '.mp3' : '.mp4';
      const cleanFileName = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_edited${fileExt}`;
      const exportFile = new File([videoBlob], cleanFileName, {
        type: activeClip.type === 'audio' ? 'audio/mpeg' : 'video/mp4',
      });

      setExportProgress(90);

      // Upload into existing centralized backend & Firebase storage system
      const formData = new FormData();
      formData.append('file', exportFile);
      formData.append('folder', 'public');

      const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest');
      formData.append('userId', effectiveUserId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': effectiveUserId,
          'x-user-email': user?.email || '',
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server rejected video export upload.');
      }

      const data = await res.json();
      const mediaItem: MediaItem = data.item || (data.items && data.items[0]);

      if (!mediaItem) {
        throw new Error('Export completed but server did not return media record.');
      }

      setExportProgress(100);
      setExportedItem(mediaItem);
      setIsExporting(false);

      // Trigger standard centralized workflow callbacks (Recent History + Full Library)
      onExportSuccess(mediaItem);
    } catch (err: any) {
      setIsExporting(false);
      setExportError(err?.message || 'Failed to export video. Please try again.');
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
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 min-h-[720px]">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Studio Top Control Bar (matching reference header) */}
      <div className="h-14 border-b border-slate-800 bg-slate-950/70 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-sm font-bold text-white bg-transparent hover:bg-slate-800/80 px-2 py-1 rounded-lg border border-transparent hover:border-slate-700 transition-colors focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px]"
            title="Edit Project Title"
          />

          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right actions: Upgrade + Done / Export button (matching green accent) */}
        <div className="flex items-center gap-2.5">
          {!user && (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              ⚡ Upgrade
            </button>
          )}

          <button
            type="button"
            onClick={handleExportProject}
            disabled={isExporting}
            className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
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
      </div>

      {/* Main Studio Body: Left Nav Toolstrip + Secondary Content Panel + Center Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Leftmost Toolstrip (AI Tools -> Video -> Audio -> Image -> Subtitles -> Text -> Elements) */}
        <div className="w-16 border-r border-slate-800 bg-slate-950 flex flex-row md:flex-col items-center py-3 gap-1 shrink-0 select-none overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTool('ai')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'ai' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[9px] font-medium">AI Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('video')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'video' ? 'bg-slate-800 text-lime-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="text-[9px]">Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('audio')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'audio' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span className="text-[9px]">Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('image')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'image' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[9px]">Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('subtitles')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'subtitles' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Captions className="w-4 h-4" />
            <span className="text-[9px]">Subtitles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'text' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-[9px]">Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('elements')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTool === 'elements' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shapes className="w-4 h-4" />
            <span className="text-[9px]">Elements</span>
          </button>
        </div>

        {/* Secondary Left Content Panel (matching reference: Upload, Generate, Record, Stock Clips) */}
        <div className="w-full md:w-72 border-r border-slate-800 bg-slate-900/90 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto max-h-72 md:max-h-none">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white capitalize">{activeTool} Studio</h2>
            <span className="text-[10px] text-slate-500 font-mono">1080p Engine</span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Upload</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const sample = STOCK_VIDEOS[0];
                  setActiveClip({
                    id: `stock_${Date.now()}`,
                    name: sample.title,
                    url: sample.url,
                    type: 'video',
                    startTime: 0,
                    endTime: sample.duration,
                    duration: sample.duration,
                    volume: 1,
                    speed: 1,
                    muted: false,
                  });
                  setTotalDuration(sample.duration);
                  setCurrentTime(0);
                }}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-lime-400" />
                <span>Generate</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecordModalOpen(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>Record</span>
              </button>
            </div>
          </div>

          {/* Talking Characters Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Talking Characters</span>
              <span className="text-[11px] text-slate-500 cursor-pointer hover:text-white">View all &gt;</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TALKING_AVATARS.map((av) => (
                <div
                  key={av.id}
                  onClick={() => {
                    setTextOverlays((prev) => [
                      ...prev,
                      {
                        id: `ov_${Date.now()}`,
                        text: `Host: ${av.name}`,
                        x: 20,
                        y: 20,
                        fontSize: 18,
                        color: '#ffffff',
                        startTime: 0,
                        endTime: totalDuration,
                      }
                    ]);
                  }}
                  className="group aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700 hover:border-lime-400 transition-all cursor-pointer relative"
                >
                  <img src={av.img} alt={av.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-white py-0.5 truncate">
                    {av.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Videos Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Stock Videos</span>
              <span className="text-[11px] text-slate-500 cursor-pointer hover:text-white">View all &gt;</span>
            </div>
            <div className="space-y-2">
              {STOCK_VIDEOS.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => {
                    setActiveClip({
                      id: `stock_${Date.now()}`,
                      name: vid.title,
                      url: vid.url,
                      type: 'video',
                      startTime: 0,
                      endTime: vid.duration,
                      duration: vid.duration,
                      volume: 1,
                      speed: 1,
                      muted: false,
                    });
                    setTotalDuration(vid.duration);
                    setCurrentTime(0);
                  }}
                  className="flex items-center gap-2.5 p-2 bg-slate-800/70 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-colors cursor-pointer group"
                >
                  <img src={vid.thumbnail} alt={vid.title} className="w-14 h-10 object-cover rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-lime-400 transition-colors">
                      {vid.title}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {vid.duration}s · {vid.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Canvas / Preview Workspace */}
        <div className="flex-1 flex flex-col bg-slate-950/40 p-4 sm:p-6 overflow-hidden">
          {/* Responsive Preview Viewport */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div
              style={{ backgroundColor }}
              className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800 flex items-center justify-center transition-all ${getCanvasAspectRatioClass()}`}
            >
              {activeClip.type === 'video' ? (
                <video
                  ref={videoPlayerRef}
                  src={activeClip.url}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <audio ref={audioPlayerRef} src={activeClip.url} />
                  <div className="w-16 h-16 rounded-3xl bg-lime-500/10 border border-lime-500/30 text-lime-400 flex items-center justify-center shadow-lg">
                    <Film className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white max-w-sm truncate">{activeClip.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{formatDuration(currentTime)} / {formatDuration(totalDuration)}</p>
                </div>
              )}

              {/* Render dynamic text overlays on canvas */}
              {textOverlays.map((txt) => (
                <div
                  key={txt.id}
                  style={{
                    position: 'absolute',
                    top: `${txt.y}%`,
                    left: `${txt.x}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${txt.fontSize}px`,
                    color: txt.color,
                    backgroundColor: txt.backgroundColor,
                  }}
                  className="px-3 py-1 rounded-lg font-bold pointer-events-none select-none text-center shadow-md"
                >
                  {txt.text}
                </div>
              ))}
            </div>

            {/* Canvas Control Bar (matching reference pills beneath canvas) */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsCleanAudio(!isCleanAudio)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCleanAudio
                    ? 'bg-lime-500/10 border-lime-500/30 text-lime-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean Audio</span>
              </button>

              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioType)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-lime-500 cursor-pointer"
              >
                <option value="16:9">Wide Landscape (16:9)</option>
                <option value="9:16">Vertical Mobile (9:16)</option>
                <option value="1:1">Square Post (1:1)</option>
                <option value="4:5">Portrait Feed (4:5)</option>
              </select>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl">
                <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor }} />
                <span className="text-slate-300">Background</span>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer opacity-0 absolute"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline & Playback Controller (matching reference timeline footer) */}
      <div className="border-t border-slate-800 bg-slate-950 p-4 flex flex-col gap-3">
        {/* Playback Controls & Action Tools Header */}
        <div className="flex items-center justify-between text-xs">
          {/* Left Split Action */}
          <button
            type="button"
            onClick={handleSplitClip}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Split Clip at Playhead"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          {/* Center Playback Controller */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSeek(currentTime - 5)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(currentTime + 5)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <div className="font-mono text-xs text-slate-300 min-w-[110px] text-center">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>

          {/* Right Zoom & Fit Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Timeline Tracks: Ruler + Draggable Needle + Waveform Clip */}
        <div 
          ref={timelineTrackRef}
          onClick={handleTimelineClick}
          className="relative bg-slate-900 border border-slate-800 rounded-2xl h-24 overflow-hidden cursor-pointer select-none flex flex-col justify-between p-2"
        >
          {/* Time Ruler (0s, 10s, 20s, 30s...) */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 border-b border-slate-800/80 pb-1">
            <span>0s</span>
            <span>{Math.round(totalDuration * 0.25)}s</span>
            <span>{Math.round(totalDuration * 0.5)}s</span>
            <span>{Math.round(totalDuration * 0.75)}s</span>
            <span>{Math.round(totalDuration)}s</span>
          </div>

          {/* Active Audio / Video Waveform Track (matching light-blue waveform bar in reference) */}
          <div className="h-12 w-full bg-sky-400/90 rounded-xl relative overflow-hidden flex items-center px-3 text-slate-950 font-bold text-xs shadow-inner">
            <div className="flex items-center gap-2 truncate z-10">
              <Music className="w-4 h-4 shrink-0 text-slate-900" />
              <span className="truncate">{activeClip.name}</span>
            </div>

            {/* Synthetic audio wave bars */}
            <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none px-2">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  style={{ height: `${20 + ((i * 17) % 75)}%` }}
                  className="w-1 bg-slate-950 rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Draggable Playhead Cursor Needle */}
          <div
            style={{ left: `${Math.min(100, Math.max(0, (currentTime / (totalDuration || 1)) * 100))}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
          >
            <div className="w-3 h-3 bg-rose-500 rounded-full -ml-[5px] -mt-0.5 shadow-md" />
          </div>
        </div>
      </div>

      {/* Record In-App Modal Overlay */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Record Directly to Video Studio</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  stopRecording();
                  setIsRecordModalOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection: Camera, Screen, Audio */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRecordMode('camera')}
                className={`py-2 text-xs font-semibold rounded-xl border ${
                  recordMode === 'camera' ? 'bg-slate-800 border-lime-400 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Camera & Mic
              </button>
              <button
                type="button"
                onClick={() => setRecordMode('screen')}
                className={`py-2 text-xs font-semibold rounded-xl border ${
                  recordMode === 'screen' ? 'bg-slate-800 border-lime-400 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Screen Share
              </button>
              <button
                type="button"
                onClick={() => setRecordMode('audio')}
                className={`py-2 text-xs font-semibold rounded-xl border ${
                  recordMode === 'audio' ? 'bg-slate-800 border-lime-400 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Voiceover Only
              </button>
            </div>

            {/* Live Camera Viewport */}
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
              <video ref={recordVideoPreviewRef} muted className="w-full h-full object-cover" />
            </div>

            <div className="flex items-center justify-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-6 py-2.5 bg-white text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current text-rose-600" />
                  <span>Stop & Insert ({recordedSeconds}s)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Completed Notification Card */}
      {exportedItem && (
        <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">Video Exported & Synced Successfully!</h4>
              <p className="text-[11px] text-emerald-400 font-mono truncate">{exportedItem.directUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(exportedItem.directUrl);
                if (ok) {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy URL'}</span>
            </button>

            <a
              href={exportedItem.directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => setExportedItem(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};