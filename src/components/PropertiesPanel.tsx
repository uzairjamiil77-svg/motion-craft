import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Sparkles,
  Sliders,
  Type,
  Square,
  Image as ImageIcon,
  Trash2,
  Copy,
  Diamond,
  Zap,
} from 'lucide-react';
import {
  AnimationPresetId,
  EasingType,
  Layer,
  Project,
  ShapeType,
} from '../types/editor';
import { ANIMATION_PRESETS } from '../utils/presets';
import { getLayerStateAtTime } from '../utils/interpolation';

interface PropertiesPanelProps {
  project: Project;
  currentTime: number;
  selectedLayerId: string | null;
  selectedKeyframeId: string | null;
  onUpdateLayer: (layerId: string, partial: Partial<Layer>) => void;
  onUpdateProjectBg: (color: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onApplyPreset: (presetId: AnimationPresetId) => void;
  onUpdateKeyframeEasing: (layerId: string, keyframeId: string, easing: EasingType) => void;
  onAddKeyframe: (layerId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  project,
  currentTime,
  selectedLayerId,
  selectedKeyframeId,
  onUpdateLayer,
  onUpdateProjectBg,
  onDeleteLayer,
  onDuplicateLayer,
  onApplyPreset,
  onUpdateKeyframeEasing,
  onAddKeyframe,
}) => {
  const selectedLayer = project.layers.find((l) => l.id === selectedLayerId);
  const currentState = selectedLayer ? getLayerStateAtTime(selectedLayer, currentTime) : null;

  // Selected keyframe if any
  const selectedKeyframe = selectedLayer?.keyframes?.find((k) => k.id === selectedKeyframeId);

  // Alignment helpers
  const handleAlign = (type: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'center-both') => {
    if (!selectedLayer) return;
    const { canvasWidth, canvasHeight } = project;
    let newX = selectedLayer.x;
    let newY = selectedLayer.y;

    if (type === 'left') newX = selectedLayer.width / 2 + 40;
    if (type === 'center-h') newX = canvasWidth / 2;
    if (type === 'right') newX = canvasWidth - selectedLayer.width / 2 - 40;
    if (type === 'top') newY = selectedLayer.height / 2 + 40;
    if (type === 'center-v') newY = canvasHeight / 2;
    if (type === 'bottom') newY = canvasHeight - selectedLayer.height / 2 - 40;
    if (type === 'center-both') {
      newX = canvasWidth / 2;
      newY = canvasHeight / 2;
    }

    onUpdateLayer(selectedLayer.id, { x: Math.round(newX), y: Math.round(newY) });
  };

  // If no layer is selected, show Project Settings
  if (!selectedLayer || !currentState) {
    return (
      <aside className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 select-none text-zinc-200 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span>Stage Settings</span>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={project.backgroundColor}
                onChange={(e) => onUpdateProjectBg(e.target.value)}
                className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={project.backgroundColor}
                onChange={(e) => onUpdateProjectBg(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 font-mono text-zinc-200 text-xs uppercase"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60">
            <span className="block text-zinc-400 mb-2 font-medium">Stage Info</span>
            <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono text-[11px]">
              <div className="bg-zinc-800/60 p-2 rounded border border-zinc-750">
                <span className="text-zinc-500 block text-[9px] uppercase">Format</span>
                {project.aspectRatio}
              </div>
              <div className="bg-zinc-800/60 p-2 rounded border border-zinc-750">
                <span className="text-zinc-500 block text-[9px] uppercase">Resolution</span>
                {project.canvasWidth}×{project.canvasHeight}
              </div>
              <div className="bg-zinc-800/60 p-2 rounded border border-zinc-750">
                <span className="text-zinc-500 block text-[9px] uppercase">Duration</span>
                {project.duration}s
              </div>
              <div className="bg-zinc-800/60 p-2 rounded border border-zinc-750">
                <span className="text-zinc-500 block text-[9px] uppercase">FPS</span>
                {project.fps}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Cheat-Sheet */}
          <div className="pt-3 border-t border-zinc-800/60">
            <span className="block text-zinc-400 mb-2 font-medium">Shortcuts</span>
            <div className="space-y-1 text-[11px] text-zinc-400">
              <div className="flex justify-between">
                <span>Play / Pause</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span>Step 1 frame</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Left / Right</kbd>
              </div>
              <div className="flex justify-between">
                <span>Delete element</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Backspace</kbd>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 select-none text-zinc-200 overflow-y-auto">
      {/* Header with Selected Layer Name and Actions */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <span className="text-purple-400">
            {selectedLayer.type === 'text' && <Type className="w-4 h-4" />}
            {selectedLayer.type === 'shape' && <Square className="w-4 h-4" />}
            {selectedLayer.type === 'image' && <ImageIcon className="w-4 h-4" />}
          </span>
          <span className="font-semibold text-xs text-white truncate">{selectedLayer.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateLayer(selectedLayer.id)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Duplicate Layer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteLayer(selectedLayer.id)}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
            title="Delete Layer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4 text-xs divide-y divide-zinc-800/60">
        {/* 1. Alignment Buttons */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
            Align Stage
          </span>
          <div className="grid grid-cols-6 gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => handleAlign('left')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex justify-center"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('center-h')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex justify-center"
              title="Align Center Horizontally"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('right')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex justify-center"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('top')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex justify-center"
              title="Align Top"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5 rotate-90" />
            </button>
            <button
              onClick={() => handleAlign('center-v')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex justify-center"
              title="Align Center Vertically"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('center-both')}
              className="p-1.5 text-purple-400 hover:text-white hover:bg-purple-900/40 rounded flex justify-center"
              title="Center Exactly in Canvas"
            >
              <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Transform (Position, Size, Scale, Rotation, Opacity) */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Transform
            </span>
            <button
              onClick={() => onAddKeyframe(selectedLayer.id)}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-medium"
              title="Record current transform as keyframe at playhead"
            >
              <Diamond className="w-3 h-3 fill-amber-400" />
              <span>Keyframe</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* X */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">X Position</label>
              <input
                type="number"
                value={Math.round(currentState.x)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
              />
            </div>
            {/* Y */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Y Position</label>
              <input
                type="number"
                value={Math.round(currentState.y)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
              />
            </div>
            {/* W */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Width</label>
              <input
                type="number"
                value={Math.round(currentState.width)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
              />
            </div>
            {/* H */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Height</label>
              <input
                type="number"
                value={Math.round(currentState.height)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
              />
            </div>
          </div>

          {/* Scale Slider */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Scale</span>
              <span className="font-mono">{Math.round(currentState.scaleX * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={currentState.scaleX}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                onUpdateLayer(selectedLayer.id, { scaleX: s, scaleY: s });
              }}
              className="w-full accent-purple-500 h-1 bg-zinc-750 rounded-lg cursor-pointer"
            />
          </div>

          {/* Rotation Slider */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Rotation</span>
              <span className="font-mono">{Math.round(currentState.rotation)}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={currentState.rotation}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { rotation: parseInt(e.target.value) })}
              className="w-full accent-purple-500 h-1 bg-zinc-750 rounded-lg cursor-pointer"
            />
          </div>

          {/* Opacity Slider */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Opacity</span>
              <span className="font-mono">{Math.round(currentState.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={currentState.opacity}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 h-1 bg-zinc-750 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Type-Specific Styling */}
        {selectedLayer.type === 'text' && (
          <div className="pt-3 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Typography
            </span>

            {/* Text Content */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Content</label>
              <textarea
                value={selectedLayer.text}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-sans focus:outline-none focus:border-purple-500 resize-y"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Font Family</label>
              <select
                value={selectedLayer.fontFamily}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200"
              >
                <option value="Inter">Inter (Clean Sans)</option>
                <option value="Cabinet Grotesk">Cabinet Grotesk (Bold Kinetic)</option>
                <option value="Outfit">Outfit (Modern Tech)</option>
                <option value="Space Grotesk">Space Grotesk (Geometric)</option>
                <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Size (px)</label>
                <input
                  type="number"
                  value={selectedLayer.fontSize}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Weight</label>
                <select
                  value={selectedLayer.fontWeight}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fontWeight: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                >
                  <option value="400">Regular (400)</option>
                  <option value="600">Semi Bold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="900">Black (900)</option>
                </select>
              </div>
            </div>

            {/* Text Alignment & Text Color */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedLayer.fillColor}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { fillColor: e.target.value })}
                    className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedLayer.fillColor}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { fillColor: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[11px] font-mono uppercase text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Align</label>
                <div className="flex bg-zinc-800 rounded border border-zinc-700 p-0.5">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: align })}
                      className={`flex-1 py-1 rounded text-xs flex justify-center ${
                        selectedLayer.textAlign === align ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Letter Spacing */}
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Letter Spacing</span>
                <span className="font-mono">{selectedLayer.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-2"
                max="24"
                value={selectedLayer.letterSpacing}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1 bg-zinc-750 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {selectedLayer.type === 'shape' && (
          <div className="pt-3 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Shape Style
            </span>

            {/* Shape Type */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Type</label>
              <select
                value={selectedLayer.shapeType}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { shapeType: e.target.value as ShapeType })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200"
              >
                <option value="rectangle">Rectangle</option>
                <option value="rounded-rect">Rounded Box</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="star">Star</option>
                <option value="line">Line</option>
              </select>
            </div>

            {/* Fill Color */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedLayer.fillColor === 'transparent' ? '#000000' : selectedLayer.fillColor}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fillColor: e.target.value })}
                  className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedLayer.fillColor}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fillColor: e.target.value })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono uppercase text-zinc-200"
                />
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      fillColor: selectedLayer.fillColor === 'transparent' ? '#38bdf8' : 'transparent',
                    })
                  }
                  className={`px-2 py-1 rounded text-[10px] border ${
                    selectedLayer.fillColor === 'transparent'
                      ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                      : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  None
                </button>
              </div>
            </div>

            {/* Stroke Color & Width */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Stroke Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedLayer.strokeColor || '#ffffff'}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                    className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedLayer.strokeColor || 'none'}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[11px] font-mono uppercase text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Stroke Width</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={selectedLayer.strokeWidth || 0}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                />
              </div>
            </div>

            {/* Border Radius for Rect */}
            {(selectedLayer.shapeType === 'rounded-rect' || selectedLayer.shapeType === 'rectangle') && (
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Corner Radius</span>
                  <span className="font-mono">{selectedLayer.borderRadius ?? 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={selectedLayer.borderRadius ?? 0}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { borderRadius: Number(e.target.value) })}
                  className="w-full accent-purple-500 h-1 bg-zinc-750 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. Animation Presets Accordion */}
        <div className="pt-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Animation Presets
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ANIMATION_PRESETS.filter((p) => !p.appliesToTextOnly || selectedLayer.type === 'text').map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.id)}
                className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 hover:border-purple-500/60 text-left transition-all hover:scale-[1.02] group"
              >
                <span className="font-semibold text-zinc-200 text-[11px] block group-hover:text-purple-300">
                  {preset.name}
                </span>
                <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>

          {/* Easing Inspector if a Keyframe is Selected */}
          {selectedKeyframe && (
            <div className="mt-3 p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-mono font-semibold text-amber-300 flex items-center gap-1">
                  <Diamond className="w-3 h-3 fill-current" />
                  Keyframe @ {selectedKeyframe.time.toFixed(2)}s
                </span>
              </div>
              <label className="text-[10px] text-zinc-400 block mb-1">Easing Curve</label>
              <select
                value={selectedKeyframe.easing || 'linear'}
                onChange={(e) =>
                  onUpdateKeyframeEasing(selectedLayer.id, selectedKeyframe.id, e.target.value as EasingType)
                }
                className="w-full bg-zinc-900 border border-amber-500/40 text-amber-200 rounded px-2 py-1 text-xs"
              >
                <option value="linear">Linear (Constant speed)</option>
                <option value="easeOut">Ease Out (Decelerate smoothly)</option>
                <option value="easeIn">Ease In (Accelerate in)</option>
                <option value="easeInOut">Ease In-Out (Natural smooth)</option>
                <option value="bounce">Bounce Out (Bouncy pop)</option>
                <option value="elastic">Elastic Out (Spring)</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
