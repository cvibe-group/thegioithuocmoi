import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public/images/thegioithuocmoi");

const assets = [
  "https://thegioithuocmoi.com/wp-content/uploads/2025/02/TGTM-Final-06-750x254.png",
  "https://thegioithuocmoi.com/wp-content/uploads/2025/02/TGTM-Final-tran-150x150.png",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1357-217x300.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1351-300x257.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1350-300x242.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1305-1-300x206.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/08/IMG_3228-300x295.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3645-300x300.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/03/IMG_0378-209x300.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2025/06/Tablets-300x293.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3704-300x296.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3668-290x300.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3766-300x297.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3673-300x298.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/05/IMG_3202-297x300.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/11/IMG_0212-300x290.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/03/IMG_2778-1-300x294.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_0197-300x279.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3751-300x295.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3752-300x292.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3753-300x293.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/10/IMG_3754-300x296.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2023/05/IMG_2813-1-300x294.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1347-300x165.jpeg",
  "https://thegioithuocmoi.com/wp-content/uploads/2026/07/IMG_1270-300x161.jpeg",
];

function filenameFromUrl(url) {
  return url.split("/").pop();
}

async function download(url) {
  const filename = filenameFromUrl(url);
  const dest = join(outDir, filename);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(outDir, { recursive: true });
  await writeFile(dest, buf);
  return { url, dest: `/images/thegioithuocmoi/${filename}` };
}

async function runBatch(items, concurrency = 4) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(download));
    results.push(...batchResults);
  }
  return results;
}

const results = await runBatch(assets);
const manifest = {};
for (const r of results) {
  if (r.status === "fulfilled") {
    manifest[r.value.url] = r.value.dest;
    console.log(`✓ ${r.value.dest}`);
  } else {
    console.error(`✗ ${r.reason}`);
  }
}

await writeFile(
  join(root, "public/images/thegioithuocmoi/manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(`Downloaded ${Object.keys(manifest).length}/${assets.length} assets`);
