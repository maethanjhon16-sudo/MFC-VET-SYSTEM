// Downloads every Figma icon listed in icons.manifest.json into src/assets/icons.
// Run once:  npm run icons
// The Figma URLs are temporary, so the app only ever imports the local files.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'src', 'assets', 'icons');
const manifest = JSON.parse(await readFile(join(here, 'icons.manifest.json'), 'utf8'));

await mkdir(outDir, { recursive: true });

let failed = 0;
for (const [name, url] of Object.entries(manifest)) {
  if (name.startsWith('_')) continue;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    if (!svg.includes('<svg')) throw new Error('response is not an SVG');
    await writeFile(join(outDir, `${name}.svg`), svg);
    console.log(`✓ ${name}.svg`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} icon(s) failed. The Figma URLs may have expired — see icons.manifest.json.`);
  process.exit(1);
}
