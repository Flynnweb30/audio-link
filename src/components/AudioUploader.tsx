import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  Video, 
  Image as ImageIcon, 
  AlertCircle, 
  Loader2, 
  Mic, 
  Square, 
  Sparkles, 
  Layers, 
  Lock, 
  Files, 
  X, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Plus 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, UploadProgress, BatchFileItem } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/formatters';
import { executeMediaUploadWorkflow } from '../firebase/syncService';
import { calculateUserQuota, MAX_FREE_FILE_SIZE_BYTES } from '../utils/quotaManager';

interface AudioUploaderProps {
  onUploadSuccess: (item: MediaItem) => void;
  onBatchUploadSuccess?: (items: MediaItem[]) => void;
  onSelectSample: (sampleId: string) => void;
  user: User | null;
  currentUploadCount: number;
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
  currentUploadCount,
  onSignIn,
  isSigningIn = false,
  currentFilter,
  onFilterChange,
}) => {
  const quota = calculateUserQuota(user, currentUploadCount);

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
  const [copiedAllBatch, setCopiedAllBatch] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

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

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext);
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(ext);

    if (!isAudio && !isVideo && !isImage && !ALLOWED_EXTS.includes(ext)) {
      return `Format "${ext || file.type}" is unsupported. Supported: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP, AVIF.`;
    }

    if (file.size > MAX_FREE_FILE_SIZE_BYTES) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds the maximum free hosting limit of 5 MB.`;
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

  const handleSingleFileSelection = (file: File) => {
    if (quota.remainingUploads <= 0) {
      setValidationError(`Upload limit reached (${quota.usedUploads}/${quota.allowedUploads}). Sign in to unlock up to 300+ uploads.`);
      return;
    }
    setValidationError(null);
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }
    startSingleUpload(file);
  };

  const handleAddFilesToBatch = (files: FileList | File[]) => {
    setValidationError(null);
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (batchQueue.length + fileList.length > quota.remainingUploads) {
      setValidationError(
        `Selection exceeds your remaining free quota (${quota.remainingUploads} uploads left). Please sign in for higher allowances.`
      );
      return;
    }

    const newItems: BatchFileItem[] = [];
    const errors: string[] = [];

    fileList.forEach((file) => {
      const err = validateFile(file);
      if (err) errors.push(err);
      else {
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

  const startSingleUpload = async (file: File) => {
    setUploadProgress({
      state: 'uploading',
      percentage: 10,
      errorMessage: null,
      uploadedMedia: null,
    });

    try {
      const result = await executeMediaUploadWorkflow(file, 'public', (pct) => {
        setUploadProgress((prev) => ({
          ...prev,
          state: pct >= 95 ? 'verifying' : 'uploading',
          percentage: pct,
        }));
      });

      setUploadProgress({
        state: 'success',
        percentage: 100,
        errorMessage: null,
        uploadedMedia: result,
      });

      onUploadSuccess(result);
    } catch (err: any) {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: err.message || 'Firebase upload failed. Please try again.',
        uploadedMedia: null,
      });
    }
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

    const successfulItems: MediaItem[] = [];
    let completed = 0;

    for (const item of pendingItems) {
      setBatchQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 15 } : q))
      );

      try {
        const result = await executeMediaUploadWorkflow(item.file, 'public', (p) => {
          setBatchQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: p } : q))
          );
        });

        successfulItems.push(result);
        completed++;

        setBatchQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'completed', progress: 100, result } : q
          )
        );

        setUploadProgress((prev) => ({
          ...prev,
          percentage: Math.round((completed / pendingItems.length) * 100),
          batchCompleted: completed,
        }));
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', progress: 0, error: err.message } : q
          )
        );
      }
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
        errorMessage: 'All batch uploads failed. Please verify connection and retry.',
        uploadedMedia: null,
      });
    }
  };

  const startRecording = async () => {
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
          const recordedFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
            type: 'audio/webm',
          });
          stream.getTracks().forEach((track) => track.stop());
          setIsProcessingAudio(false);
          handleSingleFileSelection(recordedFile);
        }, 300);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch {
      setValidationError('Microphone permission denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs and Quota Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => handleFilterSelection('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'audio'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'video'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'image'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
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
              onClick={() => {
                setUploadMode('single');
                setValidationError(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                uploadMode === 'single'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('batch');
                setValidationError(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                uploadMode === 'batch'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
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
            <span className="text-emerald-400 font-mono font-bold bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-700/60">
              {quota.remainingUploads}/{quota.allowedUploads} Free (Max 5MB)
            </span>
          </div>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            if (uploadMode === 'single' && e.dataTransfer.files.length === 1) {
              handleSingleFileSelection(e.dataTransfer.files[0]);
            } else {
              handleAddFilesToBatch(e.dataTransfer.files);
            }
          }
        }}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={
            activeMediaFilter === 'audio' ? 'audio/*' :
            activeMediaFilter === 'video' ? 'video/*' :
            activeMediaFilter === 'image' ? 'image/*' :
            'audio/*,video/*,image/*'
          }
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              if (e.target.files.length > 1) handleAddFilesToBatch(e.target.files);
              else handleSingleFileSelection(e.target.files[0]);
            }
          }}
        />

        <input
          ref={batchFileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleAddFilesToBatch(e.target.files);
          }}
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mb-3 shadow-xl">
            {uploadProgress.state === 'uploading' || uploadProgress.state === 'verifying' ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : uploadMode === 'batch' ? (
              <Files className="w-8 h-8" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {uploadProgress.state === 'uploading' ? 'Uploading to Firebase Cloud Storage...' :
             uploadProgress.state === 'verifying' ? 'Verifying Persistent CDN Download URL...' :
             uploadMode === 'batch' ? 'Batch Media Converter' : 'Upload & Generate Persistent URL'}
          </h2>

          <p className="text-sm text-slate-400 mb-5 max-w-md">
            Directly stored in Firebase Cloud Storage & Firestore. Files survive restarts, new tabs, and redeployments. Max 5 MB per file.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {uploadMode === 'single' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose Media File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMode('batch')}
                  className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Files className="w-4 h-4 text-emerald-400" />
                  <span>Batch Mode</span>
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-rose-400" />
                    <span>Record Audio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2 animate-pulse cursor-pointer shadow-lg"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop ({recordSeconds}s)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Files</span>
                </button>

                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={startBatchUpload}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Files className="w-4 h-4" />
                    <span>Upload Batch ({batchQueue.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sample Media Trigger */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Free Samples:</span>
            <button
              type="button"
              onClick={() => onSelectSample('sample_lofi_beat')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 cursor-pointer"
            >
              🎵 Lofi Chill Beat
            </button>
            <button
              type="button"
              onClick={() => onSelectSample('sample_nature_ambience')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 cursor-pointer"
            >
              🌲 Forest Ambience
            </button>
          </div>

          {/* Progress / Error Alerts */}
          {uploadProgress.state !== 'idle' && uploadProgress.state !== 'success' && (
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-white">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  Uploading & verifying with Firebase Storage...
                </span>
                <span className="font-mono text-emerald-400">{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {validationError && (
            <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Notice</p>
                <p className="mt-0.5">{validationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};