import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";

const directory = new URL("../public/assets/videos/", import.meta.url);
const source = fileURLToPath(new URL("../source-assets/videos/videointro_hero.mov", import.meta.url));
const run = args => {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.status}`);
};
for (const height of [720, 1080]) {
  const output = new URL(`hero-${height}.mp4`, directory);
  run(["-i", source, "-map", "0:v:0", "-an", "-vf", `scale=-2:${height}`, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", fileURLToPath(output)]);
  console.log(`${height}p: ${(await stat(output)).size} bytes`);
}
run(["-i", source, "-frames:v", "1", "-vf", "scale=-2:1080", "-c:v", "libwebp", "-quality", "86", fileURLToPath(new URL("hero-poster.webp", directory))]);
