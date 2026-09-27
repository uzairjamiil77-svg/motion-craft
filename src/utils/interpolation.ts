import { ComputedLayerState, EasingType, Layer, LayerKeyframe } from '../types/editor';

// Easing functions mapping [0, 1] -> [0, 1]
export function evaluateEasing(t: number, easing: EasingType): number {
  const clampT = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'linear':
      return clampT;

    case 'easeIn':
      return clampT * clampT * clampT;

    case 'easeOut':
      return 1 - Math.pow(1 - clampT, 3);

    case 'easeInOut':
      return clampT < 0.5
        ? 4 * clampT * clampT * clampT
        : 1 - Math.pow(-2 * clampT + 2, 3) / 2;

    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = clampT;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        x -= 1.5 / d1;
        return n1 * x * x + 0.75;
      } else if (x < 2.5 / d1) {
        x -= 2.25 / d1;
        return n1 * x * x + 0.9375;
      } else {
        x -= 2.625 / d1;
        return n1 * x * x + 0.984375;
      }
    }

    case 'elastic': {
      const c4 = (2 * Math.PI) / 3;
      return clampT === 0
        ? 0
        : clampT === 1
        ? 1
        : -Math.pow(2, 10 * clampT - 10) * Math.sin((clampT * 10 - 10.75) * c4);
    }

    default:
      return clampT;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Compute the interpolated state of a layer at given time `t` (in seconds)
export function getLayerStateAtTime(layer: Layer, currentTime: number): ComputedLayerState {
  const isWithinInAndOut = currentTime >= layer.inPoint && currentTime <= layer.outPoint;
  const isVisible = layer.visible && isWithinInAndOut;

  // Defaults from the base layer
  let x = layer.x;
  let y = layer.y;
  let scaleX = layer.scaleX ?? 1;
  let scaleY = layer.scaleY ?? 1;
  let rotation = layer.rotation ?? 0;
  let opacity = layer.opacity ?? 1;
  let typewriterProgress = layer.type === 'text' ? (layer.typewriterProgress ?? 1) : 1;

  // If there are keyframes, interpolate between them
  const keyframes = [...(layer.keyframes || [])].sort((a, b) => a.time - b.time);

  if (keyframes.length > 0) {
    if (keyframes.length === 1) {
      const k = keyframes[0];
      if (k.values.x !== undefined) x = k.values.x;
      if (k.values.y !== undefined) y = k.values.y;
      if (k.values.scaleX !== undefined) scaleX = k.values.scaleX;
      if (k.values.scaleY !== undefined) scaleY = k.values.scaleY;
      if (k.values.rotation !== undefined) rotation = k.values.rotation;
      if (k.values.opacity !== undefined) opacity = k.values.opacity;
      if (k.values.typewriterProgress !== undefined) typewriterProgress = k.values.typewriterProgress;
    } else {
      // Find segment: currentTime between kBefore and kAfter
      if (currentTime <= keyframes[0].time) {
        const k0 = keyframes[0];
        if (k0.values.x !== undefined) x = k0.values.x;
        if (k0.values.y !== undefined) y = k0.values.y;
        if (k0.values.scaleX !== undefined) scaleX = k0.values.scaleX;
        if (k0.values.scaleY !== undefined) scaleY = k0.values.scaleY;
        if (k0.values.rotation !== undefined) rotation = k0.values.rotation;
        if (k0.values.opacity !== undefined) opacity = k0.values.opacity;
        if (k0.values.typewriterProgress !== undefined) typewriterProgress = k0.values.typewriterProgress;
      } else if (currentTime >= keyframes[keyframes.length - 1].time) {
        const kLast = keyframes[keyframes.length - 1];
        if (kLast.values.x !== undefined) x = kLast.values.x;
        if (kLast.values.y !== undefined) y = kLast.values.y;
        if (kLast.values.scaleX !== undefined) scaleX = kLast.values.scaleX;
        if (kLast.values.scaleY !== undefined) scaleY = kLast.values.scaleY;
        if (kLast.values.rotation !== undefined) rotation = kLast.values.rotation;
        if (kLast.values.opacity !== undefined) opacity = kLast.values.opacity;
        if (kLast.values.typewriterProgress !== undefined) typewriterProgress = kLast.values.typewriterProgress;
      } else {
        // Between two keyframes
        let k1: LayerKeyframe = keyframes[0];
        let k2: LayerKeyframe = keyframes[1];

        for (let i = 0; i < keyframes.length - 1; i++) {
          if (currentTime >= keyframes[i].time && currentTime <= keyframes[i + 1].time) {
            k1 = keyframes[i];
            k2 = keyframes[i + 1];
            break;
          }
        }

        const span = k2.time - k1.time;
        const rawFactor = span > 0 ? (currentTime - k1.time) / span : 0;
        const easedFactor = evaluateEasing(rawFactor, k2.easing || 'easeInOut');

        // Interpolate individual properties
        const startX = k1.values.x ?? layer.x;
        const endX = k2.values.x ?? startX;
        x = lerp(startX, endX, easedFactor);

        const startY = k1.values.y ?? layer.y;
        const endY = k2.values.y ?? startY;
        y = lerp(startY, endY, easedFactor);

        const startScaleX = k1.values.scaleX ?? layer.scaleX ?? 1;
        const endScaleX = k2.values.scaleX ?? startScaleX;
        scaleX = lerp(startScaleX, endScaleX, easedFactor);

        const startScaleY = k1.values.scaleY ?? layer.scaleY ?? 1;
        const endScaleY = k2.values.scaleY ?? startScaleY;
        scaleY = lerp(startScaleY, endScaleY, easedFactor);

        const startRot = k1.values.rotation ?? layer.rotation ?? 0;
        const endRot = k2.values.rotation ?? startRot;
        rotation = lerp(startRot, endRot, easedFactor);

        const startOpacity = k1.values.opacity ?? layer.opacity ?? 1;
        const endOpacity = k2.values.opacity ?? startOpacity;
        opacity = lerp(startOpacity, endOpacity, easedFactor);

        const startTyping = k1.values.typewriterProgress ?? (layer.type === 'text' ? (layer.typewriterProgress ?? 1) : 1);
        const endTyping = k2.values.typewriterProgress ?? startTyping;
        typewriterProgress = lerp(startTyping, endTyping, easedFactor);
      }
    }
  }

  return {
    layer,
    isVisible,
    x,
    y,
    width: layer.width,
    height: layer.height,
    scaleX,
    scaleY,
    rotation,
    opacity: Math.max(0, Math.min(1, opacity)),
    typewriterProgress: Math.max(0, Math.min(1, typewriterProgress)),
  };
}
