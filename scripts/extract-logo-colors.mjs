// Extract dominant colors from a PNG logo by binning pixels into 16-step buckets,
// counting frequencies, and reporting the top N (excluding near-white/black/transparent).
// Usage: node scripts/extract-logo-colors.mjs <png-path> [topN]
import sharp from 'sharp';

const [, , pathArg, topNArg] = process.argv;
if (!pathArg) {
  console.error('usage: node scripts/extract-logo-colors.mjs <image-path> [topN]');
  process.exit(2);
}
const topN = Number(topNArg ?? 8);

// Sharp handles PNG/JPEG/WebP/AVIF transparently. Decoded as raw RGBA so a fixed
// 4-byte stride works regardless of the source format.
const { data, info } = await sharp(pathArg)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;

// 4-bit-per-channel bins → 4096 buckets total.
const counts = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue; // skip transparent
    // Skip near-white and near-black — they dominate logos but aren't brand colors.
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (min > 235) continue;
    if (max < 25) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}

const entries = [...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, topN);

const totalPixels = width * height;
console.log(`# ${pathArg}  (${width}x${height}, ${totalPixels} px)`);
console.log('rank  hex      count    %     rgb');
entries.forEach(([key, count], rank) => {
  const r = ((key >> 8) & 0xf) * 17;
  const g = ((key >> 4) & 0xf) * 17;
  const b = (key & 0xf) * 17;
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  const pct = ((count / totalPixels) * 100).toFixed(2);
  console.log(`${String(rank + 1).padStart(2)}.   ${hex}  ${String(count).padStart(7)}  ${pct.padStart(5)}%  rgb(${r},${g},${b})`);
});
