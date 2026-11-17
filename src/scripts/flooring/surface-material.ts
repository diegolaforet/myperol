import type { Layer, SPEObject } from "@splinetool/runtime";
import type { gsap } from "gsap";
import type { SystemVariant } from "./system-options";

const MINERAL_TEXTURE = "/assets/3d/mineral-finish.webp";
const hasAlpha = (layer: Layer): layer is Layer & { alpha: number } =>
  "alpha" in layer && typeof layer.alpha === "number";

export function createSurfaceMaterial(
  object: SPEObject,
  animate: typeof gsap,
  invalidate: () => void,
  reducedMotion: () => boolean,
  onSettled: (variant: SystemVariant, failed: boolean) => void,
) {
  const layers = object.material?.layers;
  const texture = layers?.find(layer => layer.type === "texture");
  const reflection = layers?.find(layer => layer.type === "matcap" && hasAlpha(layer));
  const light = layers?.find(layer => layer.type === "light" && layer.category === "phong");
  if (!texture || !reflection || !hasAlpha(reflection) || !light) {
    throw new Error("The exported main-layer material is incomplete");
  }
  const original = {
    texture: typeof texture.texture.image.data === "string"
      ? texture.texture.image.data : new Uint8Array(texture.texture.image.data),
    textureAlpha: texture.alpha,
    reflectionAlpha: reflection.alpha,
    shininess: light.shininess,
  };
  const abort = new AbortController();
  let mineral: Promise<Uint8Array> | undefined;
  let current: SystemVariant = "resin";
  let requested: SystemVariant = current;
  let disposed = false;
  let running = false;
  let tween: gsap.core.Tween | undefined;
  let finishTween: (() => void) | undefined;
  const details = { value: 1, shininess: original.shininess };
  const appearance = (variant: SystemVariant) => variant === "resin"
    ? { shininess: original.shininess }
    : { shininess: 2 };

  const applyDetails = () => {
    texture.alpha = original.textureAlpha * details.value;
    reflection.alpha = current === "resin" ? original.reflectionAlpha * details.value : 0;
    light.shininess = details.shininess;
    invalidate();
  };
  const fade = (value: number, variant: SystemVariant) => new Promise<void>(resolve => {
    finishTween = resolve;
    tween = animate.to(details, {
      value, ...appearance(variant), duration: reducedMotion() ? 0 : .18, ease: "sine.inOut",
      onUpdate: applyDetails,
      onComplete: () => { finishTween = undefined; resolve(); },
    });
  });
  const getMineral = () => mineral ||= fetch(MINERAL_TEXTURE, { signal: abort.signal })
    .then(response => {
      if (!response.ok) throw new Error(`Mineral texture: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(async buffer => {
      // The runtime's upload promise has no image-error handler. Validate first.
      const url = URL.createObjectURL(new Blob([buffer]));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return new Uint8Array(buffer);
      } finally {
        URL.revokeObjectURL(url);
      }
    })
    .catch(error => { mineral = undefined; throw error; });

  const run = async () => {
    running = true;
    try {
      while (!disposed && current !== requested) {
        // Serialize texture uploads: rapid clicks always resolve to the latest choice.
        const next = requested;
        const data = next === "mineral" ? await getMineral() : original.texture;
        if (disposed || current === next || next !== requested) continue;
        await fade(0, next);
        if (disposed) break;
        await texture.updateTexture(data);
        if (disposed) break;
        current = next;
        await fade(1, current);
      }
      if (!disposed) onSettled(current, false);
    } catch (error) {
      if (disposed) return;
      console.warn("No se pudo cambiar el acabado de MP System.", error);
      // Keep the last complete appearance and let the existing selector retry.
      requested = current;
      details.value = 1;
      Object.assign(details, appearance(current));
      applyDetails();
      onSettled(current, true);
    } finally {
      running = false;
    }
  };
  return {
    select(variant: SystemVariant) {
      requested = variant;
      if (!running && !disposed) void run();
    },
    dispose() {
      disposed = true;
      abort.abort();
      tween?.kill();
      finishTween?.();
    },
  };
}
