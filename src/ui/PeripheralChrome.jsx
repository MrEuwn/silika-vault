import React from 'react';

export function PeripheralChrome({
  activeModule,
  lockedModule,
  viewMode,
  webglAvailable,
  indexOpen,
  audioEnabled,
  indexButtonRef,
  onToggleViewMode,
  onToggleIndex,
  onToggleAudio,
  onReturnStage,
}) {
  const displayMod = lockedModule || activeModule;
  const isGrid = viewMode === '2d';

  return (
    <>
      {!isGrid && (
        <div className="corner-scrims" aria-hidden="true">
          <div className="corner-scrim corner-scrim--tl" />
          <div className="corner-scrim corner-scrim--tr" />
          <div className="corner-scrim corner-scrim--bl" />
          <div className="corner-scrim corner-scrim--br" />
        </div>
      )}

      <header
        className={isGrid ? 'chrome chrome--grid' : 'chrome'}
        aria-label="SILIKA Spatial Archive Controls"
      >
        {/* Top-Left: Bespoke Razor-Sharp Geometric SVG Wordmark */}
        <div className="chrome-tl">
          <button
            type="button"
            className="brand-wordmark-btn"
            aria-label="SILIKA Archive Home"
            onClick={onReturnStage}
          >
            <svg
              data-logo="silika-mark"
              width="124"
              height="22"
              viewBox="0 0 186 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Custom precision machined stencil geometry spelling SILIKA */}
              {/* S */}
              <path
                d="M2 8.5L7.5 3H28V8.5H10.5L8.5 10.5V12.5H23.5L29 18V23.5L23.5 29H2V23.5H20.5L22.5 21.5V19.5H7.5L2 14V8.5Z"
                fill="#FFFFFF"
              />
              {/* I */}
              <path d="M36 3H43V29H36V3Z" fill="#FFFFFF" />
              {/* L */}
              <path d="M51 3H58V23H74V29H51V3Z" fill="#FFFFFF" />
              {/* I */}
              <path d="M81 3H88V29H81V3Z" fill="#FFFFFF" />
              {/* K */}
              <path
                d="M96 3H103V13.5L115.5 3H125L110.5 15.2L126 29H116.2L103 17.2V29H96V3Z"
                fill="#FFFFFF"
              />
              {/* A */}
              <path
                d="M142 3H150.5L164 29H156.4L153.4 23H138.8L135.8 29H128.5L142 3ZM146.1 9.5L141.4 18.2H150.8L146.1 9.5Z"
                fill="#FFFFFF"
              />
              {/* Precision silicon registration notch */}
              <rect x="171" y="3" width="12" height="4" fill="#38BDF8" />
              <rect x="171" y="10" width="6" height="6" fill="#FFFFFF" />
              <rect x="179" y="21" width="4" height="8" fill="#FFFFFF" />
            </svg>
          </button>
        </div>

        {/* Top-Right: Whisper-Quiet Hairline Links (Expo-Out Hover Underline) */}
        <nav className="chrome-tr" aria-label="Primary archive navigation">
          <button
            type="button"
            ref={indexButtonRef}
            className={indexOpen ? 'chrome-link is-active' : 'chrome-link'}
            data-testid="index-toggle"
            aria-expanded={indexOpen}
            aria-controls="silika-index-drum"
            onClick={onToggleIndex}
          >
            Index (20)
          </button>

          <button
            type="button"
            className={isGrid ? 'chrome-link is-active' : 'chrome-link'}
            data-testid="view-mode-toggle"
            aria-pressed={isGrid}
            disabled={!webglAvailable}
            title={
              webglAvailable
                ? 'Toggle between 3D Spatial Stage and 2D Archive Grid'
                : 'WebGL2 unavailable; 2D Archive active'
            }
            onClick={onToggleViewMode}
          >
            {isGrid ? '3D Stage' : '2D Archive'}
          </button>

          <a
            href="mailto:archive@silika.lab"
            className="chrome-link chrome-link--desktop"
          >
            archive@silika.lab
          </a>
        </nav>

        {/* Bottom-Left: Editorial 3-Line Bio + Live Active Specimen Cue */}
        {!isGrid && (
          <div
            className="chrome-bl"
            data-testid="hud-locked-module"
            data-module-id={displayMod.id}
          >
            <p className="editorial-bio">
              SILIKA is a Spatial AI Compute &amp; Silicon Archive.
              <br />
              Documenting 20 precision tensor cartridges, HBM4 stacks,
              <br />
              photonic fabrics and cryogenic compute architectures.
            </p>
            <p className="editorial-cue">
              <span className="cue-id">{displayMod.id}</span>
              <span className="cue-sep" aria-hidden="true">/</span>
              <span className="cue-desktop">Scroll · Drag · Click cartridge to inspect</span>
              <span className="cue-mobile">Swipe · Tap cartridge to inspect</span>
            </p>
          </div>
        )}

        {/* Bottom-Right: Minimal Authentic 4-Bar Procedural Web Audio Equalizer */}
        <div className="chrome-br">
          <button
            type="button"
            className={audioEnabled ? 'audio-toggle is-active' : 'audio-toggle'}
            data-testid="audio-toggle"
            aria-label="Toggle procedural telemetry audio"
            aria-pressed={audioEnabled}
            onClick={onToggleAudio}
          >
            <span className="eq-bars" aria-hidden="true">
              <span className="eq-bar eq-bar--1" />
              <span className="eq-bar eq-bar--2" />
              <span className="eq-bar eq-bar--3" />
              <span className="eq-bar eq-bar--4" />
            </span>
          </button>
        </div>
      </header>
    </>
  );
}
