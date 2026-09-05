import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MDocument } from "@mastra/rag";
import { z } from "zod";

/** `knowledge/` sits at the package root, two levels up from `src/rag/`. */
const KNOWLEDGE_DIR = fileURLToPath(new URL("../../knowledge", import.meta.url));

/** Chunks longer than this are split further; roughly 250 tokens. */
const MAX_CHUNK_SIZE = 1024;
/** Sections shorter than this are merged into the next one instead of standing alone. */
const MIN_CHUNK_SIZE = 120;

/**
 * Metadata stored alongside every vector. `text` is what the agent actually reads back,
 * `source`/`title` are what it cites, and `documentId` identifies the file it came from.
 */
export const chunkMetadataSchema = z.object({
  text: z.string().min(1),
  documentId: z.string().min(1),
  source: z.string().min(1),
  title: z.string().min(1),
  /** Heading breadcrumb, e.g. "Experience > Datasport Germany GmbH". */
  heading: z.string(),
});

export type ChunkMetadata = z.infer<typeof chunkMetadataSchema>;

interface Section {
  /** Breadcrumb of enclosing headings, outermost first. */
  path: string[];
  body: string;
}

/**
 * Splits markdown into sections at headings, keeping the heading breadcrumb for each.
 *
 * This is hand-rolled rather than using `MDocument.chunk({ strategy: 'markdown' })`
 * because that strategy in @mastra/rag@2.6.0 rewrites every `##`/`###` in the output as
 * the literal string `#{1,6}` — its own splitting regex leaking into the text. Embedding
 * that corrupts retrieval, and the agent would quote it back to visitors verbatim.
 */
function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];

  // Heading text indexed by depth, so a breadcrumb can be rebuilt at any point.
  const stack: string[] = [];
  let path: string[] = [];
  let body: string[] = [];

  const flush = () => {
    const text = body.join("\n").trim();
    if (text.length > 0) sections.push({ path: [...path], body: text });
    body = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);

    if (!heading) {
      body.push(line);
      continue;
    }

    flush();

    const depth = heading[1]!.length;
    stack.length = depth - 1;
    stack[depth - 1] = heading[2]!;
    path = stack.filter((entry): entry is string => typeof entry === "string");
  }

  flush();

  return sections;
}

/** Merges runs of very short sections so single-line headings do not become their own vector. */
function mergeTinySections(sections: Section[]): Section[] {
  const merged: Section[] = [];

  for (const section of sections) {
    const previous = merged.at(-1);

    if (
      previous &&
      previous.body.length < MIN_CHUNK_SIZE &&
      previous.body.length + section.body.length <= MAX_CHUNK_SIZE
    ) {
      // The merged chunk keeps the earlier section's breadcrumb, so carry the absorbed
      // section's own heading into the body — otherwise "Books" silently disappears
      // into the "Boxing" chunk and can never be matched by name.
      const leaf = section.path.at(-1);
      previous.body = `${previous.body}\n\n${leaf ? `${leaf}\n\n` : ""}${section.body}`;
      continue;
    }

    merged.push({ ...section });
  }

  return merged;
}

/** First markdown H1 in the file, falling back to the filename. */
function extractTitle(markdown: string, fallback: string): string {
  const heading = /^#\s+(.+)$/m.exec(markdown);
  return heading?.[1]?.trim() || fallback;
}

/**
 * Splits an oversized section on paragraph/sentence boundaries. `recursive` is safe
 * here — unlike `markdown`, it returns the text unmodified.
 */
async function splitLongBody(body: string): Promise<string[]> {
  const parts = await MDocument.fromText(body).chunk({
    strategy: "recursive",
    maxSize: MAX_CHUNK_SIZE,
    overlap: 128,
  });

  return parts.map((part) => part.text.trim()).filter((text) => text.length > 0);
}

export async function loadKnowledgeChunks(): Promise<ChunkMetadata[]> {
  const entries = await readdir(KNOWLEDGE_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    // `*.example.md` are the tracked templates; the real content is operator-supplied
    // and gitignored (see knowledge/.gitignore). Never embed the placeholders.
    .filter((entry) => !entry.name.endsWith(".example.md"))
    .map((entry) => entry.name)
    // Sorted so chunk ids stay stable across ingests regardless of readdir order.
    .toSorted();

  if (files.length === 0) {
    throw new Error(
      `No knowledge files in ${KNOWLEDGE_DIR}. Copy cv.example.md -> cv.md (and ` +
        `personal.example.md -> personal.md) and fill them in — they are gitignored.`,
    );
  }

  const chunks: ChunkMetadata[] = [];

  for (const file of files) {
    const raw = await readFile(join(KNOWLEDGE_DIR, file), "utf8");
    const documentId = basename(file, ".md");
    const title = extractTitle(raw, documentId);

    for (const section of mergeTinySections(splitIntoSections(raw))) {
      const heading = section.path.join(" > ");
      const bodies =
        section.body.length > MAX_CHUNK_SIZE ? await splitLongBody(section.body) : [section.body];

      for (const body of bodies) {
        chunks.push({
          // The breadcrumb is embedded with the body so a chunk deep inside "Experience"
          // still matches "where did he work in 2023?" — the dates live in the body but
          // the employer name only in the heading.
          text: heading ? `${heading}\n\n${body}` : body,
          documentId,
          source: file,
          title,
          heading,
        });
      }
    }
  }

  return chunks;
}
