import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { Layer, Project } from '../types/editor';
import { renderProjectFrame } from '../utils/canvasRenderer';
import { getLayerStateAtTime } from '../utils/interpolation';

interface CanvasStageProps {
  project: Project;
  currentTime: number;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayerTransform: (
    layerId: string,
    transform: { x?: number; y?: number; width?: number; height?: number; rotation?: number }
  ) => void;
  showSafeZone: boolean;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  project,
  currentTime,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayerTransform,
  showSafeZone,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(0); // 0 means 'Fit'
  const [fitScale, setFitScale] = useState<number>(0.35);

  // Interaction dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'rotate' | 'resize' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ mouseX: number; mouseY: number }>({ mouseX: 0, mouseY: 0 });
  const [initialLayerState, setInitialLayerState] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  } | null>(null);

  // Snap guide state
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  // Recalculate auto-fit scale on window resize or project dimensions change
  const updateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 64; // px padding
    const availableW = Math.max(100, clientWidth - padding);
    const availableH = Math.max(100, clientHeight - padding);

    const scaleX = availableW / project.canvasWidth;
    const scaleY = availableH / project.canvasHeight;
    const bestScale = Math.min(scaleX, scaleY, 1.2);
    setFitScale(bestScale);
  }, [project.canvasWidth, project.canvasHeight]);

  useEffect(() => {
    updateFitScale();
    window.addEventListener('resize', updateFitScale);
    return () => window.removeEventListener('resize', updateFitScale);
  }, [updateFitScale]);

  const activeScale = zoomLevel === 0 ? fitScale : zoomLevel;

  // Render canvas whenever project, currentTime, or scale changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use full canvas dimensions for crisp high-DPI rendering
    canvas.width = project.canvasWidth;
    canvas.height = project.canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderProjectFrame(ctx, project, currentTime, {
      showSafeZone,
      clearColor: project.backgroundColor,
    });
  }, [project, currentTime, showSafeZone]);

  // Selected layer current computed state
  const selectedLayer = project.layers.find((l) => l.id === selectedLayerId);
  const selectedState = selectedLayer ? getLayerStateAtTime(selectedLayer, currentTime) : null;

  // Helper to convert client mouse event to Canvas Stage Coordinates
  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / activeScale;
    const y = (e.clientY - rect.top) / activeScale;
    return { x, y };
  };

  // Hit test layers to select clicked element
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    const { x, y } = getCanvasCoords(e);

    // Test in reverse order (top-most layer first)
    const reversedLayers = [...project.layers].reverse();
    let hitLayer: Layer | null = null;

    for (const layer of reversedLayers) {
      if (!layer.visible || layer.locked) continue;
      const state = getLayerStateAtTime(layer, currentTime);
      if (!state.isVisible) continue;

      // Simple box hit test transformed back to layer coordinates
      const dx = x - state.x;
      const dy = y - state.y;
      const rad = (-state.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      const halfW = (state.width * state.scaleX) / 2;
      const halfH = (state.height * state.scaleY) / 2;

      if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
        hitLayer = layer;
        break;
      }
    }

    if (hitLayer) {
      onSelectLayer(hitLayer.id);
      // Start moving layer immediately
      const hitState = getLayerStateAtTime(hitLayer, currentTime);
      setIsDragging(true);
      setDragType('move');
      setDragStartPos({ mouseX: x, mouseY: y });
      setInitialLayerState({
        x: hitState.x,
        y: hitState.y,
        width: hitState.width,
        height: hitState.height,
        rotation: hitState.rotation,
      });
    } else {
      // Clicked on empty canvas background
      onSelectLayer(null);
    }
  };

  // Start drag interaction on handles
  const startDragHandle = (
    e: React.MouseEvent,
    type: 'move' | 'rotate' | 'resize',
    handleName?: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedState || selectedLayer?.locked) return;

    const { x, y } = getCanvasCoords(e);
    setIsDragging(true);
    setDragType(type);
    setResizeHandle(handleName || null);
    setDragStartPos({ mouseX: x, mouseY: y });
    setInitialLayerState({
      x: selectedState.x,
      y: selectedState.y,
      width: selectedState.width,
      height: selectedState.height,
      rotation: selectedState.rotation,
    });
  };

  // Mouse move handler during dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !initialLayerState || !selectedLayerId) return;

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    const deltaX = mouseX - dragStartPos.mouseX;
    const deltaY = mouseY - dragStartPos.mouseY;

    if (dragType === 'move') {
      let targetX = Math.round(initialLayerState.x + deltaX);
      let targetY = Math.round(initialLayerState.y + deltaY);

      // Smart center snapping
      const snapThreshold = 14;
      const centerX = project.canvasWidth / 2;
      const centerY = project.canvasHeight / 2;
      const newSnap: { x?: number; y?: number } = {};

      if (Math.abs(targetX - centerX) < snapThreshold) {
        targetX = centerX;
        newSnap.x = centerX;
      }
      if (Math.abs(targetY - centerY) < snapThreshold) {
        targetY = centerY;
        newSnap.y = centerY;
      }
      setSnapLines(newSnap);

      onUpdateLayerTransform(selectedLayerId, { x: targetX, y: targetY });
    } else if (dragType === 'rotate') {
      const centerX = initialLayerState.x;
      const centerY = initialLayerState.y;
      const angleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
      let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
      if (angleDeg > 180) angleDeg -= 360;

      // Snap to 0, 90, 180, -90
      if (Math.abs(angleDeg) < 5) angleDeg = 0;
      if (Math.abs(angleDeg - 90) < 5) angleDeg = 90;
      if (Math.abs(angleDeg + 90) < 5) angleDeg = -90;

      onUpdateLayerTransform(selectedLayerId, { rotation: angleDeg });
    } else if (dragType === 'resize' && resizeHandle) {
      let newW = initialLayerState.width;
      let newH = initialLayerState.height;

      if (resizeHandle.includes('e')) newW = Math.max(20, initialLayerState.width + deltaX * 2);
      if (resizeHandle.includes('w')) newW = Math.max(20, initialLayerState.width - deltaX * 2);
      if (resizeHandle.includes('s')) newH = Math.max(20, initialLayerState.height + deltaY * 2);
      if (resizeHandle.includes('n')) newH = Math.max(20, initialLayerState.height - deltaY * 2);

      onUpdateLayerTransform(selectedLayerId, {
        width: Math.round(newW),
        height: Math.round(newH),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
    setResizeHandle(null);
    setSnapLines({});
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-full bg-zinc-950 overflow-hidden flex items-center justify-center select-none"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Canvas Container with scaled dimensions */}
      <div
        className="relative transition-transform duration-75 shadow-2xl rounded-sm"
        style={{
          width: project.canvasWidth * activeScale,
          height: project.canvasHeight * activeScale,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className="w-full h-full block cursor-crosshair rounded shadow-lg shadow-black/60"
          style={{
            backgroundColor: project.backgroundColor,
          }}
        />

        {/* Snap Guide Lines */}
        {snapLines.x !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px bg-cyan-400 pointer-events-none z-30 shadow-[0_0_8px_#22d3ee]"
            style={{ left: snapLines.x * activeScale }}
          />
        )}
        {snapLines.y !== undefined && (
          <div
            className="absolute left-0 right-0 h-px bg-cyan-400 pointer-events-none z-30 shadow-[0_0_8px_#22d3ee]"
            style={{ top: snapLines.y * activeScale }}
          />
        )}

        {/* Interactive Bounding Box for Selected Layer */}
        {selectedState && selectedState.isVisible && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: selectedState.x * activeScale,
              top: selectedState.y * activeScale,
              width: selectedState.width * selectedState.scaleX * activeScale,
              height: selectedState.height * selectedState.scaleY * activeScale,
              transform: `translate(-50%, -50%) rotate(${selectedState.rotation}deg)`,
            }}
          >
            {/* Outline Box */}
            <div className="w-full h-full border-2 border-purple-500/90 pointer-events-auto cursor-move relative shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              {/* Rotation Handle above top center */}
              <div
                onMouseDown={(e) => startDragHandle(e, 'rotate')}
                className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-purple-600 shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center"
                title="Rotate element"
              >
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
              </div>
              {/* Rotation connector line */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-purple-500 pointer-events-none" />

              {/* 8 Resize Handles */}
              {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((handle) => {
                let positionClass = '';
                let cursorClass = '';
                if (handle === 'nw') {
                  positionClass = '-top-1.5 -left-1.5';
                  cursorClass = 'cursor-nwse-resize';
                } else if (handle === 'ne') {
                  positionClass = '-top-1.5 -right-1.5';
                  cursorClass = 'cursor-nesw-resize';
                } else if (handle === 'se') {
                  positionClass = '-bottom-1.5 -right-1.5';
                  cursorClass = 'cursor-nwse-resize';
                } else if (handle === 'sw') {
                  positionClass = '-bottom-1.5 -left-1.5';
                  cursorClass = 'cursor-nesw-resize';
                } else if (handle === 'n') {
                  positionClass = '-top-1.5 left-1/2 -translate-x-1/2';
                  cursorClass = 'cursor-ns-resize';
                } else if (handle === 's') {
                  positionClass = '-bottom-1.5 left-1/2 -translate-x-1/2';
                  cursorClass = 'cursor-ns-resize';
                } else if (handle === 'w') {
                  positionClass = '-left-1.5 top-1/2 -translate-y-1/2';
                  cursorClass = 'cursor-ew-resize';
                } else if (handle === 'e') {
                  positionClass = '-right-1.5 top-1/2 -translate-y-1/2';
                  cursorClass = 'cursor-ew-resize';
                }

                return (
                  <div
                    key={handle}
                    onMouseDown={(e) => startDragHandle(e, 'resize', handle)}
                    className={`absolute ${positionClass} ${cursorClass} w-2.5 h-2.5 bg-white border border-purple-600 rounded-xs shadow-sm hover:scale-125 transition-transform`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Zoom & View Controls Overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg p-1 text-zinc-300 shadow-xl">
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.15, (z === 0 ? fitScale : z) - 0.1))}
          className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setZoomLevel(0)}
          className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
            zoomLevel === 0 ? 'bg-purple-600/30 text-purple-300' : 'hover:bg-zinc-800 hover:text-white'
          }`}
          title="Fit to Screen"
        >
          {zoomLevel === 0 ? `Fit (${Math.round(fitScale * 100)}%)` : `${Math.round(zoomLevel * 100)}%`}
        </button>

        <button
          onClick={() => setZoomLevel((z) => Math.min(2.0, (z === 0 ? fitScale : z) + 0.1))}
          className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setZoomLevel(1)}
          className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
            zoomLevel === 1 ? 'bg-purple-600/30 text-purple-300' : 'hover:bg-zinc-800 hover:text-white'
          }`}
          title="Zoom 100%"
        >
          100%
        </button>
      </div>
    </div>
  );
};
