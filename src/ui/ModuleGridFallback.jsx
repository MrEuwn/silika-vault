import React, { useMemo, useState } from 'react';
import { MODULE_FAMILIES, SILICON_MODULES } from '../data/modules.js';

export function ModuleGridFallback({ activeIndex, webglFallbackReason, onInspectModule }) {
  const [familyFilter, setFamilyFilter] = useState('ALL');

  const filteredModules = useMemo(() => {
    if (familyFilter === 'ALL') return SILICON_MODULES;
    return SILICON_MODULES.filter((m) => m.familyId === familyFilter);
  }, [familyFilter]);

  return (
    <section
      className="grid-stage"
      data-testid="grid-fallback"
      aria-label="Silicon Compute Module 2D Archive"
    >
      <div className="grid-header">
        <div>
          <p className="grid-kicker">
            2D INSTRUMENT ARCHIVE · {SILICON_MODULES.length} MODULES
            {webglFallbackReason ? ' · SAFE MODE ACTIVE' : ''}
          </p>
          <h2 className="grid-title">SILIKA // COMPUTE ARCHIVE</h2>
        </div>

        <div className="grid-filters" role="group" aria-label="Filter by silicon family">
          {MODULE_FAMILIES.map((fam) => (
            <button
              key={fam.id}
              type="button"
              className={familyFilter === fam.id ? 'grid-filter-btn is-active' : 'grid-filter-btn'}
              aria-pressed={familyFilter === fam.id}
              onClick={() => setFamilyFilter(fam.id)}
            >
              {fam.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-cards">
        {filteredModules.map((mod) => {
          const globalIndex = SILICON_MODULES.findIndex((m) => m.id === mod.id);
          const isCurrent = globalIndex === activeIndex;
          return (
            <article
              key={mod.id}
              data-testid={`grid-card-${mod.slug}`}
              className={isCurrent ? 'grid-card is-selected' : 'grid-card'}
            >
              <div className="grid-card-media">
                <img
                  src={mod.plateAsset}
                  alt={`${mod.id} ${mod.name} die thermal plate`}
                  width={512}
                  height={320}
                  decoding="async"
                  className="grid-card-img"
                />
                <span className="grid-card-badge">{mod.id}</span>
              </div>

              <div className="grid-card-body">
                <div className="grid-card-meta">
                  <span>{mod.familyLabel}</span>
                  <span>{mod.processNode}</span>
                </div>
                <h3 className="grid-card-name">{mod.name}</h3>
                <p className="grid-card-summary">{mod.summary}</p>

                <div className="grid-card-metrics">
                  <span>{mod.topsFp8.toLocaleString()} TOPS</span>
                  <span>{mod.tdpWatts} W</span>
                  <span>{mod.topsPerWatt.toFixed(2)} T/W</span>
                </div>

                <button
                  type="button"
                  className="grid-inspect-btn"
                  data-testid={`grid-inspect-${mod.slug}`}
                  onClick={() => onInspectModule(globalIndex)}
                >
                  Inspect Telemetry
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
