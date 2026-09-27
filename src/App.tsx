/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AspectRatioType,
  CANVAS_PRESETS,
  EasingType,
  Layer,
  LayerKeyframe,
  LayerType,
  Project,
} from './types/editor';
import { applyPresetToLayer } from './utils/presets';
import { getInitialProject, parseProjectJSON, saveProjectToStorage } from './utils/storage';
import { TemplateDefinition } from './utils/templates';
import { HeaderBar } from './components/HeaderBar';
import { CanvasStage } from './components/CanvasStage';
import { Timeline } from './components/Timeline';
import { LayersPanel } from './components/LayersPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TemplateGalleryModal } from './components/TemplateGalleryModal';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { getLayerStateAtTime } from './utils/interpolation';

export default function App() {
  // Project State & History
  const [project, setProject] = useState<Project>(() => getInitialProject());
  const [history, setHistory] = useState<Project[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Playhead & Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Selection State
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);

  // Modals
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState<boolean>(false);

  // Auto-Save Notification
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Animation frame loop refs
  const lastFrameTimeRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;

  // Push state to undo/redo history
  const updateProjectWithHistory = useCallback((newProject: Project | ((prev: Project) => Project)) => {
    setProject((prev) => {
      const next = typeof newProject === 'function' ? newProject(prev) : newProject;
      setHistory((h) => [...h.slice(0, historyIndex + 1), prev]);
      setHistoryIndex((idx) => idx + 1);
      return next;
    });
  }, [historyIndex]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectToStorage(project);
    }, 800);
    return () => clearTimeout(timer);
  }, [project]);

  // Playback RequestAnimationFrame Loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const loop = (timestamp: number) => {
      if (lastFrameTimeRef.current !== null) {
        const deltaSeconds = (timestamp - lastFrameTimeRef.current) / 1000;
        let nextTime = currentTimeRef.current + deltaSeconds;

        if (nextTime >= project.duration) {
          if (isLooping) {
            nextTime = 0;
          } else {
            nextTime = project.duration;
            setIsPlaying(false);
          }
        }
        setCurrentTime(nextTime);
      }
      lastFrameTimeRef.current = timestamp;
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, isLooping, project.duration]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return; // Don't trigger shortcuts when typing
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }

      // Backspace / Delete: Delete selected element
      if (e.code === 'Backspace' || e.code === 'Delete') {
        if (selectedLayerId) {
          e.preventDefault();
          handleDeleteLayer(selectedLayerId);
        }
      }

      // Left Arrow / Right Arrow: Step 1 frame
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1 / (project.fps || 30)));
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(project.duration, t + 1 / (project.fps || 30)));
      }

      // Escape: Deselect
      if (e.code === 'Escape') {
        setSelectedLayerId(null);
        setSelectedKeyframeId(null);
      }

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z / Ctrl+Y: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, project.fps, project.duration]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const prevProject = history[historyIndex];
      setHistoryIndex((i) => i - 1);
      setProject(prevProject);
    }
  };

  const handleRedo = () => {
    if (historyIndex + 1 < history.length) {
      const nextProject = history[historyIndex + 1];
      setHistoryIndex((i) => i + 1);
      setProject(nextProject);
    }
  };

  const handleManualSave = () => {
    saveProjectToStorage(project);
    setSaveToast('Project saved successfully!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Layer
  const handleAddLayer = (type: LayerType, extra: any = {}) => {
    const count = project.layers.filter((l) => l.type === type).length + 1;
    const centerX = project.canvasWidth / 2;
    const centerY = project.canvasHeight / 2;

    let newLayer: Layer;

    if (type === 'text') {
      const textLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: extra.name || `Text Layer ${count}`,
        type: 'text',
        visible: true,
        locked: false,
        inPoint: 0,
        outPoint: project.duration,
        x: centerX,
        y: centerY,
        width: 600,
        height: 120,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        text: 'NEW HEADLINE',
        fontFamily: 'Cabinet Grotesk',
        fontSize: 72,
        fontWeight: 900,
        textAlign: 'center',
        fillColor: '#ffffff',
        letterSpacing: 2,
        lineHeight: 1.1,
        typewriterProgress: 1,
        keyframes: [
          { id: `kf-${Date.now()}-1`, time: 0, values: { opacity: 0, scaleX: 0.5, scaleY: 0.5 }, easing: 'bounce' },
          { id: `kf-${Date.now()}-2`, time: 0.8, values: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'bounce' },
        ],
        ...extra,
      };
      newLayer = textLayer;
    } else if (type === 'shape') {
      const shapeLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: extra.name || `Shape ${count}`,
        type: 'shape',
        shapeType: extra.shapeType || 'rectangle',
        visible: true,
        locked: false,
        inPoint: 0,
        outPoint: project.duration,
        x: centerX,
        y: centerY,
        width: 320,
        height: 200,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        fillColor: '#8b5cf6',
        strokeColor: '#c084fc',
        strokeWidth: 0,
        borderRadius: 20,
        keyframes: [
          { id: `kf-${Date.now()}-1`, time: 0, values: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: 'easeOut' },
          { id: `kf-${Date.now()}-2`, time: 0.7, values: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'easeOut' },
        ],
        ...extra,
      };
      newLayer = shapeLayer;
    } else {
      const imageLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: extra.name || `Image ${count}`,
        type: 'image',
        visible: true,
        locked: false,
        inPoint: 0,
        outPoint: project.duration,
        x: centerX,
        y: centerY,
        width: 480,
        height: 480,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        src: extra.src || '',
        objectFit: 'contain',
        borderRadius: 16,
        keyframes: [
          { id: `kf-${Date.now()}-1`, time: 0, values: { opacity: 0, scaleX: 0.8, scaleY: 0.8 }, easing: 'easeOut' },
          { id: `kf-${Date.now()}-2`, time: 0.6, values: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'easeOut' },
        ],
        ...extra,
      };
      newLayer = imageLayer;
    }

    updateProjectWithHistory({
      ...project,
      layers: [...project.layers, newLayer],
    });
    setSelectedLayerId(newLayer.id);
  };

  // Delete Layer
  const handleDeleteLayer = (layerId: string) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.filter((l) => l.id !== layerId),
    });
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
      setSelectedKeyframeId(null);
    }
  };

  // Duplicate Layer
  const handleDuplicateLayer = (layerId: string) => {
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;

    const copy: Layer = {
      ...layer,
      id: `layer-${Date.now()}`,
      name: `${layer.name} (Copy)`,
      x: layer.x + 30,
      y: layer.y + 30,
      keyframes: (layer.keyframes || []).map((k) => ({
        ...k,
        id: `kf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      })),
    };

    updateProjectWithHistory({
      ...project,
      layers: [...project.layers, copy],
    });
    setSelectedLayerId(copy.id);
  };

  // Reorder Layer (Z-Index)
  const handleReorderLayer = (layerId: string, direction: 'up' | 'down') => {
    const index = project.layers.findIndex((l) => l.id === layerId);
    if (index < 0) return;

    const newLayers = [...project.layers];
    if (direction === 'up' && index < newLayers.length - 1) {
      const temp = newLayers[index];
      newLayers[index] = newLayers[index + 1];
      newLayers[index + 1] = temp;
    } else if (direction === 'down' && index > 0) {
      const temp = newLayers[index];
      newLayers[index] = newLayers[index - 1];
      newLayers[index - 1] = temp;
    }

    updateProjectWithHistory({
      ...project,
      layers: newLayers,
    });
  };

  // Toggle Visibility & Lock
  const handleToggleVisibility = (layerId: string) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    });
  };

  const handleToggleLock = (layerId: string) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l)),
    });
  };

  const handleRenameLayer = (layerId: string, newName: string) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((l) => (l.id === layerId ? { ...l, name: newName } : l)),
    });
  };

  // Update Layer (Properties or Transform)
  const handleUpdateLayer = (layerId: string, partial: any) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((layer) => {
        if (layer.id !== layerId) return layer;

        // If updating transforms and layer has a keyframe at or near current time, update that keyframe!
        const updatedLayer = { ...layer, ...partial } as Layer;
        const threshold = 0.04;
        const currentKfIndex = (updatedLayer.keyframes || []).findIndex(
          (k) => Math.abs(k.time - currentTime) < threshold
        );

        if (currentKfIndex >= 0) {
          const updatedKeyframes = [...updatedLayer.keyframes];
          const kf = updatedKeyframes[currentKfIndex];
          const newValues = { ...kf.values };

          if (partial.x !== undefined) newValues.x = partial.x;
          if (partial.y !== undefined) newValues.y = partial.y;
          if (partial.scaleX !== undefined) newValues.scaleX = partial.scaleX;
          if (partial.scaleY !== undefined) newValues.scaleY = partial.scaleY;
          if (partial.rotation !== undefined) newValues.rotation = partial.rotation;
          if (partial.opacity !== undefined) newValues.opacity = partial.opacity;

          updatedKeyframes[currentKfIndex] = { ...kf, values: newValues };
          return { ...updatedLayer, keyframes: updatedKeyframes } as Layer;
        }

        return updatedLayer;
      }),
    });
  };

  // Keyframe Actions
  const handleAddKeyframeAtCurrentTime = (layerId: string) => {
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;

    const threshold = 0.04;
    const existingIndex = (layer.keyframes || []).findIndex(
      (k) => Math.abs(k.time - currentTime) < threshold
    );

    let updatedKeyframes = [...(layer.keyframes || [])];

    if (existingIndex >= 0) {
      // Toggle off / remove keyframe
      updatedKeyframes.splice(existingIndex, 1);
    } else {
      // Add keyframe capturing current interpolated values at this playhead time
      const state = getLayerStateAtTime(layer, currentTime);
      const newKeyframe: LayerKeyframe = {
        id: `kf-${Date.now()}`,
        time: Math.round(currentTime * 100) / 100,
        values: {
          x: Math.round(state.x),
          y: Math.round(state.y),
          scaleX: Math.round(state.scaleX * 100) / 100,
          scaleY: Math.round(state.scaleY * 100) / 100,
          rotation: Math.round(state.rotation),
          opacity: Math.round(state.opacity * 100) / 100,
          typewriterProgress: state.typewriterProgress,
        },
        easing: 'easeInOut',
      };
      updatedKeyframes.push(newKeyframe);
      updatedKeyframes.sort((a, b) => a.time - b.time);
      setSelectedKeyframeId(newKeyframe.id);
    }

    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId ? { ...l, keyframes: updatedKeyframes } : l
      ),
    });
  };

  const handleDeleteKeyframe = (layerId: string, keyframeId: string) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              keyframes: (layer.keyframes || []).filter((k) => k.id !== keyframeId),
            }
          : layer
      ),
    });
    if (selectedKeyframeId === keyframeId) setSelectedKeyframeId(null);
  };

  const handleUpdateKeyframeTime = (layerId: string, keyframeId: string, newTime: number) => {
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        const updated = (layer.keyframes || []).map((k) =>
          k.id === keyframeId ? { ...k, time: Math.max(0, Math.min(prev.duration, newTime)) } : k
        );
        updated.sort((a, b) => a.time - b.time);
        return { ...layer, keyframes: updated };
      }),
    }));
  };

  const handleUpdateKeyframeEasing = (layerId: string, keyframeId: string, easing: EasingType) => {
    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        return {
          ...layer,
          keyframes: (layer.keyframes || []).map((k) =>
            k.id === keyframeId ? { ...k, easing } : k
          ),
        };
      }),
    });
  };

  // Apply Animation Preset
  const handleApplyPreset = (presetId: any) => {
    if (!selectedLayerId) return;
    const layer = project.layers.find((l) => l.id === selectedLayerId);
    if (!layer) return;

    const modifiedLayer = applyPresetToLayer(layer, presetId, {
      startTime: currentTime,
      canvasWidth: project.canvasWidth,
      canvasHeight: project.canvasHeight,
    });

    updateProjectWithHistory({
      ...project,
      layers: project.layers.map((l) => (l.id === selectedLayerId ? modifiedLayer : l)),
    });

    setSaveToast(`Applied "${presetId}" preset!`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Change Aspect Ratio
  const handleChangeAspectRatio = (ratio: AspectRatioType) => {
    const preset = CANVAS_PRESETS[ratio];
    const oldW = project.canvasWidth;
    const oldH = project.canvasHeight;
    const newW = preset.width;
    const newH = preset.height;

    // Scale layer coordinates adaptively
    const scaleRatioX = newW / oldW;
    const scaleRatioY = newH / oldH;

    const adaptedLayers = project.layers.map((l) => ({
      ...l,
      x: Math.round(l.x * scaleRatioX),
      y: Math.round(l.y * scaleRatioY),
      keyframes: (l.keyframes || []).map((k) => ({
        ...k,
        values: {
          ...k.values,
          x: k.values.x !== undefined ? Math.round(k.values.x * scaleRatioX) : undefined,
          y: k.values.y !== undefined ? Math.round(k.values.y * scaleRatioY) : undefined,
        },
      })),
    }));

    updateProjectWithHistory({
      ...project,
      aspectRatio: ratio,
      canvasWidth: newW,
      canvasHeight: newH,
      layers: adaptedLayers,
    });
  };

  // Load Template
  const handleSelectTemplate = (template: TemplateDefinition) => {
    const loaded: Project = {
      ...template.project,
      id: `project-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateProjectWithHistory(loaded);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedLayerId(null);
    setIsTemplatesOpen(false);
  };

  // Create Blank Project
  const handleNewProject = () => {
    const blank: Project = {
      id: `project-${Date.now()}`,
      name: 'Untitled Motion Project',
      duration: 5,
      fps: 30,
      aspectRatio: '9:16',
      canvasWidth: 1080,
      canvasHeight: 1920,
      backgroundColor: '#090a0f',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        {
          id: `layer-${Date.now()}`,
          name: 'Welcome Text',
          type: 'text',
          visible: true,
          locked: false,
          inPoint: 0,
          outPoint: 5,
          x: 540,
          y: 960,
          width: 700,
          height: 120,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          text: 'START CREATING',
          fontFamily: 'Cabinet Grotesk',
          fontSize: 84,
          fontWeight: 900,
          textAlign: 'center',
          fillColor: '#ffffff',
          letterSpacing: 3,
          lineHeight: 1.1,
          typewriterProgress: 1,
          keyframes: [
            { id: 'k1', time: 0, values: { scaleX: 0.5, scaleY: 0.5, opacity: 0 }, easing: 'bounce' },
            { id: 'k2', time: 0.9, values: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'bounce' },
          ],
        },
      ],
    };
    updateProjectWithHistory(blank);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedLayerId(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* 1. Top Navigation Bar */}
      <HeaderBar
        project={project}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onUpdateProjectName={(name) => updateProjectWithHistory({ ...project, name })}
        onChangeAspectRatio={handleChangeAspectRatio}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSaveProject={handleManualSave}
        onExportJSON={() => {}}
        onImportJSON={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const parsed = parseProjectJSON(e.target?.result as string);
            if (parsed) {
              updateProjectWithHistory(parsed);
              setSaveToast(`Imported "${parsed.name}"!`);
              setTimeout(() => setSaveToast(null), 2500);
            }
          };
          reader.readAsText(file);
        }}
        onResetTime={() => setCurrentTime(0)}
        showSafeZone={showSafeZone}
        onToggleSafeZone={() => setShowSafeZone((s) => !s)}
      />

      {/* 2. Middle Editor Workspace: Layers (Left) | Canvas Stage (Center) | Properties (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Layers & Elements List */}
        <LayersPanel
          layers={project.layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onReorderLayer={handleReorderLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onRenameLayer={handleRenameLayer}
        />

        {/* Center: Stage Canvas Viewport */}
        <CanvasStage
          project={project}
          currentTime={currentTime}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayerTransform={(layerId, transform) => handleUpdateLayer(layerId, transform)}
          showSafeZone={showSafeZone}
        />

        {/* Right: Inspector Properties & Styling */}
        <PropertiesPanel
          project={project}
          currentTime={currentTime}
          selectedLayerId={selectedLayerId}
          selectedKeyframeId={selectedKeyframeId}
          onUpdateLayer={handleUpdateLayer}
          onUpdateProjectBg={(backgroundColor) =>
            updateProjectWithHistory({ ...project, backgroundColor })
          }
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onApplyPreset={handleApplyPreset}
          onUpdateKeyframeEasing={handleUpdateKeyframeEasing}
          onAddKeyframe={handleAddKeyframeAtCurrentTime}
        />
      </div>

      {/* 3. Bottom Multi-Track Keyframe Timeline */}
      <Timeline
        project={project}
        currentTime={currentTime}
        isPlaying={isPlaying}
        isLooping={isLooping}
        selectedLayerId={selectedLayerId}
        selectedKeyframeId={selectedKeyframeId}
        onSeek={(time) => {
          setCurrentTime(time);
          if (isPlaying) setIsPlaying(false);
        }}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onToggleLoop={() => setIsLooping((l) => !l)}
        onSelectLayer={setSelectedLayerId}
        onSelectKeyframe={setSelectedKeyframeId}
        onToggleLayerVisibility={handleToggleVisibility}
        onToggleLayerLock={handleToggleLock}
        onAddKeyframeAtCurrentTime={handleAddKeyframeAtCurrentTime}
        onDeleteKeyframe={handleDeleteKeyframe}
        onUpdateKeyframeTime={handleUpdateKeyframeTime}
        onChangeDuration={(duration) => updateProjectWithHistory({ ...project, duration })}
      />

      {/* Floating Save / Action Toast */}
      {saveToast && (
        <div className="fixed bottom-72 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg border border-purple-400/40 animate-bounce">
          {saveToast}
        </div>
      )}

      {/* Modals */}
      <TemplateGalleryModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        currentTime={currentTime}
      />

      <ProjectManagerModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentProject={project}
        onLoadProject={(p) => {
          updateProjectWithHistory(p);
          setCurrentTime(0);
          setIsPlaying(false);
        }}
        onNewProject={handleNewProject}
      />
    </div>
  );
}
