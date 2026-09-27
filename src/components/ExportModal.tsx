import React, { useState } from 'react';
import { X, Film, Image as ImageIcon, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Project } from '../types/editor';
import {
  ExportProgress,
  exportAsGIF,
  exportAsWebM,
  exportCurrentFramePNG,
} from '../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentTime: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentTime,
}) => {
  const [exportFormat, setExportFormat] = useState<'webm' | 'gif' | 'png'>('webm');
  const [fps, setFps] = useState<number>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(null);
    setError(null);
    setIsDone(false);

    try {
      if (exportFormat === 'png') {
        exportCurrentFramePNG(project, currentTime);
        setIsDone(true);
        setIsExporting(false);
      } else if (exportFormat === 'gif') {
        await exportAsGIF(project, { fps: Math.min(fps, 20) }, (p) => {
          setProgress(p);
        });
        setIsDone(true);
        setIsExporting(false);
      } else if (exportFormat === 'webm') {
        await exportAsWebM(project, { fps }, (p) => {
          setProgress(p);
        });
        setIsDone(true);
        setIsExporting(false);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err?.message || 'Export failed. Please check browser permissions.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Export Animation</h2>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Format Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
              Select Output Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* WebM Video */}
              <button
                disabled={isExporting}
                onClick={() => setExportFormat('webm')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  exportFormat === 'webm'
                    ? 'bg-purple-950/50 border-purple-500 text-white shadow-sm'
                    : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Film className="w-5 h-5 text-purple-400 mb-2" />
                <div>
                  <span className="font-semibold text-xs block">WebM Video</span>
                  <span className="text-[10px] text-zinc-400">Crisp 1080p video</span>
                </div>
              </button>

              {/* Animated GIF */}
              <button
                disabled={isExporting}
                onClick={() => setExportFormat('gif')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  exportFormat === 'gif'
                    ? 'bg-purple-950/50 border-purple-500 text-white shadow-sm'
                    : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center mb-2">
                  GIF
                </div>
                <div>
                  <span className="font-semibold text-xs block">Animated GIF</span>
                  <span className="text-[10px] text-zinc-400">Looping graphic</span>
                </div>
              </button>

              {/* Current Frame PNG */}
              <button
                disabled={isExporting}
                onClick={() => setExportFormat('png')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  exportFormat === 'png'
                    ? 'bg-purple-950/50 border-purple-500 text-white shadow-sm'
                    : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-blue-400 mb-2" />
                <div>
                  <span className="font-semibold text-xs block">PNG Frame</span>
                  <span className="text-[10px] text-zinc-400">Still frame @ {currentTime.toFixed(1)}s</span>
                </div>
              </button>
            </div>
          </div>

          {/* Export Options */}
          {exportFormat !== 'png' && (
            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target Resolution</span>
                <span className="font-mono text-zinc-200">
                  {project.canvasWidth} × {project.canvasHeight} px ({project.aspectRatio})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Animation Duration</span>
                <span className="font-mono text-zinc-200">{project.duration.toFixed(1)} seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Frame Rate (FPS)</span>
                <select
                  disabled={isExporting}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                >
                  {exportFormat === 'webm' ? (
                    <>
                      <option value={24}>24 FPS (Cinematic)</option>
                      <option value={30}>30 FPS (Standard)</option>
                      <option value={60}>60 FPS (Ultra Smooth)</option>
                    </>
                  ) : (
                    <>
                      <option value={12}>12 FPS (Lightweight)</option>
                      <option value={15}>15 FPS (Recommended for GIF)</option>
                      <option value={20}>20 FPS (Smooth GIF)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Progress / Status Bar */}
          {isExporting && progress && (
            <div className="space-y-2 p-3 bg-zinc-950/80 rounded-lg border border-purple-500/40">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-purple-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progress.status}
                </span>
                <span className="font-mono text-zinc-300">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-100"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {isDone && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Export complete! Your download should start automatically.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-950/40">
          <button
            disabled={isExporting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isDone ? 'Close' : 'Cancel'}
          </button>
          <button
            disabled={isExporting}
            onClick={handleStartExport}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {exportFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
