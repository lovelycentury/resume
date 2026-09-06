#!/usr/bin/env node
// oxlint-disable no-console
/**
 * Rebuilds the deployed vector index over an SSH tunnel.
 *
 *   node tools/ingest-remote.mjs
 *
 * The libSQL holding the index is published on the VPS loopback only (see
 * ops/docker-compose.yml), and the runtime image carries neither the sources nor
 * `knowledge/*.md` — so ingest always runs from outside and reaches in through a
 * forwarded port. This opens that tunnel, runs the ingest against it, verifies the
 * site sees the result, and tears the tunnel down again on any exit path.
 *
 * Used by .github/workflows/ingest.yml after tools/fetch-knowledge.mjs has
 * downloaded the markdown; equally runnable from a laptop that has its own copy of
 * `be/knowledge/`.
 *
 * Environment:
 *   VPS_HOST / VPS_USER   required — the same server the deploy workflow targets
 *   VPS_SSH_KEY           optional — a private key in PEM form. Given, it is written
 *                         to a temp file and the host key is pinned from a fresh
 *                         `ssh-keyscan`; omitted, ssh falls back to the ambient
 *                         agent/config, which is what a laptop usually wants.
 *   API_BASE_URL          optional — public backend origin; when set, `/status` is
 *                         polled afterwards so the run fails if the index is empty
 *   TUNNEL_PORT           optional — local end of the forward (default 8080)
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

/** libSQL's port on the server, as bound in ops/docker-compose.yml. */
const REMOTE_PORT = 8080;
/** How long the forward gets to start accepting connections. */
const TUNNEL_TIMEOUT_MS = 20_000;
const PROBE_INTERVAL_MS = 300;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is not set.`);
  return value;
}

/** Resolves once something is listening on the local end of the forward. */
function probe(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    const settle = (open) => {
      socket.destroy();
      resolve(open);
    };

    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
    socket.setTimeout(1000, () => settle(false));
  });
}

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.once("error", (error) => fail(`${command}: ${error.message}`));
    child.once("close", (code) => resolve(code ?? 1));
  });
}

/**
 * Writes the key and a pinned host key into a private temp dir.
 *
 * `ssh-keyscan` is trust-on-first-use, but the alternative on a fresh runner is
 * `StrictHostKeyChecking=no`, which accepts any key at all — this at least pins one
 * for the duration of the run.
 */
async function prepareKey(host, key) {
  const dir = await mkdtemp(join(tmpdir(), "resume-ingest-"));
  const keyPath = join(dir, "id");
  const knownHosts = join(dir, "known_hosts");

  await writeFile(keyPath, key.endsWith("\n") ? key : `${key}\n`, { mode: 0o600 });

  const scan = spawnSync("ssh-keyscan", ["-H", host], { encoding: "utf8" });
  if (scan.status !== 0 || !scan.stdout.trim()) {
    await rm(dir, { recursive: true, force: true });
    fail(`ssh-keyscan found no host key for ${host}.`);
  }
  await writeFile(knownHosts, scan.stdout, { mode: 0o600 });

  return { dir, keyPath, knownHosts };
}

async function openTunnel({ host, user, port, credentials }) {
  const args = ["-N", "-o", "ExitOnForwardFailure=yes", "-o", "BatchMode=yes"];

  if (credentials) {
    args.push(
      "-i",
      credentials.keyPath,
      "-o",
      "IdentitiesOnly=yes",
      "-o",
      `UserKnownHostsFile=${credentials.knownHosts}`,
      "-o",
      "StrictHostKeyChecking=yes",
    );
  }

  args.push("-L", `${port}:127.0.0.1:${REMOTE_PORT}`, `${user}@${host}`);

  const child = spawn("ssh", args, { stdio: ["ignore", "inherit", "inherit"] });
  let exited = false;
  child.once("error", (error) => fail(`ssh: ${error.message}`));
  child.once("exit", () => {
    exited = true;
  });

  const deadline = Date.now() + TUNNEL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // A refused forward or a rejected key kills ssh outright, so there is no point
    // waiting out the timeout.
    if (exited) fail("The SSH tunnel exited before the forward came up.");
    if (await probe(port)) return child;
    await sleep(PROBE_INTERVAL_MS);
  }

  child.kill();
  fail(`Nothing accepted connections on 127.0.0.1:${port} within ${TUNNEL_TIMEOUT_MS}ms.`);
}

async function checkStatus(baseUrl) {
  const url = `${baseUrl.replace(/\/+$/, "")}/status`;
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.knowledgeBase !== "ready") {
    fail(`${url} → ${response.status} ${JSON.stringify(body)}`);
  }

  console.log(`Site sees ${body.vectors} vectors.`);
}

const host = requireEnv("VPS_HOST");
const user = requireEnv("VPS_USER");
const port = Number(process.env.TUNNEL_PORT ?? REMOTE_PORT);
const sshKey = process.env.VPS_SSH_KEY?.trim();

const credentials = sshKey ? await prepareKey(host, sshKey) : undefined;
let tunnel;

try {
  console.log(`Forwarding 127.0.0.1:${port} → ${host}:${REMOTE_PORT}…`);
  tunnel = await openTunnel({ host, user, port, credentials });

  const code = await run("pnpm", ["--filter", "@okkly/resume-be", "ingest"], {
    VECTOR_DB_URL: `http://127.0.0.1:${port}`,
  });
  if (code !== 0) fail(`Ingest exited with ${code}.`);

  if (process.env.API_BASE_URL) await checkStatus(process.env.API_BASE_URL);
} finally {
  tunnel?.kill();
  if (credentials) await rm(credentials.dir, { recursive: true, force: true });
}
