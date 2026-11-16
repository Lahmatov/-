// Shared by serve-web.mjs and serve-native.mjs: brings up the API server for e2e runs and makes sure the
// test reader account exists.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = path.resolve(mobileDir, "..");

const children = [];

export function log(message) {
  console.log(`[e2e] ${message}`);
}

/** Starts a child process that is stopped when this process exits or is signalled. */
export function startChild(executable, args, options) {
  const child = spawn(executable, args, { stdio: "inherit", ...options });
  children.push(child);
  return child;
}

function stopChildren() {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopChildren();
    process.exit(0);
  });
}
process.on("exit", stopChildren);

export function fail(error) {
  console.error(`[e2e] ${error instanceof Error ? error.message : error}`);
  stopChildren();
  process.exit(1);
}

async function apiAnswers(apiUrl) {
  try {
    const response = await fetch(new URL("/api/v1/genres", apiUrl), { signal: AbortSignal.timeout(2000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Uses the API at apiUrl when it answers; otherwise starts `next start` from the repository root on its port
 * (needs `npm run build` at the root, Postgres and Redis; Next.js reads the root .env) and stops it on exit.
 * It listens on apiUrl's host only, unless allInterfaces (a simulator may resolve localhost to ::1).
 */
export async function ensureApi(apiUrl, { allInterfaces = false } = {}) {
  if (await apiAnswers(apiUrl)) {
    log(`API already running at ${apiUrl.origin}`);
    return;
  }
  if (!existsSync(path.join(repoRoot, ".next", "BUILD_ID"))) {
    throw new Error("No API build: run `npm ci && npm run build` in the repository root first");
  }
  log(`starting API: next start -p ${apiUrl.port}`);
  const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
  const host = allInterfaces ? [] : ["-H", apiUrl.hostname];
  const child = startChild(process.execPath, [nextBin, "start", ...host, "-p", apiUrl.port], { cwd: repoRoot, env: process.env });
  for (let i = 0; i < 120; i++) {
    if (await apiAnswers(apiUrl)) return;
    if (child.exitCode !== null) throw new Error("API process exited before it became ready");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("API did not become ready within 60 s");
}

/**
 * The tests sign in as one reader account (credentials.reader in the e2e config). Log in with it; if the
 * account does not exist yet, register it. Only the first run against a database registers.
 */
export async function ensureReader(apiUrl) {
  const email = process.env.E2E_READER_EMAIL;
  const password = process.env.E2E_READER_PASSWORD;
  if (!email || !password) throw new Error("E2E_READER_EMAIL and E2E_READER_PASSWORD must be set (e2e config passes them)");
  const post = (route, body) =>
    fetch(new URL(`/api/v1/auth/${route}`, apiUrl), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const login = await post("login", { email, password });
  if (login.ok) return log(`reader account ${email} is ready`);
  if (login.status !== 401) throw new Error(`reader login failed: HTTP ${login.status} ${await login.text()}`);
  const register = await post("register", { name: "E2E Reader", email, password });
  if (!register.ok) throw new Error(`reader registration failed: HTTP ${register.status} ${await register.text()}`);
  log(`registered reader account ${email}`);
}
