import { Layer, Project, ShapeType } from '../types/editor';
import { getLayerStateAtTime } from './interpolation';

// Image element cache to avoid recreating images each frame
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    return img.complete ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  imageCache.set(src, img);
  return null;
}

// Draw a star shape centered at 0, 0
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// Draw a rounded rectangle centered at cx, cy
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export interface RenderOptions {
  showSafeZone?: boolean;
  clearColor?: string;
}

export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  currentTime: number,
  options: RenderOptions = {}
) {
  const { canvasWidth, canvasHeight, backgroundColor, layers } = project;

  // 1. Clear background
  ctx.fillStyle = options.clearColor || backgroundColor || '#090a0f';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Render each layer in array order (bottom to top)
  for (const layer of layers) {
    const state = getLayerStateAtTime(layer, currentTime);
    if (!state.isVisible || state.opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = state.opacity;

    // Apply transform (translate to center, rotate, scale)
    ctx.translate(state.x, state.y);
    if (state.rotation !== 0) {
      ctx.rotate((state.rotation * Math.PI) / 180);
    }
    if (state.scaleX !== 1 || state.scaleY !== 1) {
      ctx.scale(state.scaleX, state.scaleY);
    }

    const halfW = state.width / 2;
    const halfH = state.height / 2;

    switch (layer.type) {
      case 'shape': {
        const shapeType: ShapeType = layer.shapeType || 'rectangle';
        ctx.fillStyle = layer.fillColor || '#38bdf8';
        ctx.strokeStyle = layer.strokeColor || 'transparent';
        ctx.lineWidth = layer.strokeWidth || 0;

        if (shapeType === 'circle') {
          ctx.beginPath();
          const r = Math.min(state.width, state.height) / 2;
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.closePath();
          if (layer.fillColor && layer.fillColor !== 'transparent') ctx.fill();
          if (layer.strokeWidth && layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
            ctx.stroke();
          }
        } else if (shapeType === 'rectangle' || shapeType === 'rounded-rect') {
          const radius = shapeType === 'rounded-rect' ? (layer.borderRadius ?? 20) : (layer.borderRadius ?? 0);
          if (radius > 0) {
            drawRoundedRect(ctx, -halfW, -halfH, state.width, state.height, radius);
          } else {
            ctx.beginPath();
            ctx.rect(-halfW, -halfH, state.width, state.height);
            ctx.closePath();
          }
          if (layer.fillColor && layer.fillColor !== 'transparent') ctx.fill();
          if (layer.strokeWidth && layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
            ctx.stroke();
          }
        } else if (shapeType === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -halfH);
          ctx.lineTo(halfW, halfH);
          ctx.lineTo(-halfW, halfH);
          ctx.closePath();
          if (layer.fillColor && layer.fillColor !== 'transparent') ctx.fill();
          if (layer.strokeWidth && layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
            ctx.stroke();
          }
        } else if (shapeType === 'star') {
          const outerR = Math.min(state.width, state.height) / 2;
          const innerR = outerR * 0.45;
          drawStar(ctx, 0, 0, 5, outerR, innerR);
          if (layer.fillColor && layer.fillColor !== 'transparent') ctx.fill();
          if (layer.strokeWidth && layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
            ctx.stroke();
          }
        } else if (shapeType === 'line') {
          ctx.beginPath();
          ctx.moveTo(-halfW, 0);
          ctx.lineTo(halfW, 0);
          ctx.strokeStyle = layer.strokeColor || layer.fillColor || '#ffffff';
          ctx.lineWidth = Math.max(1, layer.strokeWidth || layer.height || 2);
          ctx.stroke();
        }
        break;
      }

      case 'text': {
        const fontStyle = layer.fontStyle || 'normal';
        const fontWeight = layer.fontWeight || '700';
        const fontSize = layer.fontSize || 48;
        const fontFamily = layer.fontFamily || 'Inter';

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = layer.textAlign || 'center';
        ctx.textBaseline = 'middle';

        if (layer.letterSpacing && 'letterSpacing' in ctx) {
          (ctx as unknown as { letterSpacing: string }).letterSpacing = `${layer.letterSpacing}px`;
        }

        if (layer.shadowColor && layer.shadowBlur) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
        }

        let fullText = layer.text || '';
        // Apply typewriter animation
        if (state.typewriterProgress < 1) {
          const visibleCount = Math.floor(fullText.length * state.typewriterProgress);
          fullText = fullText.slice(0, visibleCount);
        }

        const lines = fullText.split('\n');
        const lineHeight = fontSize * (layer.lineHeight || 1.2);
        const totalTextHeight = lines.length * lineHeight;
        const startY = -totalTextHeight / 2 + lineHeight / 2;

        let drawX = 0;
        if (layer.textAlign === 'left') drawX = -halfW;
        else if (layer.textAlign === 'right') drawX = halfW;

        for (let i = 0; i < lines.length; i++) {
          const lineY = startY + i * lineHeight;

          if (layer.strokeWidth && layer.strokeWidth > 0 && layer.strokeColor) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth;
            ctx.strokeText(lines[i], drawX, lineY);
          }

          ctx.fillStyle = layer.fillColor || '#ffffff';
          ctx.fillText(lines[i], drawX, lineY);
        }
        break;
      }

      case 'image': {
        const img = getCachedImage(layer.src);
        if (img) {
          if (layer.borderRadius && layer.borderRadius > 0) {
            drawRoundedRect(ctx, -halfW, -halfH, state.width, state.height, layer.borderRadius);
            ctx.clip();
          }
          ctx.drawImage(img, -halfW, -halfH, state.width, state.height);
        } else {
          // Placeholder while loading
          ctx.fillStyle = '#27272a';
          ctx.fillRect(-halfW, -halfH, state.width, state.height);
          ctx.fillStyle = '#71717a';
          ctx.font = '14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Loading Image...', 0, 0);
        }
        break;
      }
    }

    ctx.restore();
  }

  // 3. Optional Safe Zone Guides (for 9:16 vertical reels/shorts UI overlays)
  if (options.showSafeZone && project.aspectRatio === '9:16') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    // Top 20% safe zone (profile info / sound name)
    const topSafe = canvasHeight * 0.12;
    ctx.strokeRect(60, topSafe, canvasWidth - 120, canvasHeight - topSafe - canvasHeight * 0.22);
    ctx.restore();
  }
}
