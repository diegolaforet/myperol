import sharp from "sharp";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../public/assets/card-images/services/", import.meta.url);
let originalBytes = 0;
let optimizedBytes = 0;
for (const name of ["home", "garaje", "local", "industria", "outdoor"]) {
  const source = new URL(`${name}-card.png`, directory);
  const output = new URL(`${name}-card.webp`, directory);
  await sharp(fileURLToPath(source))
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(fileURLToPath(output));
  originalBytes += (await stat(source)).size;
  optimizedBytes += (await stat(output)).size;
}
console.log(JSON.stringify({ originalBytes, optimizedBytes, reduction: 1 - optimizedBytes / originalBytes }));

const logos = new URL("../public/assets/logo/", import.meta.url);
for (const [name, width] of [["logo-myperol-gota", 160], ["logo-blanco", 512]]) {
  const output = new URL(`${name}.webp`, logos);
  await sharp(fileURLToPath(new URL(`${name}.png`, logos)))
    .resize({ width, withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(fileURLToPath(output));
  console.log(`${name}: ${(await stat(output)).size} bytes`);
}
