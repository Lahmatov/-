#!/usr/bin/env node
// For the iOS / Android e2e targets (e2e.native.config.ts): brings up the API and the Metro dev server that a
// Debug build of the app loads its JavaScript from.
//
// A Debug build (__DEV__) talks to http://localhost:3000 when API_BASE_URL is empty (src/config.ts), so the API
// runs on port 3000 here (E2E_API_URL overrides). The iOS simulator shares the Mac's localhost; on an Android
// emulator run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` first.
//
// Usage: node e2e/serve-native.mjs [metro port]   (default 8081; ready when /status answers)

import path from "node:path";
import { ensureApi, ensureReader, fail, mobileDir, startChild } from "./api-server.mjs";

const metroPort = String(process.argv[2] || 8081);
const apiUrl = new URL(process.env.E2E_API_URL || "http://127.0.0.1:3000");

try {
  await ensureApi(apiUrl, { allInterfaces: true });
  await ensureReader(apiUrl);
} catch (error) {
  fail(error);
}

const expoCli = path.join(mobileDir, "node_modules", "expo", "bin", "cli");
const metro = startChild(process.execPath, [expoCli, "start", "--port", metroPort, "--localhost"], {
  cwd: mobileDir,
  env: { ...process.env, CI: "1", EXPO_OFFLINE: "1" },
});
metro.on("exit", (code, signal) => fail(`Metro exited (${code ?? signal})`));
