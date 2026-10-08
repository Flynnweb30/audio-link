import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  Video, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Mic, 
  Square, 
  Sparkles, 
  Layers, 
  Lock, 
  Files, 
  X, 
  Plus 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, UploadProgress, BatchFileItem, UserQuotaStats } from '../types';
import { formatFileSize } from '../utils/formatters';
import { uploadMediaFileToFirebase, QUOTA_CONFIG } from '../firebase/syncService';

interface AudioUploaderProps {
  onUploadSuccess: (item: MediaItem) => void;
  onBatchUploadSuccess?: (items: MediaItem[]) => void;
  onSelectSample: (sampleId: string) => void;
  user: User | null;
  quotaStats: UserQuotaStats;
  onSignIn: () => void;
  isSigningIn?: boolean;
  currentFilter?: 'all' | 'audio' | 'video' | 'image';
  onFilterChange?: (filter: 'all' | 'audio' | 'video' | 'image') => void;
}

const ALLOWED_EXTS = [
  '.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac',
  '.mp4', '.mov', '.webm', '.mkv', '.m4v',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onUploadSuccess,
  onBatchUploadSuccess,
  onSelectSample,
  user,
  quotaStats,
  onSignIn,
  isSigningIn = false,
  currentFilter,
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<'all' | 'audio' | 'video' | 'image'>('all');
  const activeMediaFilter = currentFilter !== undefined ? currentFilter : internalFilter;

  const handleFilterSelection = (filter: 'all' | 'audio' | 'video' | 'image') => {
    setInternalFilter(filter);
    if (onFilterChange) onFilterChange(filter);
  };

  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [batchQueue, setBatchQueue] = useState<BatchFileItem[]>([]);
  const [batchCompletedItems, setBatchCompletedItems] = useState<MediaItem[]>([]);

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    state: 'idle',
    percentage: 0,
    errorMessage: null,
    uploadedMedia: null,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const isQuotaExhausted = quotaStats.remaining <= 0;

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext);
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(ext);

    if (!isAudio && !isVideo && !isImage && !ALLOWED_EXTS.includes(ext)) {
      return `Format "${ext || file.type}" is unsupported. Supported: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP, AVIF.`;
    }

    if (file.size > QUOTA_CONFIG.maxFileSizeBytes) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds the maximum free limit of ${QUOTA_CONFIG.maxFileSizeLabel}.`;
    }

    if (file.size === 0) {
      return `"${file.name}" is an empty file (0 bytes).`;
    }

    return null;
  };

  const getMediaIcon = (fileOrItem: { name?: string; originalName?: string; type?: string; mediaType?: string }) => {
    const name = fileOrItem.name || fileOrItem.originalName || '';
    const ext = '.' + (name.split('.').pop() || '').toLowerCase();
    const type = fileOrItem.type || fileOrItem.mediaType || '';

    if (type.startsWith('video') || ['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
      return <Video className="w-4 h-4 text-rose-500" />;
    }
    if (type.startsWith('image') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    }
    return <FileAudio className="w-4 h-4 text-indigo-500" />;
  };

  const startSingleUpload = async (file: File) => {
    if (isQuotaExhausted) return;
    setValidationError(null);
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      return;
    }

    setUploadProgress({
      state: 'uploading',
      percentage: 5,
      errorMessage: null,
      uploadedMedia: null,
    });

    try {
      const ownerId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'anonymous');
      const verifiedMedia = await uploadMediaFileToFirebase(
        file,
        ownerId,
        user,
        'public',
        (pct) => setUploadProgress((prev) => ({ ...prev, percentage: pct }))
      );

      setUploadProgress({
        state: 'success',
        percentage: 100,
        errorMessage: null,
        uploadedMedia: verifiedMedia,
      });

      onUploadSuccess(verifiedMedia);
    } catch (e: any) {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: e?.message || 'Failed to complete upload and verification to Firebase Storage.',
        uploadedMedia: null,
      });
    }
  };

  const handleAddFilesToBatch = (files: FileList | File[]) => {
    if (isQuotaExhausted) return;
    setValidationError(null);
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (batchQueue.length + fileList.length > quotaStats.remaining) {
      setValidationError(`You selected ${batchQueue.length + fileList.length} files, but have ${quotaStats.remaining} upload quota remaining.`);
      return;
    }

    const newItems: BatchFileItem[] = [];
    const errors: string[] = [];

    fileList.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        newItems.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          status: 'pending',
          progress: 0,
        });
      }
    });

    if (errors.length > 0 && newItems.length === 0) {
      setValidationError(errors[0]);
      return;
    }

    setBatchQueue((prev) => [...prev, ...newItems]);
    setUploadMode('batch');
  };

  const startBatchUpload = async () => {
    if (batchQueue.length === 0) return;
    const pendingItems = batchQueue.filter((item) => item.status !== 'completed');
    if (pendingItems.length === 0) return;

    setUploadProgress({
      state: 'uploading',
      percentage: 5,
      errorMessage: null,
      uploadedMedia: null,
      batchTotal: batchQueue.length,
      batchCompleted: batchQueue.length - pendingItems.length,
    });

    const ownerId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'anonymous');
    const successfulItems: MediaItem[] = [];

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q));

      try {
        const verified = await uploadMediaFileToFirebase(
          item.file,
          ownerId,
          user,
          'public',
          (pct) => setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, progress: pct } : q))
        );

        setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'completed', progress: 100, result: verified } : q));
        successfulItems.push(verified);
      } catch (err: any) {
        setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'error', progress: 0, error: err?.message } : q));
      }

      const totalPct = Math.round(((i + 1) / pendingItems.length) * 100);
      setUploadProgress((prev) => ({ ...prev, percentage: totalPct, batchCompleted: i + 1 }));
    }

    if (successfulItems.length > 0) {
      setBatchCompletedItems((prev) => [...prev, ...successfulItems]);
      setUploadProgress({
        state: 'success',
        percentage: 100,
        errorMessage: null,
        uploadedMedia: successfulItems[0],
      });
      if (onBatchUploadSuccess) onBatchUploadSuccess(successfulItems);
    } else {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'All batch files failed to upload.',
        uploadedMedia: null,
      });
    }
  };

  const startRecording = async () => {
    if (isQuotaExhausted) return;
    try {
      setValidationError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        setIsProcessingAudio(true);
        setTimeout(() => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const recordedFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());
          setIsProcessingAudio(false);
          startSingleUpload(recordedFile);
        }, 300);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setValidationError('Microphone access was denied or device is unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const isUploading = uploadProgress.state === 'uploading';

  return (
    <div className="space-y-4">
      {/* Category Pills & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => handleFilterSelection('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'audio' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'video' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'image' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Images</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/60 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => { setUploadMode('single'); setValidationError(null); }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                uploadMode === 'single' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => { setUploadMode('batch'); setValidationError(null); }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                uploadMode === 'batch' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Files className="w-3 h-3" />
              <span>Batch</span>
              {batchQueue.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-[10px] text-white flex items-center justify-center font-mono">
                  {batchQueue.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs">
            <span className="text-slate-400">
              Free Hosting:{' '}
              <strong className={quotaStats.remaining <= 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold font-mono"}>
                {quotaStats.used} / {quotaStats.limit}
              </strong>{' '}
              ({quotaStats.maxFileSizeLabel} max)
            </span>
          </div>
        </div>
      </div>

      {isQuotaExhausted && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">Free Hosting Upload Limit Reached ({quotaStats.used} / {quotaStats.limit})</p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {!user ? 'Sign in with Google to upgrade to 200 uploads + 100 desktop login bonus.' : 'You have reached your free tier capacity.'}
              </p>
            </div>
          </div>
          {!user && (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={onSignIn}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Sign In to Unlock 200+</span>}
            </button>
          )}
        </div>
      )}

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!isQuotaExhausted) setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isQuotaExhausted) return;
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (e.dataTransfer.files.length === 1 && uploadMode === 'single') {
              startSingleUpload(e.dataTransfer.files[0]);
            } else {
              handleAddFilesToBatch(e.dataTransfer.files);
            }
          }
        }}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all ${
          isQuotaExhausted
            ? 'border-slate-800 bg-slate-900/40 opacity-70 cursor-not-allowed'
            : isDragging
            ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          disabled={isQuotaExhausted}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (e.target.files.length > 1) {
                handleAddFilesToBatch(e.target.files);
              } else {
                startSingleUpload(e.target.files[0]);
              }
            }
          }}
        />

        <input
          ref={batchFileInputRef}
          type="file"
          multiple
          disabled={isQuotaExhausted}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFilesToBatch(e.target.files);
            }
          }}
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="relative mb-4 group">
            {isUploading && (
              <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
            )}
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white transition-all group-hover:scale-105 shadow-xl relative z-10">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              ) : isProcessingAudio ? (
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-emerald-400" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {isUploading
              ? 'Converting & Uploading to Firebase Storage...'
              : uploadMode === 'batch'
              ? 'Batch Media Converter'
              : 'Drop All Media Here'}
          </h2>

          <p className="text-sm text-slate-400 mb-5 leading-relaxed max-w-md">
            Direct permanent HTTPS URLs via Firebase Storage. Images auto-strip EXIF. Max free size: {quotaStats.maxFileSizeLabel}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {uploadMode === 'single' ? (
              <>
                <button
                  type="button"
                  disabled={isUploading || isRecording || isProcessingAudio || isQuotaExhausted}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose Media File</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isRecording || isQuotaExhausted}
                  onClick={() => { setUploadMode('batch'); batchFileInputRef.current?.click(); }}
                  className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Files className="w-4 h-4 text-emerald-400" />
                  <span>Batch Mode</span>
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isUploading || isQuotaExhausted}
                    onClick={startRecording}
                    className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-rose-400" />
                    <span>Record Audio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all inline-flex items-center gap-2 animate-pulse cursor-pointer shadow-lg shadow-rose-600/20"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Recording ({recordSeconds}s)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isUploading || isQuotaExhausted}
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Batch Files</span>
                </button>

                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={startBatchUpload}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                    <span>Start Batch ({batchQueue.length})</span>
                  </button>
                )}

                {batchQueue.length > 0 && !isUploading && (
                  <button
                    type="button"
                    onClick={() => { setBatchQueue([]); setBatchCompletedItems([]); }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sample Selectors */}
          {!isUploading && batchQueue.length === 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-500">Quick test:</span>
              <button
                type="button"
                onClick={() => onSelectSample('sample_lofi_beat')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🎵 Lofi Chill Beat
              </button>
              <button
                type="button"
                onClick={() => onSelectSample('sample_nature_ambience')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🌲 Forest Ambience
              </button>
            </div>
          )}

          {/* Batch Queue */}
          {uploadMode === 'batch' && batchQueue.length > 0 && (
            <div className="w-full mt-6 bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-4 text-left">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-semibold">
                <span>Queue ({batchQueue.length} files)</span>
                <span>Total: {formatFileSize(batchQueue.reduce((acc, f) => acc + f.size, 0))}</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {batchQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-slate-800 shrink-0">{getMediaIcon(item)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{item.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{formatFileSize(item.size)}</span>
                      </div>
                    </div>
                    <div>
                      {item.status === 'uploading' && <span className="text-emerald-400 text-xs font-mono">{item.progress}%</span>}
                      {item.status === 'completed' && <span className="text-emerald-400 text-xs font-semibold">Ready</span>}
                      {item.status === 'error' && <span className="text-rose-400 text-xs font-semibold">Failed</span>}
                      {item.status === 'pending' && (
                        <button type="button" onClick={() => setBatchQueue((prev) => prev.filter((q) => q.id !== item.id))} className="text-slate-500 hover:text-rose-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="w-full mt-6 space-y-2 animate-in fade-in">
              <div className="flex justify-between text-xs text-slate-400">
                <span className="font-medium flex items-center gap-1.5 text-white">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  Uploading & Verifying Persistent Firebase Storage...
                </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  {uploadProgress.percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Validation & Error Alerts */}
          {validationError && (
            <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Notice</p>
                <p className="mt-0.5 text-rose-300">{validationError}</p>
              </div>
              <button type="button" onClick={() => setValidationError(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
          )}

          {uploadProgress.state === 'error' && uploadProgress.errorMessage && (
            <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Upload Error</p>
                <p className="mt-0.5 text-rose-300">{uploadProgress.errorMessage}</p>
              </div>
              <button type="button" onClick={() => setUploadProgress((p) => ({ ...p, state: 'idle', errorMessage: null }))} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};