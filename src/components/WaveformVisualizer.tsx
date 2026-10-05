import React, { useMemo } from 'react';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  barCount?: number;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying,
  currentTime,
  duration,
  onSeek,
  barCount = 64,
  height = 54,
}) => {
  const bars = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const x = i / barCount;
      const envelope = Math.sin(x * Math.PI);
      const wave1 = Math.sin(x * 12) * 0.25;
      const wave2 = Math.cos(x * 24) * 0.15;
      const noise = (((Math.sin(i * 997) * 10000) % 1) + 1) * 0.25;
      const normalized = Math.min(1, Math.max(0.12, (envelope * 0.65 + wave1 + wave2 + noise) * 0.9));
      list.push(normalized);
    }
    return list;
  }, [barCount]);

  const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * duration);
  };

  return (
    <div
      onClick={handleContainerClick}
      className="relative w-full cursor-pointer group select-none py-1"
      title="Click or drag to seek"
    >
      <div 
        className="flex items-center gap-[2.5px] w-full"
        style={{ height: `${height}px` }}
      >
        {bars.map((norm, index) => {
          const barFraction = index / barCount;
          const isPassed = barFraction <= progressFraction;
          
          const dynamicBoost = isPlaying && isPassed ? 1 + Math.sin((index + currentTime * 8) * 0.7) * 0.12 : 1;
          const barHeightPx = Math.max(4, Math.round(norm * height * 0.9 * dynamicBoost));

          return (
            <div
              key={index}
              className="flex-1 rounded-full transition-all duration-75 group-hover:opacity-90"
              style={{
                height: `${barHeightPx}px`,
                backgroundColor: isPassed ? '#4f46e5' : '#cbd5e1',
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 pointer-events-none transition-[left] duration-75"
        style={{ left: `${progressFraction * 100}%` }}
      >
        <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};