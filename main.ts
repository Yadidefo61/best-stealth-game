// main.ts — hand-in program for the Moonlit Vault stealth game entry.
// Copies game/ and screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output)
// and writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22, standard library only. Deterministic: two runs write identical bytes.
import { cp, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// Caps from the competition's gate: dossier at most 1.5 MiB, its source text
// at most 160 KiB, at most 4 screenshots of at most 256 KiB each.
const CAPS = {
  text_max_bytes: 163840,
  dossier_max_bytes: 1572864,
  screenshots: { max: 4, max_bytes: 262144 },
};

async function main() {
  await mkdir(outDir, { recursive: true });
  await cp(join(here, "game"), join(outDir, "game"), { recursive: true });
  await cp(join(here, "screenshots"), join(outDir, "screenshots"), { recursive: true });
  const dossier = await buildDossier(here, CAPS);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(outDir, "dossier.json"), dossier, "utf8");
}

await main();
