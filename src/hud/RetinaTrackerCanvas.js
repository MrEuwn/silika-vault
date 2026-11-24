import { clamp, getTrackerDpr } from '../engine/math.js';

// Staggered overlapping fractured mosaic constellation (keeps top-left clear for leader title!)
const MOSAIC_LAYOUT = [
  // Core high-resolution real photographic windows
  { type: 'photo', x: 0.08, y: 0.08, w: 0.27, h: 0.40, sx: 0.06, sy: 0.08, sw: 0.34, sh: 0.48, label: true },
  { type: 'photo', x: 0.28, y: 0.22, w: 0.24, h: 0.36, sx: 0.28, sy: 0.26, sw: 0.30, sh: 0.40, cross: true },
  { type: 'photo', x: 0.46, y: 0.14, w: 0.25, h: 0.38, sx: 0.48, sy: 0.16, sw: 0.30, sh: 0.44, label: true },
  { type: 'photo', x: 0.62, y: 0.42, w: 0.29, h: 0.38, sx: 0.60, sy: 0.42, sw: 0.36, sh: 0.46, cross: true },
  { type: 'photo', x: 0.16, y: 0.48, w: 0.22, h: 0.28, sx: 0.16, sy: 0.52, sw: 0.28, sh: 0.34 },
  { type: 'photo', x: 0.36, y: 0.48, w: 0.23, h: 0.30, sx: 0.36, sy: 0.48, sw: 0.28, sh: 0.36, label: true },
  { type: 'photo', x: 0.72, y: 0.16, w: 0.18, h: 0.26, sx: 0.72, sy: 0.18, sw: 0.22, sh: 0.30 },
  { type: 'photo', x: 0.50, y: 0.64, w: 0.20, h: 0.22, sx: 0.52, sy: 0.64, sw: 0.24, sh: 0.28 },

  // Quantized color-block chroma tiles sampled dynamically from real photograph pixels
  { type: 'chroma', x: -0.02, y: 0.18, w: 0.09, h: 0.14, swatchIdx: 0, pins: true },
  { type: 'chroma', x: 0.18, y: 0.34, w: 0.17, h: 0.22, swatchIdx: 1, outline: true },
  { type: 'chroma', x: 0.48, y: 0.24, w: 0.19, h: 0.26, swatchIdx: 2, outline: true },
  { type: 'chroma', x: 0.28, y: 0.68, w: 0.11, h: 0.14, swatchIdx: 3, cross: true },
  { type: 'chroma', x: 0.88, y: 0.84, w: 0.10, h: 0.14, swatchIdx: 4, pins: true },

  // Precision computer-vision hatched matrix micro-cells (////, x, +)
  { type: 'hatch', x: 0.71, y: 0.34, w: 0.11, h: 0.16, pattern: 'slash' },
  { type: 'hatch', x: 0.03, y: 0.74, w: 0.12, h: 0.15, pattern: 'matrix' },
  { type: 'hatch', x: 0.57, y: 0.78, w: 0.11, h: 0.13, pattern: 'cross' },
];

export class RetinaTrackerCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = getTrackerDpr();
    this.smoothX = this.width * 0.5;
    this.smoothY = this.height * 0.5;
    this.paletteCache = new WeakMap();
    this.lastLockedId = null;
    this.lockStamp = 0;
    this.resize(this.width, this.height);
  }

  resize(width, height) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = getTrackerDpr();
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  extractImageSwatches(img, fallbackHex) {
    if (!img) return [fallbackHex, '#F43F5E', '#E8EEF7', '#38BDF8', '#F59E0B'];
    const cached = this.paletteCache.get(img);
    if (cached) return cached;

    try {
      const sample = document.createElement('canvas');
      sample.width = 16;
      sample.height = 10;
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(img, 0, 0, 16, 10);
      const data = sctx.getImageData(0, 0, 16, 10).data;

      const candidates = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const score = sat * 1.85 + (luma > 55 && luma < 235 ? 0.55 : 0);
        candidates.push({ r, g, b, score });
      }
      candidates.sort((a, b) => b.score - a.score);

      const picked = [];
      for (let i = 0; i < candidates.length && picked.length < 4; i += 1) {
        const c = candidates[i];
        const distinct = picked.every(
          (p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 75
        );
        if (distinct) picked.push(c);
      }

      const hexList = picked.map((c) => `rgb(${c.r}, ${c.g}, ${c.b})`);
      while (hexList.length < 4) hexList.push(fallbackHex || '#38BDF8');
      hexList.splice(1, 0, 'rgba(235, 241, 250, 0.92)');
      this.paletteCache.set(img, hexList);
      return hexList;
    } catch {
      return [fallbackHex || '#F43F5E', 'rgba(235, 241, 250, 0.92)', '#38BDF8', '#F59E0B', '#34D399'];
    }
  }

  drawHatchCell(ctx, rx, ry, rw, rh, pattern) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 9, 15, 0.84)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    ctx.beginPath();
    ctx.rect(rx + 2, ry + 2, rw - 4, rh - 4);
    ctx.clip();

    ctx.fillStyle = 'rgba(240, 246, 255, 0.90)';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    const stepX = 8;
    const stepY = 10;

    for (let y = ry + 10; y < ry + rh + 2; y += stepY) {
      const rowIdx = Math.floor((y - ry) / stepY);
      for (let x = rx + 4; x < rx + rw - 3; x += stepX) {
        const colIdx = Math.floor((x - rx) / stepX);
        let ch = '/';
        if (pattern === 'matrix') {
          ch = (rowIdx + colIdx) % 3 === 0 ? '×' : (rowIdx + colIdx) % 3 === 1 ? '□' : '/';
        } else if (pattern === 'cross') {
          ch = (rowIdx + colIdx) % 2 === 0 ? '+' : '·';
        }
        ctx.fillText(ch, x, y);
      }
    }
    ctx.restore();
  }

  drawCenterCross(ctx, cx, cy, size = 3.5, color = 'rgba(255, 255, 255, 0.92)') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy + size);
    ctx.moveTo(cx + size, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.stroke();
  }

  drawCornerPins(ctx, rx, ry, rw, rh) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
    ctx.fillRect(rx + rw - 1.5, ry - 1.5, 3, 3);
    ctx.fillRect(rx - 1.5, ry + rh - 1.5, 3, 3);
    ctx.fillRect(rx + rw - 1.5, ry + rh - 1.5, 3, 3);
  }

  render({
    now,
    pointer,
    isCoarse,
    reducedMotion,
    lockedModule,
    isInspecting,
    projection,
    plateImage,
  }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    const timeSec = now * 0.001;

    // 1. Minimal Optical Crosshair Reticle Cursor
    if (!isCoarse && pointer && pointer.active) {
      this.smoothX += (pointer.x - this.smoothX) * (reducedMotion ? 1 : 0.34);
      this.smoothY += (pointer.y - this.smoothY) * (reducedMotion ? 1 : 0.34);
      const px = Math.round(this.smoothX) + 0.5;
      const py = Math.round(this.smoothY) + 0.5;

      ctx.strokeStyle = lockedModule ? 'rgba(56, 189, 248, 0.92)' : 'rgba(240, 246, 255, 0.82)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      const rIn = 6.5;
      const rOut = 11.5;
      ctx.beginPath();
      for (let a = 0; a < 4; a += 1) {
        const ang = Math.PI * 0.25 + a * Math.PI * 0.5;
        ctx.moveTo(px + Math.cos(ang) * rIn, py + Math.sin(ang) * rIn);
        ctx.lineTo(px + Math.cos(ang) * rOut, py + Math.sin(ang) * rOut);
      }
      ctx.stroke();

      ctx.fillStyle = lockedModule ? '#38BDF8' : '#FFFFFF';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    if (!lockedModule || !projection) {
      this.lastLockedId = null;
      return;
    }

    if (this.lastLockedId !== lockedModule.id) {
      this.lastLockedId = lockedModule.id;
      this.lockStamp = now;
    }
    const rawProgress = reducedMotion ? 1 : clamp((now - this.lockStamp) / 320, 0, 1);
    const lockEase = 1 - Math.pow(2, -10 * rawProgress);

    const isMobile = this.width < 768;

    const boxW = clamp(projection.w, isMobile ? 210 : 350, this.width * (isInspecting ? 0.42 : 0.54));
    const boxH = clamp(projection.h, isMobile ? 130 : 210, this.height * 0.48);
    const minTop = isInspecting ? 96 : 112;
    const cx = clamp(projection.cx, boxW * 0.5 + 32, this.width - boxW * 0.5 - 32);
    const cy = clamp(projection.cy, boxH * 0.5 + minTop, this.height - boxH * 0.5 - 88);
    const bx = Math.round(cx - boxW * 0.5) + 0.5;
    const by = Math.round(cy - boxH * 0.5) + 0.5;

    // 2. Sweeping Tilted Dashed Orbital Ellipses + Glowing Satellite Dots
    const orbitConfigs = [
      { scaleX: 0.76, scaleY: 0.36, tilt: -0.32, speed: 0.24, accent: true },
      { scaleX: 0.88, scaleY: 0.42, tilt: 0.24, speed: -0.17, accent: false },
      { scaleX: 0.62, scaleY: 0.94, tilt: 0.66, speed: 0.13, accent: false },
      { scaleX: 0.98, scaleY: 0.30, tilt: -0.07, speed: -0.11, accent: false },
    ];

    for (let o = 0; o < orbitConfigs.length; o += 1) {
      const cfg = orbitConfigs[o];
      const rx = Math.max(95, boxW * cfg.scaleX) * (0.85 + 0.15 * lockEase);
      const ry = Math.max(60, boxH * cfg.scaleY) * (0.85 + 0.15 * lockEase);
      const tilt = cfg.tilt + (reducedMotion ? 0 : Math.sin(timeSec * 0.25 + o) * 0.05);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.setLineDash(o % 2 === 0 ? [2, 4] : [4, 5]);
      ctx.strokeStyle = cfg.accent
        ? `rgba(56, 189, 248, ${(0.56 * lockEase).toFixed(3)})`
        : `rgba(232, 238, 247, ${(0.36 * lockEase).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      const theta = (reducedMotion ? 0.9 : timeSec * cfg.speed * 1.9) + o * 1.75;
      const sx = Math.cos(theta) * rx;
      const sy = Math.sin(theta) * ry;
      ctx.setLineDash([]);
      ctx.fillStyle = cfg.accent ? '#38BDF8' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Razor-Sharp 1px Bounding Frame + Cyan Corner L-Brackets
    ctx.strokeStyle = `rgba(232, 238, 247, ${(0.58 * lockEase).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    const tick = 10;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by + tick);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + tick, by);
    ctx.moveTo(bx + boxW - tick, by);
    ctx.lineTo(bx + boxW, by);
    ctx.lineTo(bx + boxW, by + tick);
    ctx.moveTo(bx, by + boxH - tick);
    ctx.lineTo(bx, by + boxH);
    ctx.lineTo(bx + tick, by + boxH);
    ctx.moveTo(bx + boxW - tick, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH - tick);
    ctx.stroke();

    // Live edge telemetry pixel coordinates
    ctx.save();
    ctx.shadowColor = 'rgba(4, 6, 10, 0.96)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(240, 246, 255, 0.90)';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    const rightLabelX = clamp(bx + boxW + 8, 16, this.width - 102);
    ctx.fillText(`x: ${Math.round(bx + boxW)}  y: ${Math.round(cy)}`, rightLabelX, cy + 4);
    ctx.fillText(`w: ${Math.round(boxW)}  h: ${Math.round(boxH)}`, bx + 10, by + boxH + 14);
    ctx.fillStyle = '#38BDF8';
    ctx.fillText(
      `d: ${Math.round(Math.abs(projection.ndcZ * 100))}  t: ${lockedModule.thermalCurve[4].temp}${lockedModule.tempUnit === 'K' ? 'K' : '°C'}`,
      bx + boxW - 110,
      by + boxH + 14
    );
    ctx.restore();

    // During exploded cutaway inspection, let the Spec Drawer own the headline and keep 3D layers 100% clear!
    if (isInspecting) return;

    // Architectural borderless top-left metadata callout + vertical leader line
    const titleX = clamp(bx + 12, 24, this.width - 320);
    const titleY = clamp(by - 24, 96, this.height - 140);

    ctx.strokeStyle = 'rgba(232, 238, 247, 0.62)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, titleY - 12);
    ctx.lineTo(titleX - 6, titleY - 12);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = 'rgba(4, 6, 10, 0.98)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13.5px "Archivo", sans-serif';
    ctx.fillText(`${lockedModule.id}: ${lockedModule.name.toUpperCase()}`, titleX, titleY - 10);

    ctx.fillStyle = '#D4E0EE';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `${lockedModule.processNode.toUpperCase()}  ·  ${lockedModule.topsFp8.toLocaleString()} TOPS  ·  ${lockedModule.tdpWatts}W  ↗`,
      titleX,
      titleY + 5
    );
    ctx.restore();

    // 4. Explosive Fractured Full-Color Photographic Chroma Mosaic Burst!
    const imgReady = plateImage && plateImage.complete && plateImage.naturalWidth > 0;
    const swatches = this.extractImageSwatches(
      imgReady ? plateImage : null,
      lockedModule.chromaSignature.primary
    );

    const modHash = lockedModule.id.charCodeAt(lockedModule.id.length - 1) * 1.73;

    for (let t = 0; t < MOSAIC_LAYOUT.length; t += 1) {
      const tile = MOSAIC_LAYOUT[t];
      const jx = reducedMotion ? 0 : Math.sin(timeSec * 1.6 + t * 1.9 + modHash) * 2.0;
      const jy = reducedMotion ? 0 : Math.cos(timeSec * 1.4 + t * 1.3 + modHash) * 1.6;

      const flip = lockedModule.year % 2 === 0;
      const normX = flip ? 1 - tile.x - tile.w : tile.x;

      const rx = Math.round(bx + normX * boxW + jx);
      const ry = Math.round(by + tile.y * boxH + jy);
      const rw = Math.max(24, Math.round(tile.w * boxW * (0.72 + 0.28 * lockEase)));
      const rh = Math.max(18, Math.round(tile.h * boxH * (0.72 + 0.28 * lockEase)));

      if (tile.type === 'photo' && imgReady) {
        const iw = plateImage.naturalWidth;
        const ih = plateImage.naturalHeight;
        ctx.drawImage(
          plateImage,
          Math.floor(tile.sx * iw),
          Math.floor(tile.sy * ih),
          Math.max(40, Math.floor(tile.sw * iw)),
          Math.max(40, Math.floor(tile.sh * ih)),
          rx,
          ry,
          rw,
          rh
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

        if (tile.cross) {
          this.drawCenterCross(ctx, rx + rw * 0.5, ry + rh * 0.5, 3.5);
        }
        if (tile.label) {
          ctx.save();
          ctx.shadowColor = 'rgba(4, 6, 10, 0.96)';
          ctx.shadowBlur = 5;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '500 9.5px "JetBrains Mono", monospace';
          ctx.fillText(`x: ${rx} y: ${ry}`, rx + 4, ry + rh - 5);
          ctx.restore();
        }
      } else if (tile.type === 'chroma') {
        const fillCol = swatches[tile.swatchIdx % swatches.length];
        ctx.fillStyle = fillCol;
        ctx.fillRect(rx, ry, rw, rh);

        if (imgReady && tile.outline && rw > 50) {
          const inset = 6;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            plateImage,
            Math.floor(((t * 0.19) % 0.6) * plateImage.naturalWidth),
            Math.floor(((t * 0.27) % 0.5) * plateImage.naturalHeight),
            24,
            16,
            rx + inset,
            ry + inset,
            rw - inset * 2,
            rh - inset * 2
          );
          ctx.restore();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

        if (tile.pins) this.drawCornerPins(ctx, rx, ry, rw, rh);
        if (tile.cross) this.drawCenterCross(ctx, rx + rw * 0.5, ry + rh * 0.5, 3.5);
      } else if (tile.type === 'hatch') {
        this.drawHatchCell(ctx, rx, ry, rw, rh, tile.pattern);
      }
    }
  }
}
