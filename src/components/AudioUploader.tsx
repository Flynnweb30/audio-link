import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  AlertCircle, 
  Loader2, 
  Mic, 
  Square 
} from 'lucide-react';
import { MediaItem, UploadProgress } from '../types';
import { formatFileSize } from '../utils/formatters';
import { hasCreditsAvailable, consumeGuestCredit } from '../utils/quotaManager';

interface AudioUploaderProps {
  isSignedIn: boolean;
  currentUserId: string;
  onUploadSuccess: (item: MediaItem) => void;
  onQuotaExceeded: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  isSignedIn,
  currentUserId,
  onUploadSuccess,
  onQuotaExceeded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
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

  const handleFileSelection = (file: File) => {
    setValidationError(null);

    // Verify monthly credit availability
    if (!hasCreditsAvailable(isSignedIn)) {
      onQuotaExceeded();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`File size (${formatFileSize(file.size)}) exceeds maximum limit of 100MB.`);
      return;
    }
    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes).');
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
    formData.append('userId', currentUserId);
    formData.append('folder', 'public');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('X-User-Id', currentUserId);

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
          // Deduct 1 guest credit ONLY after a confirmed successful conversion
          if (!isSignedIn) {
            consumeGuestCredit();
          }

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
            errorMessage: 'Malformed response received from server.',
            uploadedMedia: null,
          });
        }
      } else {
        let errorMsg = `Server error (${xhr.status})`;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errorMsg = res.error;
        } catch {}
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
    if (!hasCreditsAvailable(isSignedIn)) {
      onQuotaExceeded();
      return;
    }

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
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const isUploading = uploadProgress.state === 'uploading';

  return (
    <div className="space-y-4">
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
          accept="audio/*,video/*,image/*"
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
            {isUploading ? 'Uploading and generating direct stream URL...' : 'Drop All Media Here'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Supports Audio (MP3, WAV), Video (MP4, WebM) &amp; Images (PNG, JPG, AVIF, SVG) up to 100MB.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={isUploading || isRecording}
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4" />
              <span>Browse Media</span>
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
                <span>Stop &amp; Upload ({recordSeconds}s)</span>
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
    </div>
  );
};