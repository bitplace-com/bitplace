/**
 * Performance metrics for pixel loading instrumentation
 * Enable with ?debug=1 in URL
 */

interface PerfMetrics {
  mapMountStart: number;
  firstPixelsRendered: number;
  ttfp: number | null; // Time to First Pixels
  fetchDurations: number[];
  drawDurations: number[];
  visibleTileCount: number;
  cachedTileCount: number;
  lastFetchMs: number | null;
  lastDrawMs: number | null;
}

const metrics: PerfMetrics = {
  mapMountStart: 0,
  firstPixelsRendered: 0,
  ttfp: null,
  fetchDurations: [],
  drawDurations: [],
  visibleTileCount: 0,
  cachedTileCount: 0,
  lastFetchMs: null,
  lastDrawMs: null,
};

// Check if debug mode is enabled
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

// Mark when map component mounts
export function markMapMountStart(): void {
  metrics.mapMountStart = performance.now();
  if (isDebugMode()) {
    console.log('[PERF] map_mount_start:', metrics.mapMountStart.toFixed(1), 'ms');
  }
}

// Mark when first pixels are rendered
export function markFirstPixelsRendered(): void {
  if (metrics.firstPixelsRendered > 0) return; // Only mark once
  metrics.firstPixelsRendered = performance.now();
  metrics.ttfp = metrics.firstPixelsRendered - metrics.mapMountStart;
  if (isDebugMode()) {
    console.log('[PERF] first_pixels_rendered:', metrics.firstPixelsRendered.toFixed(1), 'ms');
    console.log('[PERF] TTFP:', metrics.ttfp.toFixed(1), 'ms');
  }
}

// Start tracking a fetch operation
export function markFetchStart(): number {
  const startTime = performance.now();
  if (isDebugMode()) {
    console.log('[PERF] pixels_fetch_start');
  }
  return startTime;
}

// End tracking a fetch operation
export function markFetchEnd(startTime: number): void {
  const duration = performance.now() - startTime;
  metrics.fetchDurations.push(duration);
  metrics.lastFetchMs = duration;
  // Keep only last 10 measurements
  if (metrics.fetchDurations.length > 10) {
    metrics.fetchDurations.shift();
  }
  if (isDebugMode()) {
    console.log('[PERF] pixels_fetch_end:', duration.toFixed(1), 'ms');
  }
}

// Start tracking a draw operation
export function markDrawStart(): number {
  return performance.now();
}

// End tracking a draw operation
export function markDrawEnd(startTime: number, pixelCount: number = 0): void {
  const duration = performance.now() - startTime;
  metrics.drawDurations.push(duration);
  metrics.lastDrawMs = duration;
  // Keep only last 10 measurements
  if (metrics.drawDurations.length > 10) {
    metrics.drawDurations.shift();
  }
  if (isDebugMode() && duration > 5) { // Only log if > 5ms
    console.log('[PERF] canvas_draw_end:', duration.toFixed(1), 'ms, pixels:', pixelCount);
  }
}

// Update tile counts
export function updateTileCounts(visible: number, cached: number): void {
  metrics.visibleTileCount = visible;
  metrics.cachedTileCount = cached;
}

// Get current metrics for HUD display
export function getMetrics(): Readonly<PerfMetrics> {
  return { ...metrics };
}

// Get average fetch duration
export function getAvgFetchMs(): number {
  if (metrics.fetchDurations.length === 0) return 0;
  return metrics.fetchDurations.reduce((a, b) => a + b, 0) / metrics.fetchDurations.length;
}

// Get average draw duration
export function getAvgDrawMs(): number {
  if (metrics.drawDurations.length === 0) return 0;
  return metrics.drawDurations.reduce((a, b) => a + b, 0) / metrics.drawDurations.length;
}

// Reset metrics (useful for testing)
export function resetMetrics(): void {
  metrics.mapMountStart = 0;
  metrics.firstPixelsRendered = 0;
  metrics.ttfp = null;
  metrics.fetchDurations = [];
  metrics.drawDurations = [];
  metrics.lastFetchMs = null;
  metrics.lastDrawMs = null;
}
