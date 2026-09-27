import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  FolderOpen,
  Save,
  RotateCcw,
  Sparkles,
  LayoutTemplate,
  Ratio,
  Maximize2,
  FileJson,
  Upload,
} from 'lucide-react';
import { AspectRatioType, CANVAS_PRESETS, Project } from '../types/editor';

interface HeaderBarProps {
  project: Project;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdateProjectName: (name: string) => void;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  onOpenTemplates: () => void;
  onOpenProjects: () => void;
  onOpenExport: () => void;
  onSaveProject: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onResetTime: () => void;
  showSafeZone: boolean;
  onToggleSafeZone: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  project,
  isPlaying,
  onTogglePlay,
  onUpdateProjectName,
  onChangeAspectRatio,
  onOpenTemplates,
  onOpenProjects,
  onOpenExport,
  onSaveProject,
  onExportJSON,
  onImportJSON,
  onResetTime,
  showSafeZone,
  onToggleSafeZone,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (projectNameInput.trim()) {
      onUpdateProjectName(projectNameInput.trim());
    } else {
      setProjectNameInput(project.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameBlur();
    if (e.key === 'Escape') {
      setIsEditingName(false);
      setProjectNameInput(project.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800/80 px-4 flex items-center justify-between text-zinc-100 shrink-0 select-none">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            Motion<span className="text-purple-400">Craft</span>
          </span>
        </div>

        {/* Project Name */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-zinc-800 border border-purple-500 rounded px-2 py-1 text-sm font-medium text-white focus:outline-none w-48"
            />
          ) : (
            <button
              onClick={() => {
                setProjectNameInput(project.name);
                setIsEditingName(true);
              }}
              title="Click to rename project"
              className="text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-800/70 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
            >
              {project.name}
            </button>
          )}

          {/* Canvas dimensions badge */}
          <span className="text-[11px] text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-750 font-mono">
            {project.canvasWidth}×{project.canvasHeight}
          </span>
        </div>
      </div>

      {/* Center Controls: Aspect Ratio & Play Preview */}
      <div className="flex items-center gap-2">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
          {(Object.keys(CANVAS_PRESETS) as AspectRatioType[]).map((ratio) => {
            const preset = CANVAS_PRESETS[ratio];
            const isSelected = project.aspectRatio === ratio;
            return (
              <button
                key={ratio}
                onClick={() => onChangeAspectRatio(ratio)}
                title={`${preset.label} (${preset.width}x${preset.height})`}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {ratio}
              </button>
            );
          })}
        </div>

        {/* Quick Play/Pause Center Button */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
          }`}
          title="Play / Pause (Space)"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onResetTime}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Rewind to start"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Safe guide toggle for 9:16 */}
        {project.aspectRatio === '9:16' && (
          <button
            onClick={onToggleSafeZone}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showSafeZone
                ? 'bg-purple-900/40 text-purple-300 border border-purple-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Toggle Social Safe Guides (Reels/Shorts overlay margins)"
          >
            Safe Zone
          </button>
        )}
      </div>

      {/* Right Actions: Templates, Save, Load, Export */}
      <div className="flex items-center gap-2">
        {/* Templates Button */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
          title="Browse Motion Graphic Templates"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Templates</span>
        </button>

        {/* Project Load / Save */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
          title="Open Saved Projects"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Projects</span>
        </button>

        <button
          onClick={onSaveProject}
          className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
          title="Save Project (Ctrl+S)"
        >
          <Save className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Hidden Import file input */}
        <label className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg border border-zinc-800 cursor-pointer transition-colors" title="Import JSON Project">
          <Upload className="w-4 h-4 text-amber-400" />
          <input
            type="file"
            accept=".json,.mcproject.json"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>

        {/* Export Main Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg shadow-sm shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
