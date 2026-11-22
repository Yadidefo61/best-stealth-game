// serve.ts — tiny local play-test server for Moonlit Vault.
// Serves game/ at http://localhost:8080 with no build step.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, "game");
const PORT = 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    if (path.includes("..")) {
      res.writeHead(400);
      res.end("bad path");
      return;
    }
    const file = join(gameDir, path);
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`Moonlit Vault at http://localhost:${PORT}`);
});
