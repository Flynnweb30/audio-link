import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  AlertCircle, 
  Loader2, 
  Mic, 
  Square, 
  Music, 
  Sparkles,
  ArrowRight,
  Film,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { MediaItem, UploadProgress } from '../types';
import { formatFileSize } from '../utils/formatters';

interface AudioUploaderProps {
  onUploadSuccess: (item: MediaItem) => void;
  onSelectSample: (sampleId: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = [
  '.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac', '.weba',
  '.mp4', '.webm', '.mov', '.m4v', '.ogv', '.mkv',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico'
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onUploadSuccess,
  onSelectSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'audio' | 'video' | 'image'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    state: 'idle',
    percentage: 0,
    errorMessage: null,
    uploadedMedia: null,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = file.type.startsWith('audio/') || file.type.startsWith('video/') || file.type.startsWith('image/');

    if (!isMimeValid && !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format "${ext || file.type}". Supported: Audio (MP3, WAV, M4A, OGG), Video (MP4, WebM, MOV), Image (PNG, JPG, WebP, SVG).`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum limit of 100MB.`;
    }

    if (file.size === 0) {
      return 'The selected file is empty (0 bytes).';
    }

    return null;
  };

  const handleFileSelection = (file: File) => {
    setValidationError(null);
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    startUpload(file);
  };

  const startUpload = (file: File) => {
    setUploadProgress({
      state: 'uploading',
      percentage: 5,
      errorMessage: null,
      uploadedMedia: null,
    });

    const formData = new FormData();
    formData.append('media', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 90);
        setUploadProgress((prev) => ({
          ...prev,
          state: 'uploading',
          percentage: Math.max(10, percentComplete),
        }));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress({
            state: 'success',
            percentage: 100,
            errorMessage: null,
            uploadedMedia: response.item,
          });
          onUploadSuccess(response.item);
        } catch {
          setUploadProgress({
            state: 'error',
            percentage: 0,
            errorMessage: 'Malformed response received from media server.',
            uploadedMedia: null,
          });
        }
      } else {
        let errorMsg = `Server error (${xhr.status})`;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errorMsg = res.error;
        } catch {
          // fallback
        }
        setUploadProgress({
          state: 'error',
          percentage: 0,
          errorMessage: errorMsg,
          uploadedMedia: null,
        });
      }
    };

    xhr.onerror = () => {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'Network error occurred while uploading media.',
        uploadedMedia: null,
      });
    };

    xhr.send(formData);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([audioBlob], `voice_recording_${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        stream.getTracks().forEach((track) => track.stop());
        handleFileSelection(recordedFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch {
      setValidationError('Microphone access was denied or is unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const isUploading = uploadProgress.state === 'uploading';

  return (
    <div className="space-y-6">
      {/* Category selector chips */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategoryFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Media Formats
        </button>
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('audio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategoryFilter === 'audio'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Audio (MP3, WAV)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategoryFilter === 'video'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Video (MP4, WebM)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('image')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategoryFilter === 'image'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image (PNG, JPG, SVG)</span>
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/60 ring-4 ring-indigo-100'
            : 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={
            activeCategoryFilter === 'audio'
              ? 'audio/*,.mp3,.wav,.m4a,.ogg,.opus,.flac,.aac,.weba'
              : activeCategoryFilter === 'video'
              ? 'video/*,.mp4,.webm,.mov,.m4v,.ogv'
              : activeCategoryFilter === 'image'
              ? 'image/*,.png,.jpg,.jpeg,.gif,.webp,.svg,.avif'
              : 'audio/*,video/*,image/*,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.mov,.png,.jpg,.jpeg,.gif,.webp,.svg'
          }
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelection(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 transition-transform hover:scale-105">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {isUploading ? 'Uploading and generating direct stream URL...' : 'Drop your Audio, Video, or Image here'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Supports MP3, WAV, MP4, WebM, PNG, JPG, SVG up to 100MB. Instantly creates a permanent direct stream URL with byte-range seeking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={isUploading || isRecording}
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4" />
              <span>Browse Media Files</span>
            </button>

            {!isRecording ? (
              <button
                type="button"
                disabled={isUploading}
                onClick={startRecording}
                className="px-4 py-2.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-sm font-medium rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Mic className="w-4 h-4 text-rose-500" />
                <span>Record Audio</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Upload ({recordSeconds}s)</span>
              </button>
            )}
          </div>

          {isUploading && (
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium">Uploading to persistent server storage</span>
                <span className="font-mono tabular-nums">{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {validationError && (
            <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Validation Error</p>
                <p className="mt-0.5 text-rose-700">{validationError}</p>
              </div>
            </div>
          )}

          {uploadProgress.state === 'error' && uploadProgress.errorMessage && (
            <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Upload Failed</p>
                <p className="mt-0.5 text-rose-700">{uploadProgress.errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-loaded Studio Samples */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Quick Test: Generate URL from Pre-Loaded Studio Media
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a demo asset below to test streaming, browser playback, and image display immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onSelectSample('aud_sample_acoustic_chime')}
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Acoustic Chimes
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono">WAV</span>
                  <span>•</span>
                  <span>4.5s</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSample('aud_sample_lofi_pulse')}
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Lofi Pulse
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono">WAV</span>
                  <span>•</span>
                  <span>5.0s</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSample('img_sample_modern_gradient')}
            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Gradient Banner
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono">SVG</span>
                  <span>•</span>
                  <span>Vector</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};