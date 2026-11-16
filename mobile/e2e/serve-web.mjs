#!/usr/bin/env node
// Serves the web build of the app (react-native-web) for e2e tests; e2e.config.ts starts it (app.command).
//
// 1. API: uses E2E_API_URL (default http://127.0.0.1:3100) or starts `next start` there, and makes sure the
//    reader account exists (api-server.mjs).
// 2. Builds dist-web/ with `expo export --platform web --dev`: a development bundle, so the app accepts an
//    http:// API address, pointed at this server's own origin, so the browser makes no cross-origin requests
//    and the API needs no CORS. E2E_SKIP_EXPORT=1 reuses an existing dist-web/.
// 3. Serves dist-web/ (index.html for client-side routes) and proxies /api/* to the API.
//
// Usage: node e2e/serve-web.mjs [port]   (default 8091)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { ensureApi, ensureReader, fail, log, mobileDir } from "./api-server.mjs";

const distDir = path.join(mobileDir, "dist-web");
const port = Number(process.argv[2] || 8091);
const origin = `http://127.0.0.1:${port}`;
const apiUrl = new URL(process.env.E2E_API_URL || "http://127.0.0.1:3100");

function exportWeb() {
  if (process.env.E2E_SKIP_EXPORT === "1" && existsSync(path.join(distDir, "index.html"))) {
    log("E2E_SKIP_EXPORT=1: reusing dist-web/");
    return;
  }
  log("expo export --platform web --dev");
  const expoCli = path.join(mobileDir, "node_modules", "expo", "bin", "cli");
  const result = spawnSync(process.execPath, [expoCli, "export", "--platform", "web", "--dev", "--output-dir", "dist-web"], {
    cwd: mobileDir,
    // EXPO_NO_BUNDLE_SPLITTING: a split development export names the chunks of all three _layout.tsx files
    // alike, so they overwrite each other and the signed-in screens fail to load.
    env: { ...process.env, API_BASE_URL: origin, EXPO_OFFLINE: "1", EXPO_NO_BUNDLE_SPLITTING: "1", CI: "1" },
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`expo export failed (${result.status ?? result.signal})`);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

function proxy(req, res) {
  const upstream = http.request(
    { hostname: apiUrl.hostname, port: apiUrl.port, path: req.url, method: req.method, headers: { ...req.headers, host: apiUrl.host } },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `API proxy: ${error.message}` }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, origin).pathname);
  let file = path.normalize(path.join(distDir, pathname));
  if (!file.startsWith(distDir)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(distDir, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}

// A development bundle connects to the Metro dev server's /hot and /message WebSockets and reloads the page
// while they fail. Accept those connections and keep them silent, so the page loads once.
function acceptSilentWebSocket(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.on("data", () => undefined);
  socket.on("error", () => undefined);
}

try {
  await ensureApi(apiUrl);
  await ensureReader(apiUrl);
  exportWeb();
} catch (error) {
  fail(error);
}

http
  .createServer((req, res) => (req.url?.startsWith("/api/") ? proxy(req, res) : serveStatic(req, res)))
  .on("upgrade", acceptSilentWebSocket)
  .listen(port, "127.0.0.1", () => log(`serving dist-web/ at ${origin}, /api → ${apiUrl.origin}`));
