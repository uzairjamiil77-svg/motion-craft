import { AnimationPreset, AnimationPresetId, Layer, LayerKeyframe } from '../types/editor';

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    description: 'Smoothly fades in from 0% to 100% opacity',
    category: 'in',
    defaultDuration: 0.6,
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    description: 'Fades out to 0% opacity near the end',
    category: 'out',
    defaultDuration: 0.6,
  },
  {
    id: 'slide-in-left',
    name: 'Slide In Left',
    description: 'Slides smoothly from outside the left edge',
    category: 'in',
    defaultDuration: 0.7,
  },
  {
    id: 'slide-in-right',
    name: 'Slide In Right',
    description: 'Slides smoothly from outside the right edge',
    category: 'in',
    defaultDuration: 0.7,
  },
  {
    id: 'slide-in-bottom',
    name: 'Slide In Bottom',
    description: 'Slides up smoothly from below the stage',
    category: 'in',
    defaultDuration: 0.7,
  },
  {
    id: 'slide-in-top',
    name: 'Slide In Top',
    description: 'Slides down smoothly from above the stage',
    category: 'in',
    defaultDuration: 0.7,
  },
  {
    id: 'bounce-in',
    name: 'Pop & Bounce',
    description: 'Bouncy pop-in entrance with spring overshoot',
    category: 'in',
    defaultDuration: 0.8,
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Scales up smoothly from tiny center to full size',
    category: 'in',
    defaultDuration: 0.65,
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    description: 'Shrinks down from full size towards zero',
    category: 'out',
    defaultDuration: 0.6,
  },
  {
    id: 'spin-in',
    name: 'Spin In',
    description: 'Rotates 360° and expands while entering',
    category: 'in',
    defaultDuration: 0.8,
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    description: 'Reveals letters character-by-character',
    category: 'text',
    defaultDuration: 1.5,
    appliesToTextOnly: true,
  },
  {
    id: 'pulse',
    name: 'Pulse / Heartbeat',
    description: 'Rhythmic scale expansion and contraction',
    category: 'emphasis',
    defaultDuration: 1.0,
  },
];

export function applyPresetToLayer(
  layer: Layer,
  presetId: AnimationPresetId,
  options: {
    startTime?: number;
    duration?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  } = {}
): Layer {
  const startTime = options.startTime ?? 0;
  const preset = ANIMATION_PRESETS.find((p) => p.id === presetId);
  const duration = options.duration ?? preset?.defaultDuration ?? 0.8;
  const canvasWidth = options.canvasWidth ?? 1080;
  const canvasHeight = options.canvasHeight ?? 1920;

  const targetX = layer.x;
  const targetY = layer.y;
  const targetScaleX = layer.scaleX ?? 1;
  const targetScaleY = layer.scaleY ?? 1;
  const targetRotation = layer.rotation ?? 0;
  const targetOpacity = layer.opacity ?? 1;

  let newKeyframes: LayerKeyframe[] = [];

  switch (presetId) {
    case 'fade-in':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'fade-out':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: Math.max(0, startTime),
          values: { opacity: targetOpacity },
          easing: 'easeIn',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { opacity: 0 },
          easing: 'easeIn',
        },
      ];
      break;

    case 'slide-in-left':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { x: -layer.width, opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { x: targetX, opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'slide-in-right':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { x: canvasWidth + layer.width / 2, opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { x: targetX, opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'slide-in-bottom':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { y: canvasHeight + layer.height / 2, opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { y: targetY, opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'slide-in-top':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { y: -layer.height, opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { y: targetY, opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'bounce-in':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { scaleX: 0, scaleY: 0, opacity: 0 },
          easing: 'bounce',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { scaleX: targetScaleX, scaleY: targetScaleY, opacity: targetOpacity },
          easing: 'bounce',
        },
      ];
      break;

    case 'zoom-in':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { scaleX: 0.1, scaleY: 0.1, opacity: 0 },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { scaleX: targetScaleX, scaleY: targetScaleY, opacity: targetOpacity },
          easing: 'easeOut',
        },
      ];
      break;

    case 'zoom-out':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { scaleX: targetScaleX, scaleY: targetScaleY, opacity: targetOpacity },
          easing: 'easeIn',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { scaleX: 0.05, scaleY: 0.05, opacity: 0 },
          easing: 'easeIn',
        },
      ];
      break;

    case 'spin-in':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: {
            rotation: targetRotation - 180,
            scaleX: 0.3,
            scaleY: 0.3,
            opacity: 0,
          },
          easing: 'easeOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: {
            rotation: targetRotation,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            opacity: targetOpacity,
          },
          easing: 'easeOut',
        },
      ];
      break;

    case 'typewriter':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { typewriterProgress: 0, opacity: targetOpacity },
          easing: 'linear',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration,
          values: { typewriterProgress: 1, opacity: targetOpacity },
          easing: 'linear',
        },
      ];
      break;

    case 'pulse':
      newKeyframes = [
        {
          id: `kf-${Date.now()}-1`,
          time: startTime,
          values: { scaleX: targetScaleX, scaleY: targetScaleY },
          easing: 'easeInOut',
        },
        {
          id: `kf-${Date.now()}-2`,
          time: startTime + duration * 0.5,
          values: { scaleX: targetScaleX * 1.25, scaleY: targetScaleY * 1.25 },
          easing: 'easeInOut',
        },
        {
          id: `kf-${Date.now()}-3`,
          time: startTime + duration,
          values: { scaleX: targetScaleX, scaleY: targetScaleY },
          easing: 'easeInOut',
        },
      ];
      break;

    default:
      return layer;
  }

  // Merge keyframes: remove any existing keyframes that closely overlap, or replace all if user applies an entrance preset
  const existingKeyframes = (layer.keyframes || []).filter(
    (k) => k.time < startTime || k.time > startTime + duration
  );

  return {
    ...layer,
    keyframes: [...existingKeyframes, ...newKeyframes].sort((a, b) => a.time - b.time),
  };
}
