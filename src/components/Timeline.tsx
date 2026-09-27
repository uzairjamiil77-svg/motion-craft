import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Plus,
  Diamond,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Square,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { Layer, LayerKeyframe, Project } from '../types/editor';
import { getLayerStateAtTime } from '../utils/interpolation';

interface TimelineProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  selectedLayerId: string | null;
  selectedKeyframeId: string | null;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onSelectLayer: (layerId: string | null) => void;
  onSelectKeyframe: (keyframeId: string | null) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onAddKeyframeAtCurrentTime: (layerId: string) => void;
  onDeleteKeyframe: (layerId: string, keyframeId: string) => void;
  onUpdateKeyframeTime: (layerId: string, keyframeId: string, newTime: number) => void;
  onChangeDuration: (newDuration: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentTime,
  isPlaying,
  isLooping,
  selectedLayerId,
  selectedKeyframeId,
  onSeek,
  onTogglePlay,
  onToggleLoop,
  onSelectLayer,
  onSelectKeyframe,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onAddKeyframeAtCurrentTime,
  onDeleteKeyframe,
  onUpdateKeyframeTime,
  onChangeDuration,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(140);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState<boolean>(false);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{
    layerId: string;
    keyframeId: string;
  } | null>(null);

  const duration = project.duration;
  const fps = project.fps || 30;
  const totalWidth = duration * pixelsPerSecond;

  // Jump helpers
  const handleStepFrame = (frames: number) => {
    const frameDuration = 1 / fps;
    const newTime = Math.max(0, Math.min(duration, currentTime + frames * frameDuration));
    onSeek(newTime);
  };

  const handleJumpStart = () => onSeek(0);
  const handleJumpEnd = () => onSeek(duration);

  // Ruler scrub mouse handlers
  const calculateTimeFromMouse = (e: React.MouseEvent | MouseEvent): number => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current ? scrollContainerRef.current.scrollLeft : 0;
    const offsetX = e.clientX - rect.left + scrollLeft;
    const calculatedTime = offsetX / pixelsPerSecond;
    return Math.max(0, Math.min(duration, Math.round(calculatedTime * fps) / fps));
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsScrubbingRuler(true);
    const newTime = calculateTimeFromMouse(e);
    onSeek(newTime);
  };

  // Global mouse move & up for scrubbing and keyframe dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isScrubbingRuler) {
        const newTime = calculateTimeFromMouse(e);
        onSeek(newTime);
      } else if (draggingKeyframe) {
        const newTime = calculateTimeFromMouse(e);
        onUpdateKeyframeTime(draggingKeyframe.layerId, draggingKeyframe.keyframeId, newTime);
        onSeek(newTime);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isScrubbingRuler) setIsScrubbingRuler(false);
      if (draggingKeyframe) setDraggingKeyframe(null);
    };

    if (isScrubbingRuler || draggingKeyframe) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isScrubbingRuler, draggingKeyframe, duration, pixelsPerSecond, fps, onSeek, onUpdateKeyframeTime]);

  // Generate ruler tick marks
  const renderRulerTicks = () => {
    const ticks: React.ReactNode[] = [];
    const totalSeconds = Math.ceil(duration);

    for (let s = 0; s <= totalSeconds; s++) {
      const x = s * pixelsPerSecond;
      if (x <= totalWidth + 10) {
        ticks.push(
          <div
            key={`sec-${s}`}
            className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none select-none"
            style={{ left: `${x}px` }}
          >
            <span className="text-[10px] font-mono text-zinc-400 pl-1 font-medium">
              {s}s
            </span>
            <div className="w-px h-3.5 bg-zinc-600" />
          </div>
        );
      }

      // Sub-second subdivisions (every 0.25s)
      for (let sub = 1; sub < 4; sub++) {
        const subTime = s + sub * 0.25;
        if (subTime < duration) {
          const subX = subTime * pixelsPerSecond;
          ticks.push(
            <div
              key={`sub-${s}-${sub}`}
              className="absolute bottom-0 w-px h-2 bg-zinc-800 pointer-events-none"
              style={{ left: `${subX}px` }}
            />
          );
        }
      }
    }
    return ticks;
  };

  // Check if a layer has a keyframe at or very close to current playhead
  const hasKeyframeAtCurrentTime = (layer: Layer): LayerKeyframe | undefined => {
    const threshold = 0.04; // 40ms tolerance
    return (layer.keyframes || []).find((k) => Math.abs(k.time - currentTime) < threshold);
  };

  // Layers in timeline are displayed top-to-bottom matching reverse z-order or layer list
  const displayLayers = [...project.layers].reverse();

  return (
    <div className="h-64 bg-zinc-900 border-t border-zinc-800 flex flex-col select-none shrink-0 text-zinc-200">
      {/* 1. Playback & Timeline Controls Toolbar */}
      <div className="h-10 px-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpStart}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Step Back 1 Frame"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Main Play / Pause */}
          <button
            onClick={onTogglePlay}
            className={`w-7 h-7 flex items-center justify-center rounded-md font-bold transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/20'
                : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/30'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => handleStepFrame(1)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Step Forward 1 Frame"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleJumpEnd}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Jump to End (End)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'text-purple-400 bg-purple-950/50 border border-purple-800/60' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={isLooping ? 'Looping Enabled' : 'Looping Disabled'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Timecode and Frame counter */}
          <div className="flex items-center gap-2 pl-3 ml-2 border-l border-zinc-800 font-mono text-xs">
            <span className="text-white font-semibold">{currentTime.toFixed(2)}s</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-400">{duration.toFixed(2)}s</span>
            <span className="text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono ml-1">
              F {Math.round(currentTime * fps)}
            </span>
          </div>
        </div>

        {/* Right: Duration changer & Timeline Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Duration:</span>
            <select
              value={duration}
              onChange={(e) => onChangeDuration(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-purple-500"
            >
              <option value={3}>3.0s</option>
              <option value={5}>5.0s</option>
              <option value={8}>8.0s</option>
              <option value={10}>10.0s</option>
              <option value={15}>15.0s</option>
            </select>
          </div>

          {/* Timeline Zoom */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Zoom</span>
            <input
              type="range"
              min="80"
              max="280"
              value={pixelsPerSecond}
              onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
              className="w-20 accent-purple-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Main Timeline Area (Track List on Left, Tracks + Ruler on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers Column */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
          {/* Header row aligned with ruler */}
          <div className="h-7 px-3 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Layers ({project.layers.length})</span>
            <span className="text-[10px] text-zinc-400">Keyframes</span>
          </div>

          {/* Layer Headers List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
            {displayLayers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const currentKf = hasKeyframeAtCurrentTime(layer);

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`h-11 px-3 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-purple-950/40 text-purple-200 border-l-2 border-purple-500' : 'hover:bg-zinc-800/50 text-zinc-300'
                  }`}
                >
                  {/* Layer Icon & Name */}
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-zinc-500 shrink-0">
                      {layer.type === 'text' && <Type className="w-3.5 h-3.5 text-blue-400" />}
                      {layer.type === 'shape' && <Square className="w-3.5 h-3.5 text-emerald-400" />}
                      {layer.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                    </span>
                    <span className="text-xs font-medium truncate" title={layer.name}>
                      {layer.name}
                    </span>
                  </div>

                  {/* Layer Actions: Keyframe diamond, Visibility, Lock */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Add / Toggle Keyframe Button */}
                    <button
                      onClick={() => onAddKeyframeAtCurrentTime(layer.id)}
                      className={`p-1 rounded transition-colors ${
                        currentKf
                          ? 'text-amber-400 bg-amber-950/50 hover:bg-amber-900/50'
                          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                      title={currentKf ? 'Keyframe exists at current time (Click to toggle/remove)' : 'Add Keyframe at Current Time'}
                    >
                      <Diamond className={`w-3.5 h-3.5 ${currentKf ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Visibility */}
                    <button
                      onClick={() => onToggleLayerVisibility(layer.id)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>

                    {/* Lock */}
                    <button
                      onClick={() => onToggleLayerLock(layer.id)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Tracks + Ruler */}
        <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto bg-zinc-950 relative">
          <div style={{ width: `${Math.max(totalWidth + 100, 800)}px` }} className="relative min-h-full">
            {/* Top Ruler Bar */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              className="h-7 bg-zinc-900/95 border-b border-zinc-800 sticky top-0 z-20 cursor-ew-resize relative"
            >
              {renderRulerTicks()}
            </div>

            {/* Playhead Vertical Needle & Scrubber Flag */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
            >
              {/* Playhead Flag at Top */}
              <div className="w-3 h-3 bg-red-500 transform rotate-45 -translate-x-1.5 -translate-y-1 shadow-sm" />
              {/* Vertical line through ruler and all tracks */}
              <div className="w-px h-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            </div>

            {/* Layer Track Lanes */}
            <div className="divide-y divide-zinc-900">
              {displayLayers.map((layer) => {
                const isSelected = layer.id === selectedLayerId;
                const inX = layer.inPoint * pixelsPerSecond;
                const outX = layer.outPoint * pixelsPerSecond;
                const trackWidth = Math.max(10, outX - inX);

                return (
                  <div
                    key={layer.id}
                    onClick={() => onSelectLayer(layer.id)}
                    className={`h-11 relative cursor-pointer flex items-center ${
                      isSelected ? 'bg-purple-950/20' : 'hover:bg-zinc-900/40'
                    }`}
                  >
                    {/* Active In-Out Span Bar */}
                    <div
                      className="absolute h-6 rounded-md bg-zinc-850 border border-zinc-700/60 overflow-hidden shadow-inner flex items-center px-2"
                      style={{
                        left: `${inX}px`,
                        width: `${trackWidth}px`,
                      }}
                    >
                      <span className="text-[10px] text-zinc-400 font-mono select-none truncate">
                        {layer.name}
                      </span>
                    </div>

                    {/* Keyframe Markers on Track */}
                    {(layer.keyframes || []).map((kf) => {
                      const kfX = kf.time * pixelsPerSecond;
                      const isKfSelected = kf.id === selectedKeyframeId;
                      const isNearPlayhead = Math.abs(kf.time - currentTime) < 0.04;

                      return (
                        <div
                          key={kf.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectLayer(layer.id);
                            onSelectKeyframe(kf.id);
                            onSeek(kf.time);
                            setDraggingKeyframe({
                              layerId: layer.id,
                              keyframeId: kf.id,
                            });
                          }}
                          className={`absolute z-10 w-3.5 h-3.5 transform -translate-x-1/2 rotate-45 cursor-ew-resize transition-transform hover:scale-125 ${
                            isKfSelected || isNearPlayhead
                              ? 'bg-amber-400 border border-white shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110'
                              : 'bg-indigo-400 border border-indigo-200'
                          }`}
                          style={{ left: `${kfX}px` }}
                          title={`Keyframe at ${kf.time.toFixed(2)}s (${kf.easing || 'linear'}) - Drag to move or click to seek`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
