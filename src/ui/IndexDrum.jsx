import React, { useEffect, useRef } from 'react';
import { SILICON_MODULES } from '../data/modules.js';

export function IndexDrum({
  open,
  activeIndex,
  onOpenFromFocus,
  onSelectModule,
  onStepActive,
  onClose,
}) {
  const navRef = useRef(null);
  const rowRefs = useRef([]);

  useEffect(() => {
    const activeRow = rowRefs.current[activeIndex];
    if (open && activeRow) {
      activeRow.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(SILICON_MODULES.length - 1, activeIndex + 1);
      onStepActive(next);
      rowRefs.current[next]?.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      onStepActive(prev);
      rowRefs.current[prev]?.focus();
    }
  };

  return (
    <nav
      id="silika-index-drum"
      ref={navRef}
      data-testid="index-drum"
      className={open ? 'index-drum is-open' : 'index-drum'}
      aria-label="Silicon Compute Modules"
      aria-hidden={!open}
      onFocus={onOpenFromFocus}
      onKeyDown={handleKeyDown}
    >
      <div className="index-drum-header">
        <span className="index-drum-title">COMPUTE INDEX // 20 UNITS</span>
        <button
          type="button"
          className="index-drum-close"
          onClick={onClose}
          aria-label="Close module index"
        >
          ESC
        </button>
      </div>

      <ul className="index-drum-list">
        {SILICON_MODULES.map((mod, idx) => {
          const isActive = idx === activeIndex;
          return (
            <li key={mod.id} className="index-drum-li">
              <button
                type="button"
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                data-index={idx}
                data-testid={`index-item-${mod.slug}`}
                className={isActive ? 'index-drum-item is-active' : 'index-drum-item'}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelectModule(idx)}
              >
                <span className="drum-id">{mod.id}</span>
                <span className="drum-name">{mod.name}</span>
                <span className="drum-metric">
                  {mod.topsFp8.toLocaleString()}T · {mod.tdpWatts}W
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
