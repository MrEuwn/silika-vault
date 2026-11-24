import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SILICON_MODULES } from '../data/modules.js';
import { buildModuleAssembly } from './ModuleGeometryFactory.js';
import { clamp, damp, getStageDpr, projectBoxToScreen } from './math.js';

const MODULE_SPACING = 0.96;
const TOTAL_COUNT = SILICON_MODULES.length;
const TOTAL_SPAN = TOTAL_COUNT * MODULE_SPACING;

// Hand-choreographed dense monochrome noir tumble (mirrors bizar.ro hero composition density!):
// At scroll = 0, modules 18, 19, 0, 1, 2, 3, 4 fill the entire 1440x900 viewport edge-to-edge
// with crisp pitch-black obsidian negative space carving every overlapping silhouette!
const CHOREO = [
  // idx 0 (SLK-01): Hero lower-center foreground clear acrylic cartridge catching tight specular glint!
  { x: 0.05, yOff: -1.04, z: 1.72, rx: 0.56, ry: -0.18, rz: -0.09 },
  // idx 1 (SLK-02): Mid-right diagonal zebra striped cartridge slashing dynamically right (zero clipping!)
  { x: 2.38, yOff: 1.06, z: 0.48, rx: 0.94, ry: 0.34, rz: -0.32 },
  // idx 2 (SLK-03): Upper-left steep edge-on / tilted obsidian cartridge catching studio halation!
  { x: -1.82, yOff: 2.94, z: 0.64, rx: 1.46, ry: -0.18, rz: -0.26 },
  // idx 3 (SLK-04): Lower-left stealth obsidian chassis peeking crisply behind foreground hero!
  { x: -2.36, yOff: 1.24, z: -0.74, rx: 0.48, ry: 0.22, rz: 0.14 },
  // idx 4 (SLK-05): Mid-left thin horizontal edge profile cutting cleanly across obsidian void!
  { x: -1.58, yOff: 3.74, z: -0.82, rx: 1.54, ry: 0.12, rz: 0.18 },
  // idx 5 (SLK-06): Lower-right gleaming metallic speed-bars cartridge
  { x: 2.32, yOff: 3.12, z: -0.58, rx: 0.50, ry: -0.36, rz: -0.40 },
  // idx 6 (SLK-07): Deep mid-center tilted zebra
  { x: 0.52, yOff: 0.0, z: -1.35, rx: 0.72, ry: 0.28, rz: 0.26 },
  // idx 7 (SLK-08): Left foreground translucent tilt
  { x: -1.65, yOff: 0.0, z: 0.78, rx: 0.88, ry: 0.38, rz: -0.24 },
  // idx 8 (SLK-09): Right steep edge-on bay spine
  { x: 1.88, yOff: 0.0, z: 0.32, rx: 1.46, ry: -0.24, rz: 0.32 },
  // idx 9 (SLK-10): Center-left matte stealth
  { x: -0.62, yOff: 0.0, z: -0.45, rx: 0.64, ry: -0.32, rz: 0.18 },
  { x: 1.45, yOff: 0.0, z: 0.95, rx: 0.78, ry: 0.26, rz: -0.28 },
  { x: -1.92, yOff: 0.0, z: -0.82, rx: 1.38, ry: 0.22, rz: -0.36 },
  { x: 0.24, yOff: 0.0, z: 0.58, rx: 0.60, ry: -0.22, rz: 0.22 },
  { x: 2.08, yOff: 0.0, z: -1.12, rx: 0.82, ry: -0.40, rz: 0.30 },
  { x: -1.25, yOff: 0.0, z: 0.88, rx: 0.54, ry: 0.34, rz: -0.18 },
  { x: 1.28, yOff: 0.0, z: -0.42, rx: 1.44, ry: -0.18, rz: -0.26 },
  { x: -0.42, yOff: 0.0, z: -1.18, rx: 0.68, ry: 0.30, rz: 0.34 },
  { x: 1.72, yOff: 0.0, z: 0.54, rx: 0.86, ry: -0.28, rz: -0.22 },
  // idx 18 (wraps just above viewport top-left!)
  { x: -1.55, yOff: 0.20, z: -0.75, rx: 0.62, ry: 0.28, rz: 0.34 },
  // idx 19 (wraps cleanly into upper-center hero frame!)
  { x: 0.38, yOff: 0.62, z: -0.68, rx: 0.68, ry: -0.26, rz: 0.36 },
];

/**
 * Builds a precision darkroom studio environment cubemap via PMREMGenerator.
 * Pitch-black studio walls with 3 tight, high-contrast studio softboxes yield
 * dramatic obsidian silhouettes with selective gleaming chrome/acrylic speculars.
 */
function createNoirStudioEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x000000);

  const heroBoxMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 3.7, 3.9) });
  const rimStripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.6) });
  const kickStripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.8, 2.0) });

  // Tight overhead studio softbox (creates focused photographic glint pool on clear lids!)
  const topBox = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.8), heroBoxMat);
  topBox.position.set(0.5, 7.2, 3.0);
  topBox.lookAt(0, 0, 0);
  envScene.add(topBox);

  // Slim right rim strip
  const rightStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 9.5), rimStripMat);
  rightStrip.position.set(8.5, 2.4, 3.2);
  rightStrip.lookAt(0, 0, 0);
  envScene.add(rightStrip);

  // Slim back-left edge kicker strip
  const leftRim = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 9.0), kickStripMat);
  leftRim.position.set(-8.2, 3.8, -3.0);
  leftRim.lookAt(0, 0, 0);
  envScene.add(leftRim);

  const renderTarget = pmrem.fromScene(envScene, 0.04);

  heroBoxMat.dispose();
  rimStripMat.dispose();
  kickStripMat.dispose();
  topBox.geometry.dispose();
  rightStrip.geometry.dispose();
  leftRim.geometry.dispose();
  pmrem.dispose();

  return renderTarget;
}

export class SpatialStage {
  constructor({
    canvas,
    container,
    plateCache,
    trackerHud,
    onActiveChange,
    onHoverChange,
    onInspectRequest,
    onWebGLFailure,
    onTick,
  }) {
    this.canvas = canvas;
    this.container = container;
    this.plateCache = plateCache;
    this.trackerHud = trackerHud;
    this.onActiveChange = onActiveChange;
    this.onHoverChange = onHoverChange;
    this.onInspectRequest = onInspectRequest;
    this.onWebGLFailure = onWebGLFailure;
    this.onTick = onTick;

    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;
    this.dpr = getStageDpr();

    this.targetScroll = 0;
    this.currentScroll = 0;
    this.activeIndex = 0;
    this.hoveredIndex = null;
    this.inspectedIndex = null;
    this.exploded = false;
    this.hasInteracted = false;

    this.pointerNdc = new THREE.Vector2(99, 99);
    this.pointerNorm = { x: 0, y: 0 };
    this.smoothPointerNorm = { x: 0, y: 0 };
    this.pointerPx = { x: this.width * 0.5, y: this.height * 0.5, active: false };
    this.isCoarse = window.matchMedia('(pointer: coarse)').matches;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionQuery.matches;

    this.dragState = {
      down: false,
      startX: 0,
      startY: 0,
      lastY: 0,
      travel: 0,
    };

    this.raycaster = new THREE.Raycaster();
    this.box3 = new THREE.Box3();
    this.modules = [];
    this.disposed = false;
    this.paused = false;
    this.rafId = 0;
    this.lastTime = performance.now();

    this.init();
  }

  computeBaseZ() {
    const aspect = this.width / Math.max(1, this.height);
    if (aspect < 0.72) return 8.6;
    if (this.width < 768) return 7.9;
    return 7.35;
  }

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      });
      if (!this.renderer.capabilities.isWebGL2) {
        this.renderer.dispose();
        this.onWebGLFailure('webgl2-unavailable');
        return;
      }
      this.renderer.setClearColor(0x04060a, 1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.96;
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.width, this.height, false);
    } catch {
      this.onWebGLFailure('webgl-init-error');
      return;
    }

    this.handleContextLost = (e) => {
      e.preventDefault();
      this.onWebGLFailure('webglcontextlost');
    };
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060a);
    this.scene.fog = new THREE.FogExp2(0x04060a, 0.068);

    this.envRenderTarget = createNoirStudioEnvMap(this.renderer);
    this.scene.environment = this.envRenderTarget.texture;

    const aspect = this.width / Math.max(1, this.height);
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 45);
    this.cameraBaseZ = this.computeBaseZ();
    this.camera.position.set(0, 0, this.cameraBaseZ);

    // Calibrated monochrome noir studio chiaroscuro (deep obsidian blacks + crisp rim speculars!)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.38);
    keyLight.position.set(2.4, 7.2, 5.2);

    const rimLight = new THREE.DirectionalLight(0xe4eeff, 1.55);
    rimLight.position.set(-5.8, 3.6, -2.6);

    const lowEdgeLight = new THREE.DirectionalLight(0xb8c6da, 0.48);
    lowEdgeLight.position.set(3.2, -5.0, 4.0);

    // Focused overhead studio specular spot aimed at foreground hero acrylic platter for pinpoint halation!
    this.specularLamp = new THREE.PointLight(0xffffff, 4.2, 7.2, 2.0);
    this.specularLamp.position.set(0.32, 0.25, 3.15);

    this.scene.add(keyLight, rimLight, lowEdgeLight, this.specularLamp);

    // Selective HDR UnrealBloomPass: high threshold (1.28) blooms ONLY hottest chrome/glass reflections!
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(this.width, this.height);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.46,  // crisp photographic studio halation without whiteout
      0.56,  // Leica lens bloom spread
      1.26   // HDR-only threshold keeps printed labels & dark chassis razor sharp!
    );
    const outputPass = new OutputPass();

    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(outputPass);

    // Build all 20 unique sculpted silicon compute cartridges
    this.rackGroup = new THREE.Group();
    SILICON_MODULES.forEach((mod, index) => {
      const assembly = buildModuleAssembly(mod, index);
      const choreo = CHOREO[index % CHOREO.length];
      const basePos = new THREE.Vector3(choreo.x, choreo.yOff || 0, choreo.z);
      const baseRot = new THREE.Euler(choreo.rx, choreo.ry, choreo.rz);

      assembly.root.position.copy(basePos);
      assembly.root.rotation.copy(baseRot);
      assembly.root.userData.moduleIndex = index;

      assembly.root.traverse((obj) => {
        if (obj.isMesh) obj.userData.moduleIndex = index;
      });

      this.rackGroup.add(assembly.root);
      this.modules.push({
        mod,
        index,
        assembly,
        basePos,
        baseRot,
        yOff: choreo.yOff || 0,
        explodeProgress: 0,
        inspectBlend: 0,
      });
    });
    this.scene.add(this.rackGroup);

    // Pre-warm first 4 real photography plates silently for instant hover mosaic burst
    for (let k = 0; k < 4; k += 1) {
      this.plateCache.request(SILICON_MODULES[k]);
    }

    this.bindEvents();
    this.updateGlobalTelemetry();
    this.animate(performance.now());
  }

  bindEvents() {
    this.onWheel = (e) => {
      if (this.inspectedIndex !== null) return;
      e.preventDefault();
      this.hasInteracted = true;
      this.targetScroll += e.deltaY * 0.0036;
    };

    this.onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.dragState.down = true;
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
      this.dragState.lastY = e.clientY;
      this.dragState.travel = 0;
      this.pointerPx.x = e.clientX;
      this.pointerPx.y = e.clientY;
      this.pointerPx.active = true;
      this.updateNdc(e.clientX, e.clientY);
    };

    this.onPointerMove = (e) => {
      this.pointerPx.x = e.clientX;
      this.pointerPx.y = e.clientY;
      this.pointerPx.active = true;
      this.updateNdc(e.clientX, e.clientY);

      if (this.dragState.down) {
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.lastY;
        this.dragState.travel = Math.hypot(dx, e.clientY - this.dragState.startY);
        this.dragState.lastY = e.clientY;
        if (this.inspectedIndex === null && this.dragState.travel > 4) {
          this.hasInteracted = true;
          this.targetScroll -= dy * 0.011;
        }
      }

      if (!this.isCoarse && this.dragState.travel <= 4 && this.inspectedIndex === null) {
        this.performRaycast();
      }
    };

    this.onPointerUp = (e) => {
      if (!this.dragState.down) return;
      const wasClick = this.dragState.travel < 7;
      this.dragState.down = false;
      this.updateNdc(e.clientX, e.clientY);

      if (wasClick) {
        const hitIdx = this.performRaycast();
        if (hitIdx !== null) {
          this.hasInteracted = true;
          this.onInspectRequest(hitIdx);
        }
      }
    };

    this.onPointerLeave = () => {
      this.pointerPx.active = false;
      this.pointerNdc.set(99, 99);
      this.pointerNorm.x = 0;
      this.pointerNorm.y = 0;
      if (this.hoveredIndex !== null) {
        this.hoveredIndex = null;
        if (this.onHoverChange) this.onHoverChange(null);
      }
    };

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    this.onMotionChange = (e) => {
      this.reducedMotion = e.matches;
    };
    this.motionQuery.addEventListener('change', this.onMotionChange);

    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  updateNdc(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerNdc.x = nx;
    this.pointerNdc.y = ny;
    this.pointerNorm.x = clamp(nx, -1, 1);
    this.pointerNorm.y = clamp(ny, -1, 1);
  }

  performRaycast() {
    if (!this.camera || !this.rackGroup) return null;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.rackGroup.children, true);
    const hit = hits.find((h) => h.object && typeof h.object.userData.moduleIndex === 'number');
    const idx = hit ? hit.object.userData.moduleIndex : null;
    if (idx !== this.hoveredIndex) {
      this.hoveredIndex = idx;
      if (idx !== null) {
        this.hasInteracted = true;
        this.plateCache.request(SILICON_MODULES[idx]);
      }
      if (this.onHoverChange) this.onHoverChange(idx);
      this.updateGlobalTelemetry();
    }
    return idx;
  }

  handleResize() {
    if (this.disposed || !this.renderer) return;
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.dpr = getStageDpr();
    this.cameraBaseZ = this.computeBaseZ();
    this.camera.aspect = this.width / Math.max(1, this.height);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.dpr);
      this.composer.setSize(this.width, this.height);
    }
    if (this.bloomPass) {
      this.bloomPass.setSize(this.width, this.height);
    }
    if (this.trackerHud) {
      this.trackerHud.resize(this.width, this.height);
    }
    this.updateGlobalTelemetry();
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (this.paused && this.trackerHud) {
      this.trackerHud.clear();
    }
  }

  scrollToIndex(index, { lockHud = true } = {}) {
    const clamped = ((index % TOTAL_COUNT) + TOTAL_COUNT) % TOTAL_COUNT;
    const rawTarget = clamped * MODULE_SPACING;
    const currentWrapped = ((this.currentScroll % TOTAL_SPAN) + TOTAL_SPAN) % TOTAL_SPAN;
    let delta = rawTarget - currentWrapped;
    if (delta > TOTAL_SPAN * 0.5) delta -= TOTAL_SPAN;
    if (delta < -TOTAL_SPAN * 0.5) delta += TOTAL_SPAN;
    this.targetScroll = this.currentScroll + delta;

    if (lockHud) {
      this.hasInteracted = true;
      this.hoveredIndex = clamped;
      this.plateCache.request(SILICON_MODULES[clamped]);
      if (this.onHoverChange) this.onHoverChange(clamped);
    }
    this.updateGlobalTelemetry();
  }

  setInspected(index, exploded) {
    this.inspectedIndex = index;
    this.exploded = Boolean(exploded);
    if (index !== null) {
      this.hasInteracted = true;
      this.scrollToIndex(index, { lockHud: false });
      this.plateCache.request(SILICON_MODULES[index]);
    }
    this.updateGlobalTelemetry();
  }

  updateGlobalTelemetry() {
    const activeMod = SILICON_MODULES[this.activeIndex] || SILICON_MODULES[0];
    const lockedIdx = this.inspectedIndex !== null ? this.inspectedIndex : this.hoveredIndex;
    const lockedMod = lockedIdx !== null ? SILICON_MODULES[lockedIdx] : null;
    window.__SILIKA_STAGE__ = {
      rendererType: 'webgl2',
      dpr: this.dpr,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      activeModuleId: activeMod.id,
      lockedModuleId: lockedMod ? lockedMod.id : null,
      inspectedModuleId: this.inspectedIndex !== null ? SILICON_MODULES[this.inspectedIndex].id : null,
      exploded: this.exploded,
      viewMode: '3d',
      lockHoverIndex: (idx) => {
        if (idx === null) {
          this.hoveredIndex = null;
          if (this.onHoverChange) this.onHoverChange(null);
          this.updateGlobalTelemetry();
          return;
        }
        const safe = ((idx % TOTAL_COUNT) + TOTAL_COUNT) % TOTAL_COUNT;
        this.hasInteracted = true;
        this.hoveredIndex = safe;
        this.plateCache.request(SILICON_MODULES[safe]);
        if (this.onHoverChange) this.onHoverChange(safe);
        this.updateGlobalTelemetry();
      },
    };
  }

  animate(now) {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame((t) => this.animate(t));
    if (this.paused) {
      this.lastTime = now;
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    const snap = this.reducedMotion;
    const timeSec = now * 0.001;

    this.currentScroll = snap
      ? this.targetScroll
      : damp(this.currentScroll, this.targetScroll, 8.2, dt);

    const rawIdx = Math.round(this.currentScroll / MODULE_SPACING);
    const nearest = ((rawIdx % TOTAL_COUNT) + TOTAL_COUNT) % TOTAL_COUNT;
    if (nearest !== this.activeIndex) {
      this.activeIndex = nearest;
      this.plateCache.request(SILICON_MODULES[nearest]);
      if (this.onActiveChange) this.onActiveChange(nearest);
      this.updateGlobalTelemetry();
    }

    this.smoothPointerNorm.x = snap
      ? 0
      : damp(this.smoothPointerNorm.x, this.pointerNorm.x, 4.5, dt);
    this.smoothPointerNorm.y = snap
      ? 0
      : damp(this.smoothPointerNorm.y, this.pointerNorm.y, 4.5, dt);

    const isDesktop = this.width >= 768;
    const isInspecting = this.inspectedIndex !== null;

    const camTargetX = isInspecting
      ? isDesktop
        ? 0.95
        : 0
      : this.smoothPointerNorm.x * 0.22;
    const camTargetY = isInspecting
      ? isDesktop
        ? 0.06
        : -0.35
      : this.smoothPointerNorm.y * 0.14;
    const camTargetZ = isInspecting
      ? isDesktop
        ? 5.65
        : 7.4
      : this.cameraBaseZ;

    if (snap) {
      this.camera.position.set(camTargetX, camTargetY, camTargetZ);
    } else {
      this.camera.position.x = damp(this.camera.position.x, camTargetX, 6.5, dt);
      this.camera.position.y = damp(this.camera.position.y, camTargetY, 6.5, dt);
      this.camera.position.z = damp(this.camera.position.z, camTargetZ, 6.5, dt);
    }
    this.camera.lookAt(isInspecting && isDesktop ? 0.58 : 0, 0, 0);

    // Subtle specular point lamp tracking pointer for live chrome/glass highlights
    this.specularLamp.position.set(
      0.32 + this.smoothPointerNorm.x * 1.1,
      0.20 + this.smoothPointerNorm.y * 0.8,
      3.15
    );

    const halfSpan = TOTAL_SPAN * 0.5;
    for (let i = 0; i < TOTAL_COUNT; i += 1) {
      const item = this.modules[i];
      const isInspected = this.inspectedIndex === i;
      const isHovered = this.hoveredIndex === i;

      let relY = -(i * MODULE_SPACING - this.currentScroll);
      relY = ((((relY + halfSpan) % TOTAL_SPAN) + TOTAL_SPAN) % TOTAL_SPAN) - halfSpan;

      const driftY = snap ? 0 : Math.sin(timeSec * 0.52 + i * 1.37) * 0.07;
      const driftRotX = snap ? 0 : Math.cos(timeSec * 0.40 + i * 1.11) * 0.038;
      const driftRotY = snap ? 0 : Math.sin(timeSec * 0.44 + i * 0.89) * 0.045;

      const targetInspect = isInspected ? 1 : 0;
      item.inspectBlend = snap
        ? targetInspect
        : damp(item.inspectBlend, targetInspect, 7.5, dt);

      const targetExplode = isInspected && this.exploded ? 1 : 0;
      item.explodeProgress = snap
        ? targetExplode
        : damp(item.explodeProgress, targetExplode, 8.0, dt);

      const { layers, root, rotors, dieAccentMat } = item.assembly;

      // Recede neighboring cartridges deeply into obsidian void when inspecting one module
      const dimBackZ = isInspecting && !isInspected ? -4.2 : 0;
      const mobileScaleX = isDesktop ? 1.0 : 0.58;

      const cascadeX = item.basePos.x * mobileScaleX;
      const cascadeY = relY + item.yOff * (isDesktop ? 1.0 : 0.82) + driftY;
      const cascadeZ = item.basePos.z + dimBackZ;

      const inspectPosX = isDesktop ? -0.45 : 0;
      const inspectPosY = isDesktop ? 0.05 : 0.52;
      const inspectPosZ = isDesktop ? 0.85 : 0.35;

      root.position.set(
        THREE.MathUtils.lerp(cascadeX, inspectPosX, item.inspectBlend),
        THREE.MathUtils.lerp(cascadeY, inspectPosY, item.inspectBlend),
        THREE.MathUtils.lerp(cascadeZ, inspectPosZ, item.inspectBlend)
      );

      const inspectRx = 0.62;
      const inspectRy = -0.36 + (snap ? 0 : Math.sin(timeSec * 0.45) * 0.12);
      const inspectRz = -0.06;

      const cascadeRx = item.baseRot.x + driftRotX + (isHovered ? -0.05 : 0);
      const cascadeRy = item.baseRot.y + driftRotY + (isHovered ? 0.06 : 0);
      const cascadeRz = item.baseRot.z;

      root.rotation.set(
        THREE.MathUtils.lerp(cascadeRx, inspectRx, item.inspectBlend),
        THREE.MathUtils.lerp(cascadeRy, inspectRy, item.inspectBlend),
        THREE.MathUtils.lerp(cascadeRz, inspectRz, item.inspectBlend)
      );

      // Crisp 4-layer exploded cutaway separation
      layers.shroud.position.y = item.explodeProgress * 0.82;
      layers.heatsink.position.y = item.explodeProgress * 0.36;
      layers.die.position.y = 0;
      layers.substrate.position.y = -item.explodeProgress * 0.48;

      // Pure monochrome obsidian silicon when idle; active #38BDF8 telemetry pulse ONLY in cutaway!
      dieAccentMat.emissiveIntensity = item.explodeProgress * 1.65;
      dieAccentMat.color.setRGB(
        THREE.MathUtils.lerp(0.08, 0.22, item.explodeProgress),
        THREE.MathUtils.lerp(0.10, 0.74, item.explodeProgress),
        THREE.MathUtils.lerp(0.14, 0.97, item.explodeProgress)
      );

      if (!snap && rotors) {
        const spinRate = isInspected ? 0.85 : isHovered ? 0.52 : 0.14;
        rotors[0].rotation.y += dt * spinRate;
        rotors[1].rotation.y -= dt * spinRate * 0.85;
      }
    }

    this.composer.render();

    if (this.trackerHud) {
      const lockedIdx =
        this.inspectedIndex !== null
          ? this.inspectedIndex
          : this.hoveredIndex !== null
            ? this.hoveredIndex
            : null;

      let projection = null;
      let lockedMod = null;
      if (lockedIdx !== null && this.modules[lockedIdx]) {
        const targetItem = this.modules[lockedIdx];
        targetItem.assembly.root.updateWorldMatrix(true, true);
        this.box3.setFromObject(targetItem.assembly.root);
        projection = projectBoxToScreen(this.box3, this.camera, this.width, this.height);
        lockedMod = targetItem.mod;
      }

      this.trackerHud.render({
        now,
        pointer: this.pointerPx,
        isCoarse: this.isCoarse,
        reducedMotion: this.reducedMotion,
        lockedModule: lockedMod,
        isInspecting,
        projection,
        plateImage: lockedMod ? this.plateCache.getIfReady(lockedMod.id) : null,
      });
    }

    if (this.onTick) this.onTick();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.motionQuery && this.onMotionChange) {
      this.motionQuery.removeEventListener('change', this.onMotionChange);
    }
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);

    this.modules.forEach((m) => m.assembly.dispose());
    if (this.envRenderTarget) this.envRenderTarget.dispose();
    if (this.composer) this.composer.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
