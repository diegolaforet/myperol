const SCENE_URL = "/assets/3d/flooring-07d94fcf.splinecode";
const MAX_PIXEL_RATIO = 1.35;
const MAX_RENDER_PIXELS = 720_000;
const LAYER_SEPARATION = 34;
const LOOP_DURATION = 2200;

const OBJECT_ALIASES = [
  ["hormigon", "concrete", "base hormigon"],
  ["imprimacion", "primer", "epoxy primer"],
  ["silice", "silica", "arido"],
  ["epoxi", "epoxy", "resina epoxi"],
  ["sellador", "sealer", "sellado", "transparent sealer"],
];

const normalizeName = (name = "") =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const easeInOut = (value: number) => value * value * (3 - 2 * value);

let runtimePromise: Promise<typeof import("@splinetool/runtime")> | undefined;
let sceneBufferPromise: Promise<ArrayBuffer> | undefined;

const loadResources = () => {
  runtimePromise ||= import("@splinetool/runtime");
  sceneBufferPromise ||= fetch(SCENE_URL, { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error(`Scene request failed: ${response.status}`);
    return response.arrayBuffer();
  });
  return Promise.all([runtimePromise, sceneBufferPromise]);
};

export const preloadCalculatorEstimateSpline = () => loadResources().then(() => undefined);

export function mountCalculatorEstimateSpline(canvas: HTMLCanvasElement) {
  let disposed = false;
  let spline: any;
  let animationFrame = 0;
  let resizeObserver: ResizeObserver | undefined;
  const modelHost = canvas.closest<HTMLElement>("[data-price-estimate-model]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", dispose);
    spline?.dispose();
    spline = undefined;
    canvas.classList.remove("is-ready");
    modelHost?.classList.remove("is-spline-ready");
  };

  const handleVisibilityChange = () => {
    if (!spline || disposed) return;
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
      spline.stop();
      return;
    }
    spline.play();
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  let renderFrame = (_time: number) => undefined;

  const initialize = async () => {
    const [runtimeModule, sceneBuffer] = await loadResources();
    if (disposed) return;

    spline = new runtimeModule.Application(canvas, { renderMode: "manual" });
    await spline.start(sceneBuffer.slice(0), { interactive: false });
    if (disposed) return;
    spline.setBackgroundColor("#202124");

    const sceneObjects = spline.getAllObjects();
    const layers = OBJECT_ALIASES.map((aliases) => {
      const normalizedAliases = aliases.map(normalizeName);
      return sceneObjects.find((object: any) => normalizedAliases.includes(normalizeName(object.name)));
    });
    if (layers.some((layer) => !layer)) {
      throw new Error("No se encontraron todas las capas del modelo MyPerol.");
    }

    const center = layers.reduce(
      (result, layer) => ({
        x: result.x + layer.position.x / layers.length,
        y: result.y + layer.position.y / layers.length,
        z: result.z + layer.position.z / layers.length,
      }),
      { x: 0, y: 0, z: 0 }
    );
    const origins = layers.map((layer) => ({
      position: { x: layer.position.x, y: layer.position.y, z: layer.position.z },
      rotation: { x: layer.rotation.x, y: layer.rotation.y, z: layer.rotation.z },
      scale: { x: layer.scale.x, y: layer.scale.y, z: layer.scale.z },
    }));

    const syncSize = () => {
      if (!spline || disposed || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const pixelBudgetRatio = Math.sqrt(MAX_RENDER_PIXELS / (cssWidth * cssHeight));
      const targetPixelRatio = Math.min(
        Math.max(1, window.devicePixelRatio || 1),
        MAX_PIXEL_RATIO,
        pixelBudgetRatio
      );
      const runtimePixelRatio = Math.max(1, canvas.width / Math.max(1, cssWidth));
      spline.setSize(
        Math.max(1, Math.round(cssWidth * targetPixelRatio / runtimePixelRatio)),
        Math.max(1, Math.round(cssHeight * targetPixelRatio / runtimePixelRatio))
      );
      spline.requestRender();
    };

    const modelScale = canvas.clientWidth < 620 ? 0.82 : 1.08;
    const animationStart = performance.now();
    renderFrame = (time: number) => {
      if (disposed || document.hidden || !spline) return;

      const loopProgress = reducedMotion.matches
        ? 0.55
        : ((time - animationStart) % LOOP_DURATION) / LOOP_DURATION;
      const openProgress = easeInOut((1 - Math.cos(loopProgress * Math.PI * 2)) / 2);
      const rotationY = reducedMotion.matches ? 0 : Math.sin(loopProgress * Math.PI * 2) * 0.035;
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      layers.forEach((layer, index) => {
        const origin = origins[index];
        const relativeX = (origin.position.x - center.x) * modelScale;
        const relativeY = (origin.position.y - center.y) * modelScale;
        const relativeZ = (origin.position.z - center.z) * modelScale;

        layer.position.x = center.x + relativeX * cosY + relativeZ * sinY;
        layer.position.y = center.y + relativeY + index * LAYER_SEPARATION * openProgress;
        layer.position.z = center.z - relativeX * sinY + relativeZ * cosY;
        layer.rotation.x = origin.rotation.x;
        layer.rotation.y = origin.rotation.y + rotationY;
        layer.rotation.z = origin.rotation.z;
        layer.scale.x = origin.scale.x * modelScale;
        layer.scale.y = origin.scale.y * modelScale;
        layer.scale.z = origin.scale.z * modelScale;
      });

      spline.requestRender();
      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    syncSize();
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(modelHost || canvas);
    }
    canvas.classList.add("is-ready");
    modelHost?.classList.add("is-spline-ready");
    spline.play();
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", dispose, { once: true });
  void initialize().catch((error) => {
    if (!disposed && error?.name !== "AbortError") {
      console.error("No se pudo cargar la escena Spline de estimación.", error);
    }
  });

  return dispose;
}
