/** A pixel budget also bounds GPU work on large, high-density displays. */
export function getScenePixelRatio(width: number, height: number, mobile: boolean) {
  const budget = mobile ? 1100000 : 1920 * 1080;
  return Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    mobile ? 1.35 : 1.75,
    Math.sqrt(budget / Math.max(1, width * height)),
  );
}
