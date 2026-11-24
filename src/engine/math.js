import * as THREE from 'three';

const _projVec = new THREE.Vector3();

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function damp(cur, target, lambda, dt) {
  if (dt <= 0) return cur;
  return cur + (target - cur) * (1 - Math.exp(-lambda * Math.min(dt, 0.05)));
}

export function getStageDpr() {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

export function getTrackerDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

export function projectBoxToScreen(box3, camera, width, height) {
  const min = box3.min;
  const max = box3.max;
  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [min.x, max.y, min.z],
    [max.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [min.x, max.y, max.z],
    [max.x, max.y, max.z],
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let avgDepth = 0;

  for (let i = 0; i < 8; i += 1) {
    const c = corners[i];
    _projVec.set(c[0], c[1], c[2]).project(camera);
    if (_projVec.z > 1 || _projVec.z < -1) return null;
    const sx = (_projVec.x * 0.5 + 0.5) * width;
    const sy = (-_projVec.y * 0.5 + 0.5) * height;
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (sx > maxX) maxX = sx;
    if (sy > maxY) maxY = sy;
    avgDepth += _projVec.z;
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(28, maxX - minX),
    h: Math.max(28, maxY - minY),
    cx: (minX + maxX) * 0.5,
    cy: (minY + maxY) * 0.5,
    ndcZ: avgDepth / 8,
  };
}
