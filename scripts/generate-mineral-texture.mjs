import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Bake a seamless, low-contrast mineral grain once, never during scrolling.
const size = 1024;
const pixels = Buffer.alloc(size * size * 3);
const hash = (x, y) => {
  let value = Math.imul(x + 137, 374761393) ^ Math.imul(y + 619, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};
const smooth = value => value * value * (3 - 2 * value);
const noise = (x, y, frequency) => {
  const u = x * frequency / size;
  const v = y * frequency / size;
  const i = Math.floor(u), j = Math.floor(v);
  const a = smooth(u - i), b = smooth(v - j);
  const sample = (dx, dy) => hash((i + dx) % frequency, (j + dy) % frequency);
  const top = sample(0, 0) * (1 - a) + sample(1, 0) * a;
  const bottom = sample(0, 1) * (1 - a) + sample(1, 1) * a;
  return (top * (1 - b) + bottom * b) * 2 - 1;
};
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const tone = 164 + noise(x, y, 3) * 5 + noise(x, y, 11) * 2.5
      + noise(x, y, 47) + noise(x, y, 193) * .5 + (hash(x, y) - .5) * 1.5;
    const offset = (y * size + x) * 3;
    pixels[offset] = Math.round(tone);
    pixels[offset + 1] = Math.round(tone);
    pixels[offset + 2] = Math.round(tone - 1);
  }
}
await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
  .webp({ quality: 92 })
  .toFile(fileURLToPath(new URL("../public/assets/3d/mineral-finish.webp", import.meta.url)));
