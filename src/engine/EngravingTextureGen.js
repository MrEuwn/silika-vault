import * as THREE from 'three';

let cachedPlatterMaps = null;

/**
 * Generates shared high-resolution radial brushed-metal textures for internal
 * concentric silicon wafer / turbine platters so darkroom studio softboxes
 * catch crisp anisotropic circular highlights against deep obsidian graphite.
 */
export function getPlatterSurfaceMaps() {
  if (cachedPlatterMaps) return cachedPlatterMaps;

  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  const cx = size * 0.5;
  const cy = size * 0.5;

  // Deep obsidian graphite silicon platter base
  cCtx.fillStyle = '#0D1016';
  cCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#6A6A6A';
  rCtx.fillRect(0, 0, size, size);

  // Concentric fine lathe / lithography rings
  for (let r = 36; r < size * 0.49; r += 2.4) {
    const wave = Math.sin(r * 0.55) * 0.5 + 0.5;
    const band = Math.floor(r / 26) % 2 === 0;
    const luma = Math.round((band ? 18 : 30) + wave * 24);
    cCtx.strokeStyle = `rgb(${luma}, ${luma + 2}, ${luma + 4})`;
    cCtx.lineWidth = 1.4;
    cCtx.beginPath();
    cCtx.arc(cx, cy, r, 0, Math.PI * 2);
    cCtx.stroke();

    const rLuma = Math.round(42 + (1 - wave) * 105);
    rCtx.strokeStyle = `rgb(${rLuma}, ${rLuma}, ${rLuma})`;
    rCtx.lineWidth = 1.3;
    rCtx.beginPath();
    rCtx.arc(cx, cy, r, 0, Math.PI * 2);
    rCtx.stroke();
  }

  // Subtle anisotropic radial sheen
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    const sheen = Math.pow(Math.abs(Math.cos(rad * 2)), 5);
    if (sheen > 0.2) {
      cCtx.strokeStyle = `rgba(220,230,245,${(sheen * 0.14).toFixed(3)})`;
      cCtx.lineWidth = 2;
      cCtx.beginPath();
      cCtx.moveTo(cx + Math.cos(rad) * 48, cy + Math.sin(rad) * 48);
      cCtx.lineTo(cx + Math.cos(rad) * 240, cy + Math.sin(rad) * 240);
      cCtx.stroke();
    }
  }

  // Machined crisp silver index rings
  const chromeRings = [78, 146, 206, 240];
  chromeRings.forEach((rad, i) => {
    cCtx.strokeStyle = i === 0 ? 'rgba(215, 224, 236, 0.92)' : 'rgba(130, 142, 160, 0.45)';
    cCtx.lineWidth = i === 0 ? 4 : 1.6;
    cCtx.beginPath();
    cCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    cCtx.stroke();

    rCtx.strokeStyle = '#1E1E1E';
    rCtx.lineWidth = 3;
    rCtx.beginPath();
    rCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    rCtx.stroke();
  });

  // Hub center matte black well
  cCtx.fillStyle = '#05070A';
  cCtx.beginPath();
  cCtx.arc(cx, cy, 44, 0, Math.PI * 2);
  cCtx.fill();

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = 4;

  cachedPlatterMaps = { map, roughnessMap };
  return cachedPlatterMaps;
}

function drawBarcode(ctx, x, y, w, h, seed, color) {
  ctx.fillStyle = color;
  let cx = x;
  let s = seed * 9301 + 49297;
  while (cx < x + w) {
    s = (s * 16807) % 2147483647;
    const barW = 2 + (s % 5);
    const gap = 2 + ((s >> 3) % 4);
    if (cx + barW <= x + w) {
      ctx.fillRect(cx, y, barW, h);
    }
    cx += barW + gap;
  }
}

function drawCrosshair(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
}

function punchDualPlatterApertures(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const leftX = w * 0.305;
  const rightX = w * 0.695;
  const centerY = h * 0.52;
  const rad = h * 0.165;

  ctx.beginPath();
  ctx.arc(leftX, centerY, rad, 0, Math.PI * 2);
  ctx.arc(rightX, centerY, rad, 0, Math.PI * 2);
  ctx.fill();

  const slotW = w * 0.21;
  const slotH = h * 0.15;
  ctx.fillRect(w * 0.5 - slotW * 0.5, centerY - slotH * 0.5, slotW, slotH);
  ctx.restore();
}

/**
 * Generates high-contrast monochrome industrial hardware label textures (1024x640)
 * calibrated to studio darkroom paper luminance (#C8D0DC max) so printed labels stay
 * razor-sharp without triggering HDR bloom washout.
 */
export function createModuleEngravingTexture(mod, index = 0) {
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Deliberate hero frame variety:
  // idx 0 = Clear Smoked Acrylic (hero bottom-center), idx 1 = Diagonal Zebra (mid-right),
  // idx 2 = Obsidian Stealth (upper-left edge), idx 3 = Obsidian Stealth (bottom-left),
  // idx 4 = Chrome Speed-Bars (mid-left), idx 19 = Architectural Ivory Card (top-center)
  const styleOrder = [4, 0, 1, 1, 3, 2, 0, 4, 1, 3, 2, 0, 4, 1, 3, 2, 0, 4, 3, 2];
  const style = styleOrder[index % styleOrder.length];

  const pad = 58;
  const labelTop = 50;
  const labelH = h - 154;

  if (style === 0) {
    // STYLE 0: DIAGONAL ZEBRA INDUSTRIAL (Silver/Charcoal stripes + crisp black industrial stamps)
    ctx.fillStyle = '#090C11';
    ctx.fillRect(pad, labelTop, w - pad * 2, labelH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad + 6, labelTop + 6, w - pad * 2 - 12, labelH - 12);
    ctx.clip();

    ctx.fillStyle = '#C4CCD8';
    ctx.fillRect(pad, labelTop, w - pad * 2, labelH);

    // Bold diagonal industrial zebra stripes
    ctx.strokeStyle = '#9EA8B8';
    ctx.lineWidth = 15;
    for (let x = -h; x < w + h; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, labelTop);
      ctx.lineTo(x + labelH, labelTop + labelH);
      ctx.stroke();
    }

    // Crisp black header & footer bands
    ctx.fillStyle = '#07090D';
    ctx.fillRect(pad, labelTop, w - pad * 2, 82);
    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 44px "Archivo", sans-serif';
    ctx.fillText('SILIKA', pad + 26, labelTop + 55);

    ctx.font = '700 25px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${mod.id} // ${mod.processNode.toUpperCase()}`, w - pad - 26, labelTop + 51);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#07090D';
    ctx.fillRect(pad, labelTop + labelH - 74, w - pad * 2, 74);
    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 32px "Archivo", sans-serif';
    ctx.fillText(mod.name.toUpperCase(), pad + 26, labelTop + labelH - 24);

    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${mod.topsFp8} TOPS  ·  ${mod.tdpWatts}W`, w - pad - 26, labelTop + labelH - 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#080B10';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(`SERIES // ${mod.familyLabel.toUpperCase()}`, pad + 26, labelTop + 122);
    drawBarcode(ctx, w - pad - 226, labelTop + 98, 194, 30, index + 11, '#080B10');
    ctx.restore();

    punchDualPlatterApertures(ctx, w, h);

    ctx.strokeStyle = '#080B10';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w * 0.305, h * 0.52, h * 0.165, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.695, h * 0.52, h * 0.165, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 1) {
    // STYLE 1: OBSIDIAN STEALTH STENCIL (Deep matte pitch black + crisp silver-white industrial print)
    ctx.fillStyle = '#07090E';
    ctx.fillRect(pad, labelTop, w - pad * 2, labelH);

    ctx.strokeStyle = 'rgba(216, 224, 236, 0.52)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(pad + 12, labelTop + 12, w - pad * 2 - 24, labelH - 24);

    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 58px "Archivo", sans-serif';
    ctx.fillText('SILIKA', pad + 34, labelTop + 78);

    ctx.fillStyle = '#B8C4D6';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`${mod.id}  ${mod.name.toUpperCase()}`, pad + 34, labelTop + 116);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 42px "Archivo", sans-serif';
    ctx.fillText(`${mod.topsFp8}T`, w - pad - 34, labelTop + 72);
    ctx.fillStyle = '#9AA8BC';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(`${mod.processNode.toUpperCase()} / ${mod.tdpWatts}W`, w - pad - 34, labelTop + 106);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(216, 224, 236, 0.42)';
    ctx.lineWidth = 2;
    for (let tx = pad + 34; tx < w - pad - 34; tx += 16) {
      const tall = (tx - pad) % 80 === 0;
      ctx.beginPath();
      ctx.moveTo(tx, labelTop + labelH - 26);
      ctx.lineTo(tx, labelTop + labelH - (tall ? 54 : 38));
      ctx.stroke();
    }

    ctx.fillStyle = '#C8D2E0';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`HBM ${mod.hbmBandwidthTBs.toFixed(1)} TB/S  //  IO ${mod.interconnectGbs} GB/S`, pad + 34, labelTop + labelH - 64);

    punchDualPlatterApertures(ctx, w, h);

    ctx.strokeStyle = 'rgba(220, 228, 240, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.305, h * 0.52, h * 0.168, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.695, h * 0.52, h * 0.168, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 2) {
    // STYLE 2: MATTE ARCHITECTURAL PAPER CARD (High-contrast silver-ivory card, zero blow-out!)
    ctx.fillStyle = '#C8D0DC';
    ctx.fillRect(pad, labelTop, w - pad * 2, labelH);

    ctx.strokeStyle = 'rgba(10, 14, 22, 0.25)';
    ctx.lineWidth = 2;
    for (let ly = labelTop + 96; ly < labelTop + 168; ly += 24) {
      ctx.beginPath();
      ctx.moveTo(pad + 34, ly);
      ctx.lineTo(w - pad - 34, ly);
      ctx.stroke();
    }

    ctx.strokeStyle = '#080B10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pad + 64, labelTop + 56, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#080B10';
    ctx.font = '800 28px "Archivo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String.fromCharCode(65 + (index % 4)), pad + 64, labelTop + 66);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#07090E';
    ctx.font = '800 44px "Archivo", sans-serif';
    ctx.fillText(`${mod.id}  ${mod.name.toUpperCase()}`, pad + 108, labelTop + 70);

    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(`SILIKA ARCHIVE // ${mod.familyLabel.toUpperCase()} // ${mod.year}`, pad + 34, labelTop + 114);
    ctx.fillText(`NODE ${mod.processNode.toUpperCase()}  ·  ${mod.topsFp8} TOPS  ·  ${mod.hbmBandwidthTBs.toFixed(1)} TB/S`, pad + 34, labelTop + 138);

    ctx.fillStyle = '#080B10';
    ctx.fillRect(pad, labelTop + labelH - 64, w - pad * 2, 64);
    ctx.fillStyle = '#D4DCE8';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`SILIKA LABS // ${mod.chassisArchetype.toUpperCase()}`, pad + 34, labelTop + labelH - 22);
    drawBarcode(ctx, w - pad - 240, labelTop + labelH - 50, 206, 36, index + 47, '#D4DCE8');

    punchDualPlatterApertures(ctx, w, h);
  } else if (style === 3) {
    // STYLE 3: CHROME SPEED-BARS METALLIC (Like Sony METAL-SR)
    ctx.fillStyle = '#080B10';
    ctx.fillRect(pad, labelTop, w - pad * 2, labelH);

    for (let s = 0; s < 5; s += 1) {
      ctx.fillStyle = s % 2 === 0 ? '#C8D2E0' : '#8A96A8';
      ctx.fillRect(w * 0.56 + s * 28, labelTop, 16, labelH);
    }

    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 50px "Archivo", sans-serif';
    ctx.fillText(mod.id, pad + 32, labelTop + 74);

    ctx.font = '700 28px "Archivo", sans-serif';
    ctx.fillText(mod.name.toUpperCase(), pad + 32, labelTop + 116);

    ctx.fillStyle = '#A8B6C8';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(`${mod.processNode.toUpperCase()} // ${mod.tdpWatts}W`, pad + 32, labelTop + labelH - 64);
    ctx.fillText('SILIKA PRECISION SILICON', pad + 32, labelTop + labelH - 32);

    ctx.save();
    ctx.translate(w - pad - 34, labelTop + 40);
    ctx.rotate(Math.PI * 0.5);
    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 32px "Archivo", sans-serif';
    ctx.fillText(`${mod.topsFp8} TOPS`, 0, 0);
    ctx.restore();

    drawCrosshair(ctx, pad + 56, labelTop + labelH - 110, 18, '#DCE4F0');
    punchDualPlatterApertures(ctx, w, h);
  } else {
    // STYLE 4: SMOKED TRANSPARENT SCREEN-PRINTED SHELL (Shows dual circular dark silicon platters!)
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(210, 220, 234, 0.48)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + 12, labelTop + 12, w - pad * 2 - 24, labelH - 24);

    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 62px "Archivo", sans-serif';
    ctx.fillText('SILIKA', pad + 34, labelTop + 82);

    ctx.font = '700 25px "JetBrains Mono", monospace';
    ctx.fillStyle = '#C4D0E0';
    ctx.fillText(`${mod.id} // ${mod.name.toUpperCase()}`, pad + 36, labelTop + 120);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#DCE4F0';
    ctx.font = '800 40px "Archivo", sans-serif';
    ctx.fillText(mod.processNode.toUpperCase(), w - pad - 34, labelTop + 76);
    ctx.fillStyle = '#B4C2D4';
    ctx.font = '600 21px "JetBrains Mono", monospace';
    ctx.fillText(`${mod.topsFp8} TOPS · ${mod.tdpWatts}W`, w - pad - 34, labelTop + 114);
    ctx.textAlign = 'left';

    // Center precision calibration tick rule
    ctx.strokeStyle = 'rgba(220, 228, 240, 0.72)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 16; i += 1) {
      const tx = w * 0.39 + i * 14;
      const th = i % 4 === 0 ? 18 : 9;
      ctx.beginPath();
      ctx.moveTo(tx, h * 0.52 - th * 0.5);
      ctx.lineTo(tx, h * 0.52 + th * 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = '#C8D4E4';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(`HBM ${mod.hbmBandwidthTBs.toFixed(1)} TB/S`, pad + 34, labelTop + labelH - 30);

    ctx.textAlign = 'right';
    ctx.fillText(`SERIES ${mod.year}  [${mod.familyId}]`, w - pad - 34, labelTop + labelH - 30);
    ctx.textAlign = 'left';

    drawCrosshair(ctx, w * 0.5, labelTop + 56, 15, 'rgba(220,228,240,0.72)');
  }

  // Lower chassis rail micro-print
  ctx.fillStyle = 'rgba(196, 208, 224, 0.62)';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText(`SLK-${String(index + 1).padStart(2, '0')}  PRECISION COMPUTE CARTRIDGE`, pad + 16, h - 30);
  ctx.textAlign = 'right';
  ctx.fillText(`DIE ${mod.dieAreaMm2}MM2  //  ${mod.topsPerWatt.toFixed(2)} T/W`, w - pad - 16, h - 30);
  ctx.textAlign = 'left';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return { texture, isClearStyle: style === 4 };
}
