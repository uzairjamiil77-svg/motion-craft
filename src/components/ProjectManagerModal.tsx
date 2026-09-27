import React, { useState } from 'react';
import { X, FolderOpen, Plus, Trash2, Download, Upload, Copy, Check } from 'lucide-react';
import { Project } from '../types/editor';
import {
  deleteProjectFromStorage,
  downloadProjectJSON,
  getAllSavedProjects,
  parseProjectJSON,
  saveProjectToStorage,
} from '../utils/storage';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  onLoadProject: (project: Project) => void;
  onNewProject: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
  onNewProject,
}) => {
  const [projects, setProjects] = useState<Project[]>(() => getAllSavedProjects());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    setProjects(getAllSavedProjects());
  };

  const handleOpen = (project: Project) => {
    onLoadProject(project);
    onClose();
  };

  const handleDelete = (id: string, name: string) => {
    if (projects.length <= 1) {
      setFeedbackMsg('Cannot delete the only project.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }
    deleteProjectFromStorage(id);
    refreshList();
  };

  const handleDuplicate = (project: Project) => {
    const copy: Project = {
      ...project,
      id: `project-${Date.now()}`,
      name: `${project.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveProjectToStorage(copy);
    refreshList();
    setFeedbackMsg(`Created copy: ${copy.name}`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = parseProjectJSON(content);
        if (imported) {
          saveProjectToStorage(imported);
          refreshList();
          setFeedbackMsg(`Imported "${imported.name}" successfully!`);
          setTimeout(() => setFeedbackMsg(null), 3000);
        } else {
          setFeedbackMsg('Failed to import: invalid JSON schema.');
          setTimeout(() => setFeedbackMsg(null), 3000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Saved Projects</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: New Project, Import JSON */}
        <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Blank Project</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json,.mcproject.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={() => downloadProjectJSON(currentProject)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 transition-colors"
            title="Download current project as .json file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Current JSON</span>
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-purple-950/40 border border-purple-500/40 rounded-lg text-xs text-purple-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-purple-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Project items list */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {projects.map((proj) => {
            const isCurrent = proj.id === currentProject.id;
            return (
              <div
                key={proj.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-purple-950/30 border-purple-500/50 text-white'
                    : 'bg-zinc-850/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{proj.name}</span>
                    <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      {proj.aspectRatio}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded font-medium border border-purple-500/40">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-3">
                    <span>{proj.layers.length} layers</span>
                    <span>·</span>
                    <span>{proj.duration}s duration</span>
                    <span>·</span>
                    <span>Updated {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => downloadProjectJSON(proj)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                    title="Export JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(proj)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                    title="Duplicate Project"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {!isCurrent && (
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {!isCurrent && (
                    <button
                      onClick={() => handleOpen(proj)}
                      className="px-3 py-1.5 text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors ml-2"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
