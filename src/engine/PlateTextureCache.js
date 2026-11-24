export class PlateTextureCache {
  constructor(maxEntries = 8) {
    this.maxEntries = maxEntries;
    this.cache = new Map();
    this.inFlight = new Set();
  }

  getIfReady(moduleId) {
    const entry = this.cache.get(moduleId);
    if (!entry) return null;
    // Touch LRU order
    this.cache.delete(moduleId);
    this.cache.set(moduleId, entry);
    return entry;
  }

  request(mod, onLoaded) {
    if (!mod || !mod.plateAsset) return;
    if (this.cache.has(mod.id)) {
      this.getIfReady(mod.id);
      return;
    }
    if (this.inFlight.has(mod.id)) return;

    this.inFlight.add(mod.id);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.inFlight.delete(mod.id);
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(mod.id, img);
      if (onLoaded) onLoaded(mod.id, img);
    };
    img.onerror = () => {
      this.inFlight.delete(mod.id);
    };
    img.src = mod.plateAsset;
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}
