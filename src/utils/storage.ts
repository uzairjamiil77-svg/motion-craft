import { Project } from '../types/editor';
import { TEMPLATES } from './templates';

const STORAGE_KEY = 'motioncraft_projects_v1';
const CURRENT_PROJECT_ID_KEY = 'motioncraft_current_project_id';

export function getAllSavedProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved projects', e);
    return [];
  }
}

export function saveProjectToStorage(project: Project): void {
  try {
    const projects = getAllSavedProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    const updated = { ...project, updatedAt: Date.now() };

    if (existingIndex >= 0) {
      projects[existingIndex] = updated;
    } else {
      projects.unshift(updated);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);
  } catch (e) {
    console.error('Failed to save project', e);
  }
}

export function deleteProjectFromStorage(id: string): void {
  try {
    const projects = getAllSavedProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to delete project', e);
  }
}

export function getInitialProject(): Project {
  // First check if there is a saved current project
  const currentId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
  const saved = getAllSavedProjects();
  if (currentId) {
    const match = saved.find((p) => p.id === currentId);
    if (match) return match;
  }
  if (saved.length > 0) {
    return saved[0];
  }

  // Otherwise, default to our Instagram Reel Intro template
  const defaultTemplate = TEMPLATES[0].project;
  const initial = {
    ...defaultTemplate,
    id: `project-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveProjectToStorage(initial);
  return initial;
}

export function downloadProjectJSON(project: Project): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.mcproject.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseProjectJSON(jsonString: string): Project | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.layers || !Array.isArray(data.layers)) {
      throw new Error('Invalid project structure: missing layers');
    }
    return {
      ...data,
      id: `project-${Date.now()}`,
      updatedAt: Date.now(),
    };
  } catch (e) {
    console.error('Error importing project', e);
    return null;
  }
}
