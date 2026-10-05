import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  QrCode, 
  Code, 
  CheckCircle2
} from 'lucide-react';
import { AudioItem } from '../types';
import { formatFileSize, formatDuration, copyToClipboard } from '../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';
import { QrCodeModal } from './QrCodeModal';

interface UrlShareCardProps {
  audio: AudioItem;
  onOpenPlayer: (id: string) => void;
  onUploadAnother: () => void;
}

export const UrlShareCard: React.FC<UrlShareCardProps> = ({
  audio,
  onOpenPlayer,
  onUploadAnother,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration)) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('ended', onEnded);
    };
  }, [audio.id]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Play failed:', err));
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleCopy = async (text: string, typeKey: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedType(typeKey);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const openQr = (url: string, title: string) => {
    setQrUrl(url);
    setQrTitle(title);
    setQrModalOpen(true);
  };

  const embedCode = `<audio controls preload="metadata" src="${audio.directAudioUrl}"></audio>`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <audio
        ref={audioRef}
        src={audio.directAudioUrl}
        preload="metadata"
      />

      <div className="bg-slate-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Direct Audio URL Ready
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate max-w-xl">
            {audio.originalName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="font-mono">{audio.mimeType}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatFileSize(audio.size)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">HTTP 206 Byte-Range Enabled</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUploadAnother}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Audio Waveform Preview
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="my-2">
            <WaveformVisualizer
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              barCount={72}
              height={50}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/audio/${audio.id}/download`}
                download={audio.originalName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Direct Raw Audio Stream URL (Ends with .ext) */}
          <div className="p-4 border-2 border-emerald-500/20 bg-emerald-50/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <label className="text-xs font-bold text-slate-900">
                  Direct Raw Audio URL (Streams in Browser, Ends in .{audio.filename.split('.').pop()})
                </label>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Permanent Stream Endpoint
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={audio.directAudioUrl}
                className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(audio.directAudioUrl, 'direct')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedType === 'direct' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied URL!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Direct URL</span>
                    </>
                  )}
                </button>
                <a
                  href={audio.directAudioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
                  title="Open Raw Audio URL in Browser Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When pasted into any browser address bar, this URL directly plays the audio in the native browser player without prompting a download. Also compatible with Discord soundboards, podcast RSS, and video players.
            </p>
          </div>

          {/* Autoplay Shareable Web Player Link */}
          <div className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <label className="text-xs font-bold text-slate-900">
                  Shareable Web Player Link (Autoplay + Waveform Interface)
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={audio.playerUrl}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(audio.playerUrl, 'player')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedType === 'player' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Player Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPlayer(audio.id)}
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
                  title="Open Player Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openQr(audio.playerUrl, 'Shareable Player QR')}
                  className="p-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
                  title="Show Mobile QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Opens the dedicated web player and auto-plays immediately with browser permission fallback.
            </p>
          </div>

          {/* HTML5 Audio Tag Embed Snippet */}
          <div className="p-4 border border-slate-200 bg-white rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-xs font-semibold text-slate-900">
                HTML5 Audio Tag Embed Code
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={embedCode}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono select-all truncate"
              />
              <button
                type="button"
                onClick={() => handleCopy(embedCode, 'embed')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                {copiedType === 'embed' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <QrCodeModal
        url={qrUrl}
        title={qrTitle}
        subtitle={audio.originalName}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};