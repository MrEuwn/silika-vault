export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.enabled = false;
  }

  ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.18;
      this.masterGain.connect(this.ctx.destination);

      const length = Math.floor(this.ctx.sampleRate * 0.05);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  toggle() {
    if (!this.enabled) {
      const ok = this.ensureContext();
      if (!ok) return false;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.enabled = true;
      this.playCutawayLatch(true);
      return true;
    }
    this.enabled = false;
    return false;
  }

  playDetent(stepIndex = 0) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1750 + (stepIndex % 5) * 90, now);
      filter.Q.setValueAtTime(6.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.024);
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.028);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playCutawayLatch(open = true) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(open ? 260 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(open ? 520 : 210, now + 0.065);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.14, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.068);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.12, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.052);
    }
  }

  playHoverLock() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.018);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
