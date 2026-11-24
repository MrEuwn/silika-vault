import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SILICON_MODULES } from '../data/modules.js';

const MAX_METRICS = {
  topsFp8: Math.max(...SILICON_MODULES.map((m) => m.topsFp8)),
  hbmBandwidthTBs: Math.max(...SILICON_MODULES.map((m) => m.hbmBandwidthTBs)),
  tdpWatts: Math.max(...SILICON_MODULES.map((m) => m.tdpWatts)),
  topsPerWatt: Math.max(...SILICON_MODULES.map((m) => m.topsPerWatt)),
  interconnectGbs: Math.max(...SILICON_MODULES.map((m) => m.interconnectGbs)),
};

function buildThermalChartGeometry(primaryCurve, compareCurve) {
  const w = 360;
  const h = 136;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const allTemps = [
    ...primaryCurve.map((p) => p.temp),
    ...(compareCurve ? compareCurve.map((p) => p.temp) : []),
  ];
  const minRaw = Math.min(...allTemps);
  const maxRaw = Math.max(...allTemps);
  const span = Math.max(1, maxRaw - minRaw);
  const minVal = minRaw - span * 0.14;
  const maxVal = maxRaw + span * 0.14;

  const mapCurve = (curve) =>
    curve.map((p, i) => {
      const x = padL + (i / (curve.length - 1)) * innerW;
      const normY = (p.temp - minVal) / (maxVal - minVal);
      const y = padT + innerH - normY * innerH;
      return { x, y, loadPct: p.loadPct, temp: p.temp };
    });

  const points = mapCurve(primaryCurve);
  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const baselineY = padT + innerH;
  const areaPath = `M ${first.x.toFixed(1)} ${baselineY} L ${points
    .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' L ')} L ${last.x.toFixed(1)} ${baselineY} Z`;

  let compareLinePoints = null;
  if (compareCurve) {
    compareLinePoints = mapCurve(compareCurve)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  }

  return {
    points,
    linePoints,
    compareLinePoints,
    areaPath,
    minRaw,
    maxRaw,
    padL,
    padR,
    padT,
    baselineY,
    w,
    h,
  };
}

function formatDelta(baseVal, cmpVal, lowerIsBetter = false) {
  if (!cmpVal) return { text: '0.0%', tone: 'neutral' };
  const pct = ((baseVal - cmpVal) / cmpVal) * 100;
  const sign = pct > 0 ? '+' : '';
  const favorable = lowerIsBetter ? pct < 0 : pct > 0;
  const tone = Math.abs(pct) < 0.1 ? 'neutral' : favorable ? 'positive' : 'negative';
  return { text: `${sign}${pct.toFixed(1)}%`, tone };
}

export function SpecDrawer({
  moduleData,
  viewMode,
  exploded,
  onToggleExploded,
  onStepModule,
  onClose,
}) {
  const closeBtnRef = useRef(null);
  const [compareId, setCompareId] = useState('');

  // Auto-select sensible peer from same or next family when opening for immediate data-dense utility
  useEffect(() => {
    if (!moduleData) return;
    if (compareId === moduleData.id) {
      setCompareId('');
    }
  }, [moduleData, compareId]);

  useEffect(() => {
    if (!moduleData) return undefined;
    const prevFocus = document.activeElement;
    const timer = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener('keydown', onKeyDown);
      if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
        prevFocus.focus();
      }
    };
  }, [moduleData, onClose]);

  const compareModule = useMemo(() => {
    if (!compareId || !moduleData || compareId === moduleData.id) return null;
    return SILICON_MODULES.find((m) => m.id === compareId) || null;
  }, [compareId, moduleData]);

  if (!moduleData) return null;

  const sameTempUnit = compareModule && compareModule.tempUnit === moduleData.tempUnit;
  const chart = buildThermalChartGeometry(
    moduleData.thermalCurve,
    sameTempUnit ? compareModule.thermalCurve : null
  );
  const unitLabel = moduleData.tempUnit === 'K' ? 'K' : '°C';
  const formatTemp = (v) => (moduleData.tempUnit === 'K' ? v.toFixed(1) : Math.round(v).toString());

  const metricRows = [
    {
      label: 'FP8 COMPUTE',
      valueText: `${moduleData.topsFp8.toLocaleString()} TOPS`,
      val: moduleData.topsFp8,
      cmpVal: compareModule ? compareModule.topsFp8 : null,
      max: MAX_METRICS.topsFp8,
      lowerIsBetter: false,
    },
    {
      label: 'HBM BANDWIDTH',
      valueText: `${moduleData.hbmBandwidthTBs.toFixed(1)} TB/s`,
      val: moduleData.hbmBandwidthTBs,
      cmpVal: compareModule ? compareModule.hbmBandwidthTBs : null,
      max: MAX_METRICS.hbmBandwidthTBs,
      lowerIsBetter: false,
    },
    {
      label: 'THERMAL TDP',
      valueText: `${moduleData.tdpWatts} W`,
      val: moduleData.tdpWatts,
      cmpVal: compareModule ? compareModule.tdpWatts : null,
      max: MAX_METRICS.tdpWatts,
      lowerIsBetter: true,
    },
    {
      label: 'EFFICIENCY',
      valueText: `${moduleData.topsPerWatt.toFixed(2)} TOPS/W`,
      val: moduleData.topsPerWatt,
      cmpVal: compareModule ? compareModule.topsPerWatt : null,
      max: MAX_METRICS.topsPerWatt,
      lowerIsBetter: false,
    },
    {
      label: 'INTERCONNECT',
      valueText: `${moduleData.interconnectGbs.toLocaleString()} GB/s`,
      val: moduleData.interconnectGbs,
      cmpVal: compareModule ? compareModule.interconnectGbs : null,
      max: MAX_METRICS.interconnectGbs,
      lowerIsBetter: false,
    },
  ];

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-module-title"
      data-testid="spec-drawer"
      className="spec-drawer"
    >
      <div className="drawer-topbar">
        <span className="drawer-kicker">
          {moduleData.id} · {moduleData.familyLabel} · {moduleData.year}
        </span>
        <button
          type="button"
          ref={closeBtnRef}
          className="drawer-close-btn"
          data-testid="drawer-close"
          aria-label="Close telemetry inspector"
          onClick={onClose}
        >
          × ESC
        </button>
      </div>

      <h2 id="drawer-module-title" className="drawer-title">
        {moduleData.name}
      </h2>
      <p className="drawer-summary">{moduleData.summary}</p>

      <div className="drawer-controls">
        {viewMode === '3d' && (
          <button
            type="button"
            className={exploded ? 'drawer-cutaway-btn is-active' : 'drawer-cutaway-btn'}
            data-testid="cutaway-toggle"
            aria-pressed={exploded}
            onClick={onToggleExploded}
          >
            {exploded ? 'Cutaway: Exploded' : 'Cutaway: Assembled'}
          </button>
        )}
        <div className="drawer-step-group">
          <button
            type="button"
            className="drawer-step-btn"
            data-testid="drawer-prev"
            onClick={() => onStepModule(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="drawer-step-btn"
            data-testid="drawer-next"
            onClick={() => onStepModule(1)}
          >
            Next
          </button>
        </div>
      </div>

      <figure className="drawer-plate-figure">
        <img
          src={moduleData.plateAsset}
          alt={`${moduleData.id} ${moduleData.name} silicon microphotography plate`}
          width={512}
          height={320}
          className="drawer-plate-img"
        />
        <figcaption className="drawer-plate-caption">
          Optical Plate · {moduleData.processNode} · {moduleData.dieAreaMm2.toLocaleString()} mm2
        </figcaption>
      </figure>

      {/* Interactive Module Comparison Selector */}
      <div className="drawer-compare-bar">
        <label htmlFor="silika-compare-select" className="compare-label">
          COMPARE BENCHMARK
        </label>
        <select
          id="silika-compare-select"
          data-testid="compare-select"
          className="compare-select"
          value={compareId}
          onChange={(e) => setCompareId(e.target.value)}
        >
          <option value="">Baseline (No Comparison)</option>
          {SILICON_MODULES.filter((m) => m.id !== moduleData.id).map((m) => (
            <option key={m.id} value={m.id}>
              vs {m.id} · {m.name} ({m.processNode})
            </option>
          ))}
        </select>
      </div>

      {/* Data-Dense Specification Table with Inline Proportional + Delta Bars */}
      <div className="spec-table" role="region" aria-label="Silicon benchmark specifications">
        <div className="spec-meta-strip">
          <div>
            <span className="spec-meta-k">PROCESS NODE</span>
            <strong className="spec-meta-v">{moduleData.processNode}</strong>
          </div>
          <div>
            <span className="spec-meta-k">INT8 PEAK</span>
            <strong className="spec-meta-v">{moduleData.topsInt8.toLocaleString()} T</strong>
          </div>
          <div>
            <span className="spec-meta-k">DIE AREA</span>
            <strong className="spec-meta-v">{moduleData.dieAreaMm2.toLocaleString()} mm2</strong>
          </div>
        </div>

        {metricRows.map((row) => {
          const pct = Math.max(4, Math.min(100, (row.val / row.max) * 100));
          const cmpPct =
            row.cmpVal !== null ? Math.max(4, Math.min(100, (row.cmpVal / row.max) * 100)) : null;
          const delta =
            row.cmpVal !== null ? formatDelta(row.val, row.cmpVal, row.lowerIsBetter) : null;

          return (
            <div key={row.label} className="spec-row">
              <div className="spec-row-head">
                <span className="spec-row-label">{row.label}</span>
                <div className="spec-row-vals">
                  <strong className="spec-row-value">{row.valueText}</strong>
                  {delta && (
                    <span className={`spec-delta spec-delta--${delta.tone}`}>{delta.text}</span>
                  )}
                </div>
              </div>
              <div className="spec-bar-track" aria-hidden="true">
                <div className="spec-bar-fill" style={{ width: `${pct.toFixed(1)}%` }} />
                {cmpPct !== null && (
                  <div
                    className="spec-bar-compare"
                    style={{ width: `${cmpPct.toFixed(1)}%` }}
                    title={`Compare ${compareModule.id}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real SVG Thermal Load Curve (with Optional Overlay Curve) */}
      <div className="thermal-chart-block">
        <div className="thermal-chart-head">
          <span>THERMAL LOAD CURVE (10% TO 100%)</span>
          <span>
            {formatTemp(chart.minRaw)}
            {unitLabel} .. {formatTemp(chart.maxRaw)}
            {unitLabel}
          </span>
        </div>

        <svg
          data-chart="thermal-curve"
          viewBox={`0 0 ${chart.w} ${chart.h}`}
          className="thermal-chart-svg"
          role="img"
          aria-label={`${moduleData.id} thermal curve from ${formatTemp(chart.minRaw)}${unitLabel} at 10% load to ${formatTemp(chart.maxRaw)}${unitLabel} at 100% load`}
        >
          <defs>
            <linearGradient id="silikaThermalArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <line
            x1={chart.padL}
            y1={chart.padT}
            x2={chart.w - chart.padR}
            y2={chart.padT}
            stroke="rgba(139,158,184,0.20)"
            strokeDasharray="3 3"
          />
          <line
            x1={chart.padL}
            y1={chart.baselineY}
            x2={chart.w - chart.padR}
            y2={chart.baselineY}
            stroke="rgba(139,158,184,0.34)"
          />

          <path d={chart.areaPath} fill="url(#silikaThermalArea)" />

          {chart.compareLinePoints && (
            <polyline
              fill="none"
              stroke="rgba(232, 238, 247, 0.55)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              points={chart.compareLinePoints}
            />
          )}

          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            points={chart.linePoints}
          />

          {chart.points.map((pt) => (
            <circle
              key={pt.loadPct}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="#06090F"
              stroke="#7DD3FC"
              strokeWidth="1.5"
            />
          ))}

          <text x="4" y={chart.padT + 4} fill="#8B9EB8" fontSize="10" fontFamily="JetBrains Mono">
            {formatTemp(chart.maxRaw)}
            {unitLabel}
          </text>
          <text x="4" y={chart.baselineY} fill="#8B9EB8" fontSize="10" fontFamily="JetBrains Mono">
            {formatTemp(chart.minRaw)}
            {unitLabel}
          </text>
          <text x={chart.padL} y={chart.h - 6} fill="#8B9EB8" fontSize="10" fontFamily="JetBrains Mono">
            10%
          </text>
          <text
            x={chart.padL + (chart.w - chart.padL - chart.padR) * 0.5 - 10}
            y={chart.h - 6}
            fill="#8B9EB8"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            55%
          </text>
          <text
            x={chart.w - chart.padR - 26}
            y={chart.h - 6}
            fill="#8B9EB8"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            100%
          </text>
        </svg>

        {compareModule && (
          <div className="thermal-legend">
            <span className="legend-dot legend-dot--primary">{moduleData.id}</span>
            <span className="legend-dot legend-dot--compare">
              {compareModule.id}
              {!sameTempUnit ? ' (unit mismatch)' : ''}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
