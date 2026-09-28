import type { Application } from "@splinetool/runtime";
import { loadFlooringResources } from "./spline/resources";
import { observeSceneVisibility } from "./spline/visibility";
import { getScenePixelRatio } from "./spline/resolution";

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

export const preloadCalculatorEstimateSpline = () => loadFlooringResources().then(() => undefined);

export function mountCalculatorEstimateSpline(canvas: HTMLCanvasElement) {
  let disposed = false;
  let spline: Application | undefined;
  let initializing = false;
  let ready = false;
  let visible = false;
  let animationFrame = 0;
  let idleTimer = 0;
  let lastDraw = -Infinity;
  let settlingFrames = 0;
  const frameInterval = 1000 / 60;
  let resizeObserver: ResizeObserver | undefined;
  let bufferObserver: MutationObserver | undefined;
  let sizeFrame = 0;
  const modelHost = canvas.closest<HTMLElement>("[data-price-estimate-model]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileRenderer = window.matchMedia("(pointer: coarse)");

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(idleTimer);
    window.cancelAnimationFrame(sizeFrame);
    resizeObserver?.disconnect();
    bufferObserver?.disconnect();
    visibility.dispose();
    reducedMotion.removeEventListener("change", updatePlayback);
    window.removeEventListener("pagehide", handlePageHide);
    // start() can still be decoding; release its resources after it settles.
    spline?.stop();
    if (!initializing) {
      spline?.dispose();
      spline = undefined;
    }
    canvas.classList.remove("is-ready");
    modelHost?.classList.remove("is-spline-ready");
  };

  const pause = () => {
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(idleTimer);
    animationFrame = 0;
    spline?.stop();
  };
  const updatePlayback = () => {
    if (disposed || !ready || !spline) return;
    if (!visible || document.hidden) return pause();
    window.clearTimeout(idleTimer);
    // Let temporal effects settle before sleeping on a reduced-motion still.
    settlingFrames = 3;
    if (!animationFrame) animationFrame = window.requestAnimationFrame(renderFrame);
  };
  const handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted) pause();
    else dispose();
  };
  const visibility = observeSceneVisibility(canvas, next => {
    visible = next;
    updatePlayback();
  });

  let renderFrame: (time: number) => void = () => {};

  const initialize = async () => {
    await visibility.whenVisible();
    const [runtimeModule, sceneBuffer] = await loadFlooringResources();
    await visibility.whenVisible();
    if (disposed) return;

    spline = new runtimeModule.Application(canvas, { renderMode: "manual" });
    initializing = true;
    try {
      await spline.start(sceneBuffer.slice(0), { interactive: false });
    } finally {
      initializing = false;
      if (disposed) {
        spline.dispose();
        spline = undefined;
      }
    }
    if (disposed || !spline) return;
    spline.stop();
    spline.setBackgroundColor("#202124");

    const sceneObjects = spline.getAllObjects();
    const layers = OBJECT_ALIASES.map((aliases) => {
      const normalizedAliases = aliases.map(normalizeName);
      const layer = sceneObjects.find(object => normalizedAliases.includes(normalizeName(object.name)));
      if (!layer) throw new Error(`No se encontro la capa Spline: ${aliases[0]}.`);
      return layer;
    });

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

    // Preserve the export's actual resolution instead of repeatedly rescaling it.
    const runtimePixelRatio = Math.max(1, canvas.width / Math.max(1, canvas.clientWidth));
    let renderWidth = 0;
    let renderHeight = 0;
    let expectedBufferWidth = 0;
    let expectedBufferHeight = 0;
    const bufferMatches = () =>
      Math.abs(canvas.width - expectedBufferWidth) <= 1 &&
      Math.abs(canvas.height - expectedBufferHeight) <= 1;
    const syncSize = () => {
      sizeFrame = 0;
      if (!spline || disposed || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const scale = getScenePixelRatio(cssWidth, cssHeight, mobileRenderer.matches) / runtimePixelRatio;
      const nextWidth = Math.max(1, Math.round(cssWidth * scale));
      const nextHeight = Math.max(1, Math.round(cssHeight * scale));
      expectedBufferWidth = Math.floor(nextWidth * runtimePixelRatio);
      expectedBufferHeight = Math.floor(nextHeight * runtimePixelRatio);
      if (nextWidth === renderWidth && nextHeight === renderHeight && bufferMatches()) return;
      renderWidth = nextWidth;
      renderHeight = nextHeight;
      spline.setSize(renderWidth, renderHeight);
      // Invalidate Spline's logical-size cache if only the buffer was reset.
      if (!bufferMatches()) {
        spline.setSize(renderWidth + 1, renderHeight);
        spline.setSize(renderWidth, renderHeight);
      }
      updatePlayback();
    };
    const scheduleSize = () => {
      if (!sizeFrame && !disposed) sizeFrame = window.requestAnimationFrame(syncSize);
    };

    const modelScale = canvas.clientWidth < 620 ? 0.82 : 1.08;
    const relativeOrigins = origins.map(origin => ({
      x: (origin.position.x - center.x) * modelScale,
      y: (origin.position.y - center.y) * modelScale,
      z: (origin.position.z - center.z) * modelScale,
    }));
    layers.forEach((layer, index) => {
      const origin = origins[index];
      layer.rotation.x = origin.rotation.x;
      layer.rotation.z = origin.rotation.z;
      layer.scale.x = origin.scale.x * modelScale;
      layer.scale.y = origin.scale.y * modelScale;
      layer.scale.z = origin.scale.z * modelScale;
    });
    const animationStart = performance.now();
    renderFrame = (time: number) => {
      animationFrame = 0;
      if (disposed || document.hidden || !visible || !spline) return;
      if (time - lastDraw < frameInterval - 0.5) {
        animationFrame = window.requestAnimationFrame(renderFrame);
        return;
      }
      lastDraw = time - lastDraw >= frameInterval * 2 ? time : lastDraw + frameInterval;

      const loopProgress = reducedMotion.matches
        ? 0.55
        : ((time - animationStart) % LOOP_DURATION) / LOOP_DURATION;
      const openProgress = easeInOut((1 - Math.cos(loopProgress * Math.PI * 2)) / 2);
      const rotationY = reducedMotion.matches ? 0 : Math.sin(loopProgress * Math.PI * 2) * 0.035;
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      layers.forEach((layer, index) => {
        const origin = origins[index];
        const { x: relativeX, y: relativeY, z: relativeZ } = relativeOrigins[index];

        layer.position.x = center.x + relativeX * cosY + relativeZ * sinY;
        layer.position.y = center.y + relativeY + index * LAYER_SEPARATION * openProgress;
        layer.position.z = center.z - relativeX * sinY + relativeZ * cosY;
        layer.rotation.y = origin.rotation.y + rotationY;
      });

      spline.play();
      spline.requestRender();
      if (reducedMotion.matches && --settlingFrames <= 0) {
        idleTimer = window.setTimeout(() => spline?.stop(), 120);
      } else {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    syncSize();
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(scheduleSize);
      resizeObserver.observe(modelHost || canvas);
    }
    bufferObserver = new MutationObserver(() => {
      if (!bufferMatches()) scheduleSize();
    });
    bufferObserver.observe(canvas, { attributes: true, attributeFilter: ["width", "height"] });
    canvas.classList.add("is-ready");
    modelHost?.classList.add("is-spline-ready");
    ready = true;
    updatePlayback();
  };

  reducedMotion.addEventListener("change", updatePlayback);
  window.addEventListener("pagehide", handlePageHide);
  void initialize().catch((error) => {
    if (!disposed && error?.name !== "AbortError") {
      console.error("No se pudo cargar la escena Spline de estimación.", error);
    }
    dispose();
  });

  return dispose;
}
