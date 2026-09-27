export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export interface CanvasDimensions {
  width: number;
  height: number;
  label: string;
  aspectRatio: AspectRatioType;
}

export const CANVAS_PRESETS: Record<AspectRatioType, CanvasDimensions> = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Reel / Story', aspectRatio: '9:16' },
  '16:9': { width: 1920, height: 1080, label: '16:9 Landscape / Video', aspectRatio: '16:9' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square / Post', aspectRatio: '1:1' },
  '4:5': { width: 1080, height: 1350, label: '4:5 Portrait / Feed', aspectRatio: '4:5' },
};

export type LayerType = 'text' | 'shape' | 'image';
export type ShapeType = 'rectangle' | 'rounded-rect' | 'circle' | 'triangle' | 'star' | 'line';

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic';

export type AnimatableProperty =
  | 'x'
  | 'y'
  | 'scaleX'
  | 'scaleY'
  | 'rotation'
  | 'opacity'
  | 'typewriterProgress';

export interface AnimatableValues {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  typewriterProgress?: number;
}

export interface LayerKeyframe {
  id: string;
  time: number; // in seconds
  values: Partial<AnimatableValues>;
  easing: EasingType;
}

export interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  inPoint: number;  // in seconds
  outPoint: number; // in seconds
  
  // Transform base properties
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // in degrees
  opacity: number;  // 0 to 1

  keyframes: LayerKeyframe[];
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing: number;
  lineHeight: number;
  shadowColor?: string;
  shadowBlur?: number;
  typewriterProgress?: number; // 0 to 1
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shapeType: ShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius?: number; // for rectangle/rounded-rect
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  objectFit: 'contain' | 'cover' | 'fill';
  borderRadius?: number;
}

export type Layer = TextLayer | ShapeLayer | ImageLayer;

export interface Project {
  id: string;
  name: string;
  duration: number; // duration in seconds (e.g. 5)
  fps: number;      // default 30
  aspectRatio: AspectRatioType;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
}

export interface ComputedLayerState {
  layer: Layer;
  isVisible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  typewriterProgress: number;
}

export type AnimationPresetId =
  | 'fade-in'
  | 'fade-out'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-top'
  | 'slide-in-bottom'
  | 'bounce-in'
  | 'zoom-in'
  | 'zoom-out'
  | 'spin-in'
  | 'typewriter'
  | 'pulse';

export interface AnimationPreset {
  id: AnimationPresetId;
  name: string;
  description: string;
  category: 'in' | 'out' | 'emphasis' | 'text';
  defaultDuration: number;
  appliesToTextOnly?: boolean;
}
