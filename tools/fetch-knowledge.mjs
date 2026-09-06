#!/usr/bin/env node
// oxlint-disable no-console
/**
 * Downloads the knowledge base from WebDAV into `be/knowledge/`.
 *
 *   node tools/fetch-knowledge.mjs cv.md personal.md
 *
 * The real `knowledge/*.md` is private, operator-supplied input — gitignored and
 * never baked into an image (see be/knowledge/.gitignore). The deployed site keeps
 * the canonical copy on WebDAV instead, and this is what pulls it down before an
 * ingest, on a CI runner or on a laptop.
 *
 * Environment:
 *   WEBDAV_BASE_URL   required — directory holding the files, e.g.
 *                     https://webdav.example.dev/knowledge/resume
 *   WEBDAV_USER       optional — Basic auth; omit both if the host needs none
 *   WEBDAV_PASSWORD   optional
 *   KNOWLEDGE_FILES   fallback for the file names when none are passed as
 *                     arguments (space- or comma-separated). The workflow uses
 *                     this so a dispatch input never reaches a shell.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const KNOWLEDGE_DIR = fileURLToPath(new URL("../be/knowledge", import.meta.url));

/** Enough of the file to tell markdown from an error page. */
const SNIFF_LENGTH = 512;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function resolveFiles() {
  const raw = process.argv.slice(2);
  const names = (raw.length > 0 ? raw : (process.env.KNOWLEDGE_FILES ?? "").split(/[\s,]+/))
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    fail("No file names. Pass them as arguments or set KNOWLEDGE_FILES.");
  }

  for (const name of names) {
    // These land in a path and are fetched from a URL, so anything but a plain
    // file name is refused rather than escaped.
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      fail(`Refusing "${name}" — plain file names only.`);
    }
    if (!name.endsWith(".md")) {
      fail(`Refusing "${name}" — ingest only reads *.md.`);
    }
  }

  return names;
}

function authHeaders() {
  const user = process.env.WEBDAV_USER;
  const password = process.env.WEBDAV_PASSWORD ?? "";

  if (!user) return {};

  return { authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}` };
}

/**
 * A WebDAV host that answers an unknown path with a 200 and a login or error page
 * would otherwise get embedded as if it were the CV, and the agent would quote it
 * back to visitors as fact. Cheaper to refuse here than to notice in production.
 */
function assertLooksLikeMarkdown(name, text) {
  if (text.trim().length === 0) fail(`${name} came back empty.`);

  if (/<!doctype html|<html[\s>]/i.test(text.slice(0, SNIFF_LENGTH))) {
    fail(`${name} looks like an HTML page, not markdown.`);
  }
}

async function download(baseUrl, name, headers) {
  const url = `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(name)}`;
  const response = await fetch(url, { headers, redirect: "follow" });

  if (!response.ok) {
    fail(`${name} — ${response.status} ${response.statusText} from ${url}`);
  }

  const text = await response.text();
  assertLooksLikeMarkdown(name, text);

  await writeFile(join(KNOWLEDGE_DIR, name), text, "utf8");
  console.log(`  ${name} — ${Buffer.byteLength(text)} bytes`);
}

const baseUrl = process.env.WEBDAV_BASE_URL;
if (!baseUrl) fail("WEBDAV_BASE_URL is not set.");

const files = resolveFiles();
const headers = authHeaders();

console.log(`Fetching ${files.length} file(s) from ${baseUrl}…`);
await mkdir(KNOWLEDGE_DIR, { recursive: true });

for (const name of files) {
  await download(baseUrl, name, headers);
}
