import { searchResume, type ResumeSearchResult } from "../tools/resume-search.js";

/**
 * Passages pulled for the visitor's latest question before the model runs. The corpus
 * is small and quadrilingual, so a generous `topK` here almost always covers the
 * question in one shot — the agent's `search-resume` tool is left as a "look again"
 * fallback rather than the only path to grounding.
 */
const GROUNDING_TOP_K = 8;

export async function retrieveGrounding(query: string): Promise<ResumeSearchResult[]> {
  return searchResume({ query, topK: GROUNDING_TOP_K });
}

/**
 * A system message carrying the retrieved passages, injected via `agent.stream`'s
 * `context` option so it lands after the instructions and before the transcript.
 * Grounding no longer depends on the model deciding to call the search tool.
 */
export function groundingContextMessage(results: ResumeSearchResult[]): {
  role: "system";
  content: string;
} {
  const passages = results
    .map((result, index) => {
      const cite = `[${index + 1}] ${result.title} — ${result.source} (similarity ${result.score.toFixed(2)})`;
      return `${cite}\n${result.text}`;
    })
    .join("\n\n---\n\n");

  return {
    role: "system",
    content:
      "Passages retrieved from Oleksii's CV and personal notes for the visitor's latest " +
      "question. Treat these, not anything you recall from earlier in the conversation, as " +
      "the source of truth: ground every factual claim in them and quote numbers, dates and " +
      "job titles verbatim. If they do not answer the question, say so plainly rather than " +
      "guessing — you may also call search-resume once with different wording to look again." +
      `\n\n${passages}`,
  };
}

/** Distinct source titles, for the `sources` SSE frame the UI renders as citations. */
export function groundingSources(results: ResumeSearchResult[]): string[] {
  return [...new Set(results.map((result) => result.title))];
}
