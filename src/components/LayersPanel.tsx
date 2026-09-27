import React, { useState } from 'react';
import {
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  Image as ImageIcon,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Layers,
  Upload,
} from 'lucide-react';
import { Layer, LayerType, ShapeType } from '../types/editor';

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onAddLayer: (type: LayerType, extra?: Partial<Layer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onReorderLayer: (layerId: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayer,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
}) => {
  const [showAddMenu, setShowAddMenu] = useState<'none' | 'shape'>('none');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleStartRename = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishRename = (layerId: string) => {
    if (editingName.trim()) {
      onRenameLayer(layerId, editingName.trim());
    }
    setEditingLayerId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        onAddLayer('image', {
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
          src,
          width: 500,
          height: 500,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Layers displayed top to bottom (index 0 in list is topmost layer, matching reverse array)
  const displayLayers = [...layers].reverse();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 select-none text-zinc-200">
      {/* Panel Header & Quick Add Elements */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Elements & Layers</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">{layers.length}</span>
        </div>

        {/* Add Element Buttons Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* Add Text */}
          <button
            onClick={() => onAddLayer('text')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 hover:text-white text-zinc-300 border border-zinc-750 transition-colors group"
            title="Add Kinetic Text Layer"
          >
            <Type className="w-4 h-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium">Text</span>
          </button>

          {/* Add Shape Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(showAddMenu === 'shape' ? 'none' : 'shape')}
              className="w-full flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 hover:text-white text-zinc-300 border border-zinc-750 transition-colors group"
              title="Add Shape (Rect, Circle, Star...)"
            >
              <Square className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">Shape</span>
            </button>

            {/* Shape submenu popup */}
            {showAddMenu === 'shape' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 z-30 flex flex-col gap-0.5">
                {[
                  { type: 'rectangle', label: 'Rectangle', icon: Square },
                  { type: 'rounded-rect', label: 'Rounded Box', icon: Square },
                  { type: 'circle', label: 'Circle', icon: Circle },
                  { type: 'triangle', label: 'Triangle', icon: Triangle },
                  { type: 'star', label: 'Star', icon: Star },
                  { type: 'line', label: 'Line / Divider', icon: Minus },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.type}
                      onClick={() => {
                        onAddLayer('shape', { shapeType: s.type as ShapeType, name: s.label });
                        setShowAddMenu('none');
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded text-left"
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Image Upload */}
          <label className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 hover:text-white text-zinc-300 border border-zinc-750 transition-colors cursor-pointer group" title="Upload Image / Graphic">
            <Upload className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Layer Order Controls (Move Up / Down) */}
      <div className="px-3 py-1.5 bg-zinc-950/40 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span>Order</span>
        <div className="flex items-center gap-1">
          <button
            disabled={!selectedLayerId}
            onClick={() => selectedLayerId && onReorderLayer(selectedLayerId, 'up')}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Bring Layer Forward"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!selectedLayerId}
            onClick={() => selectedLayerId && onReorderLayer(selectedLayerId, 'down')}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Send Layer Backward"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 p-2 space-y-1">
        {displayLayers.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-zinc-500">
            <Layers className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No elements on canvas</p>
            <p className="text-[11px] text-zinc-600 mt-1">Add text, shapes, or images above</p>
          </div>
        ) : (
          displayLayers.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            const keyframeCount = (layer.keyframes || []).length;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-900/30 border border-purple-500/50 text-white shadow-sm'
                    : 'bg-zinc-850/50 hover:bg-zinc-800/80 border border-transparent text-zinc-300'
                }`}
              >
                {/* Left: Type Icon & Editable Name */}
                <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                  <span className="shrink-0">
                    {layer.type === 'text' && <Type className="w-3.5 h-3.5 text-blue-400" />}
                    {layer.type === 'shape' && <Square className="w-3.5 h-3.5 text-emerald-400" />}
                    {layer.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                  </span>

                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleFinishRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(layer.id);
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      autoFocus
                      className="bg-zinc-950 border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => handleStartRename(layer)}
                      className="truncate font-medium hover:underline select-none"
                      title="Double click to rename"
                    >
                      {layer.name}
                    </span>
                  )}

                  {keyframeCount > 0 && (
                    <span className="shrink-0 text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1 py-0.2 rounded">
                      {keyframeCount}kf
                    </span>
                  )}
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleVisibility(layer.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title={layer.visible ? 'Hide' : 'Show'}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                  </button>

                  <button
                    onClick={() => onToggleLock(layer.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title={layer.locked ? 'Unlock' : 'Lock'}
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 opacity-30 hover:opacity-100" />}
                  </button>

                  <button
                    onClick={() => onDuplicateLayer(layer.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Duplicate Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteLayer(layer.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
