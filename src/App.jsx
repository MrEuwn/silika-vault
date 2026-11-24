import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SILICON_MODULES } from './data/modules.js';
import { PlateTextureCache } from './engine/PlateTextureCache.js';
import { SpatialStage } from './engine/SpatialStage.js';
import { RetinaTrackerCanvas } from './hud/RetinaTrackerCanvas.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { PeripheralChrome } from './ui/PeripheralChrome.jsx';
import { IndexDrum } from './ui/IndexDrum.jsx';
import { SpecDrawer } from './ui/SpecDrawer.jsx';
import { ModuleGridFallback } from './ui/ModuleGridFallback.jsx';

export function App() {
  const containerRef = useRef(null);
  const stageCanvasRef = useRef(null);
  const trackerCanvasRef = useRef(null);
  const indexButtonRef = useRef(null);
  const stageRef = useRef(null);
  const trackerRef = useRef(null);
  const audioRef = useRef(null);
  const plateCacheRef = useRef(null);

  const [webglAvailable, setWebglAvailable] = useState(true);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [viewMode, setViewMode] = useState('3d');
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [inspectedIndex, setInspectedIndex] = useState(null);
  const [exploded, setExploded] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  if (!plateCacheRef.current) {
    plateCacheRef.current = new PlateTextureCache(12);
  }
  if (!audioRef.current) {
    audioRef.current = new AudioEngine();
  }

  const activeModule = SILICON_MODULES[activeIndex] || SILICON_MODULES[0];
  const lockedModule = useMemo(() => {
    if (inspectedIndex !== null) return SILICON_MODULES[inspectedIndex];
    if (hoveredIndex !== null) return SILICON_MODULES[hoveredIndex];
    return null;
  }, [inspectedIndex, hoveredIndex]);

  const inspectedModule = inspectedIndex !== null ? SILICON_MODULES[inspectedIndex] : null;

  useEffect(() => {
    const canvas = stageCanvasRef.current;
    const trackerCanvas = trackerCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !trackerCanvas || !container) return undefined;

    const tracker = new RetinaTrackerCanvas(trackerCanvas);
    trackerRef.current = tracker;

    const stage = new SpatialStage({
      canvas,
      container,
      plateCache: plateCacheRef.current,
      trackerHud: tracker,
      onActiveChange: (idx) => {
        setActiveIndex(idx);
        audioRef.current?.playDetent(idx);
      },
      onHoverChange: (idx) => {
        setHoveredIndex(idx);
        if (idx !== null) audioRef.current?.playHoverLock();
      },
      onInspectRequest: (idx) => {
        setActiveIndex(idx);
        setInspectedIndex(idx);
        setExploded(true);
        setIndexOpen(false);
        audioRef.current?.playCutawayLatch(true);
      },
      onWebGLFailure: (reason) => {
        setWebglAvailable(false);
        setFallbackReason(reason);
        setViewMode('2d');
        window.__SILIKA_STAGE__ = {
          rendererType: '2d-fallback',
          dpr: window.devicePixelRatio || 1,
          canvasWidth: 0,
          canvasHeight: 0,
          activeModuleId: SILICON_MODULES[0].id,
          lockedModuleId: null,
          inspectedModuleId: null,
          exploded: false,
          viewMode: '2d',
        };
      },
    });
    stageRef.current = stage;

    return () => {
      stage.dispose();
      stageRef.current = null;
      tracker.clear();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.setInspected(inspectedIndex, exploded);
    }
    if (!webglAvailable && window.__SILIKA_STAGE__) {
      window.__SILIKA_STAGE__.viewMode = viewMode;
      window.__SILIKA_STAGE__.inspectedModuleId = inspectedModule ? inspectedModule.id : null;
    } else if (window.__SILIKA_STAGE__) {
      window.__SILIKA_STAGE__.viewMode = viewMode;
    }
  }, [inspectedIndex, exploded, viewMode, webglAvailable, inspectedModule]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.setPaused(viewMode === '2d');
    }
    if (viewMode === '2d' && trackerRef.current) {
      trackerRef.current.clear();
    }
  }, [viewMode]);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  // Global keyboard shortcuts: [I] toggles Index (20), arrows step smoothly & lock tracker
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'i' || e.key === 'I') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          return;
        }
        e.preventDefault();
        setIndexOpen((prev) => !prev);
        return;
      }
      if (inspectedIndex === null && !indexOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (activeIndex + 1) % SILICON_MODULES.length;
          setActiveIndex(next);
          stageRef.current?.scrollToIndex(next);
          audioRef.current?.playDetent(next);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (activeIndex - 1 + SILICON_MODULES.length) % SILICON_MODULES.length;
          setActiveIndex(prev);
          stageRef.current?.scrollToIndex(prev);
          audioRef.current?.playDetent(prev);
        } else if (e.key === 'Enter' && document.activeElement === document.body) {
          setInspectedIndex(hoveredIndex !== null ? hoveredIndex : activeIndex);
          setExploded(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, hoveredIndex, indexOpen, inspectedIndex]);

  const handleToggleViewMode = useCallback(() => {
    if (!webglAvailable) return;
    setIndexOpen(false);
    setInspectedIndex(null);
    setExploded(false);
    setViewMode((prev) => (prev === '3d' ? '2d' : '3d'));
  }, [webglAvailable]);

  const handleReturnStage = useCallback(() => {
    setIndexOpen(false);
    setInspectedIndex(null);
    setExploded(false);
    if (webglAvailable) setViewMode('3d');
    stageRef.current?.scrollToIndex(0, { lockHud: false });
  }, [webglAvailable]);

  const handleToggleIndex = useCallback(() => {
    setIndexOpen((prev) => !prev);
  }, []);

  const handleCloseIndex = useCallback(() => {
    setIndexOpen(false);
    indexButtonRef.current?.focus();
  }, []);

  const handleSelectFromIndex = useCallback((idx) => {
    setActiveIndex(idx);
    stageRef.current?.scrollToIndex(idx, { lockHud: false });
    setInspectedIndex(idx);
    setExploded(true);
    setIndexOpen(false);
    audioRef.current?.playCutawayLatch(true);
  }, []);

  const handleStepFromIndex = useCallback((idx) => {
    setActiveIndex(idx);
    stageRef.current?.scrollToIndex(idx);
    audioRef.current?.playDetent(idx);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setInspectedIndex(null);
    setExploded(false);
    audioRef.current?.playCutawayLatch(false);
  }, []);

  const handleToggleExploded = useCallback(() => {
    setExploded((prev) => {
      const next = !prev;
      audioRef.current?.playCutawayLatch(next);
      return next;
    });
  }, []);

  const handleStepDrawer = useCallback(
    (delta) => {
      const base = inspectedIndex !== null ? inspectedIndex : activeIndex;
      const next = (base + delta + SILICON_MODULES.length) % SILICON_MODULES.length;
      setActiveIndex(next);
      setInspectedIndex(next);
      stageRef.current?.scrollToIndex(next, { lockHud: false });
      audioRef.current?.playDetent(next);
    },
    [inspectedIndex, activeIndex]
  );

  const handleToggleAudio = useCallback(() => {
    const next = audioRef.current ? audioRef.current.toggle() : false;
    setAudioEnabled(next);
  }, []);

  const handleInspectFromGrid = useCallback((idx) => {
    setActiveIndex(idx);
    setInspectedIndex(idx);
    setExploded(true);
    stageRef.current?.scrollToIndex(idx, { lockHud: false });
    audioRef.current?.playCutawayLatch(true);
  }, []);

  return (
    <main className="silika-root" ref={containerRef}>
      <h1 className="sr-only sr-h1">
        SILIKA Spatial AI Compute and Silicon Module Archive
      </h1>

      <canvas
        ref={stageCanvasRef}
        className={viewMode === '3d' ? 'stage-canvas' : 'stage-canvas is-hidden'}
        aria-label="3D Silicon Compute Cartridge Cascade"
      />

      <canvas
        ref={trackerCanvasRef}
        className={viewMode === '3d' ? 'tracker-canvas' : 'tracker-canvas is-hidden'}
        aria-hidden="true"
      />

      {viewMode === '2d' && (
        <ModuleGridFallback
          activeIndex={activeIndex}
          webglFallbackReason={fallbackReason}
          onInspectModule={handleInspectFromGrid}
        />
      )}

      <PeripheralChrome
        activeModule={activeModule}
        lockedModule={lockedModule}
        viewMode={viewMode}
        webglAvailable={webglAvailable}
        indexOpen={indexOpen}
        audioEnabled={audioEnabled}
        indexButtonRef={indexButtonRef}
        onToggleViewMode={handleToggleViewMode}
        onToggleIndex={handleToggleIndex}
        onToggleAudio={handleToggleAudio}
        onReturnStage={handleReturnStage}
      />

      <IndexDrum
        open={indexOpen}
        activeIndex={activeIndex}
        onOpenFromFocus={() => setIndexOpen(true)}
        onSelectModule={handleSelectFromIndex}
        onStepActive={handleStepFromIndex}
        onClose={handleCloseIndex}
      />

      <SpecDrawer
        moduleData={inspectedModule}
        viewMode={viewMode}
        exploded={exploded}
        onToggleExploded={handleToggleExploded}
        onStepModule={handleStepDrawer}
        onClose={handleCloseDrawer}
      />
    </main>
  );
}

export default App;
