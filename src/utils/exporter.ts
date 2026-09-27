import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { Project } from '../types/editor';
import { renderProjectFrame } from './canvasRenderer';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// 1. Export Current Frame as High-Resolution PNG
export function exportCurrentFramePNG(project: Project, currentTime: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = project.canvasWidth;
  canvas.height = project.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderProjectFrame(ctx, project, currentTime);

  canvas.toBlob((blob) => {
    if (blob) {
      const cleanName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const timeStr = currentTime.toFixed(2).replace('.', '_');
      downloadBlob(blob, `${cleanName}_frame_${timeStr}s.png`);
    }
  }, 'image/png');
}

// 2. Export as Animated GIF
export async function exportAsGIF(
  project: Project,
  options: { fps?: number; scale?: number } = {},
  onProgress?: ProgressCallback
): Promise<void> {
  const fps = options.fps || 15;
  const scale = options.scale || (project.canvasWidth > 1080 ? 0.35 : 0.45); // Optimizes memory & file size
  const exportWidth = Math.round(project.canvasWidth * scale);
  const exportHeight = Math.round(project.canvasHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create canvas context');

  const totalFrames = Math.max(1, Math.round(project.duration * fps));
  const gif = GIFEncoder();
  const frameDelay = Math.round(1000 / fps);

  for (let f = 0; f < totalFrames; f++) {
    const time = f / fps;

    // Render onto scaled canvas
    ctx.save();
    ctx.scale(scale, scale);
    renderProjectFrame(ctx, project, time);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, exportWidth, exportHeight);
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);

    gif.writeFrame(index, exportWidth, exportHeight, {
      palette,
      delay: frameDelay,
      repeat: 0,
    });

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        status: `Encoding GIF frame ${f + 1} of ${totalFrames}...`,
      });
    }

    // Yield to browser UI thread periodically
    if (f % 3 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes as any], { type: 'image/gif' });
  const cleanName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  downloadBlob(blob, `${cleanName}_animation.gif`);
}

// 3. Export as WebM Video (Smooth 30/60fps full resolution)
export async function exportAsWebM(
  project: Project,
  options: { fps?: number; bitrate?: number } = {},
  onProgress?: ProgressCallback
): Promise<void> {
  const fps = options.fps || project.fps || 30;
  const canvas = document.createElement('canvas');
  canvas.width = project.canvasWidth;
  canvas.height = project.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Check supported mime types
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.bitrate || 6_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (err) => reject(err);
  });

  recorder.start();

  const totalFrames = Math.max(1, Math.round(project.duration * fps));
  const frameIntervalMs = 1000 / fps;

  for (let f = 0; f < totalFrames; f++) {
    const time = f / fps;
    renderProjectFrame(ctx, project, time);

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        status: `Rendering frame ${f + 1} of ${totalFrames}...`,
      });
    }

    // Wait 1 frame tick so captureStream processes smoothly
    await new Promise((resolve) => setTimeout(resolve, frameIntervalMs));
  }

  // Allow extra 200ms for final frame flush
  await new Promise((r) => setTimeout(r, 200));
  recorder.stop();

  const finalBlob = await recordingPromise;
  const cleanName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  downloadBlob(finalBlob, `${cleanName}_video.webm`);
}
