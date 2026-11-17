interface SplineFrameSize {
  _frameView?: { frameSize: { x: number; y: number } };
}

/**
 * Compatibility with Spline's manual sizing: setSize updates the buffer but
 * leaves its orthographic frame at the initial aspect ratio. Keep this guarded
 * internal access here until the runtime exposes a public frame-resize API.
 */
export function syncSceneFrameSize(application: object, width: number, height: number) {
  const frame = (application as SplineFrameSize)._frameView;
  if (frame && "frameSize" in frame) frame.frameSize = { x: width, y: height };
}

/** A pixel budget also bounds GPU work on large, high-density displays. */
export function getScenePixelRatio(width: number, height: number, mobile: boolean) {
  const budget = mobile ? 1100000 : 1920 * 1080;
  return Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    mobile ? 1.35 : 1.75,
    Math.sqrt(budget / Math.max(1, width * height)),
  );
}
