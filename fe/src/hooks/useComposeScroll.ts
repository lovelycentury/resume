import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

import type { ChatMessage } from "../state/types.js";

/** Breathing room left above the pinned question. */
const TOP_INSET = 8;

interface Options {
  scrollRef: RefObject<HTMLElement | null>;
  /** The transcript list — measured without the spacer, which is its sibling. */
  listRef: RefObject<HTMLElement | null>;
  messages: ChatMessage[];
  enabled: boolean;
}

/**
 * The phone reading pattern: sending a message lifts that question to the top of the
 * screen and leaves it there while the answer forms underneath it.
 *
 * Two parts make it work. Scrolling the question to the top is only possible if there is
 * something below it to scroll *into*, so a spacer is rendered after the transcript,
 * sized to whatever the last turn does not already fill. And once the question is up
 * there, nothing re-pins to the bottom — an answer that grows under a still question
 * reads far better on a small screen than a wall of text that keeps yanking itself up.
 *
 * The spacer's size follows from that one requirement: it must be tall enough for
 * `scrollTop == anchorTop` to remain a legal scroll position, which is exactly
 * `viewport - (contentBottom - anchorTop)`. So it shrinks by itself as the answer grows
 * and reaches zero the moment the answer alone fills the screen — no timers, no cleanup
 * pass, and never a downward jump from over-shrinking.
 *
 * Returns the spacer's height in px; the caller renders it after the transcript.
 */
export function useComposeScroll({ scrollRef, listRef, messages, enabled }: Options): number {
  const [spacerHeight, setSpacerHeight] = useState(0);
  const lastUserIdRef = useRef<string | null>(null);
  const pendingScrollRef = useRef(false);

  const lastUserId = messages.findLast((m) => m.role === "user")?.id ?? null;
  // Streamed text arrives as a new `text` on the same message, so the length is what marks
  // the answer growing.
  const streamedLength = messages.at(-1)?.text.length ?? 0;

  /** Where the anchored question sits inside the scrolled content. */
  const measure = useCallback(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    const anchor = scroller?.querySelector<HTMLElement>("[data-anchor]");
    if (!scroller || !list || !anchor) return null;

    const top = scroller.getBoundingClientRect().top - scroller.scrollTop;
    return {
      scroller,
      anchorTop: anchor.getBoundingClientRect().top - top,
      contentBottom: list.getBoundingClientRect().bottom - top,
    };
  }, [scrollRef, listRef]);

  useLayoutEffect(() => {
    if (!enabled) {
      // Leaving the phone layout must not strand a gap under the last answer.
      lastUserIdRef.current = null;
      setSpacerHeight(0);
      return;
    }

    const m = measure();
    if (!m) return;

    const { scroller, anchorTop, contentBottom } = m;
    const needed = scroller.clientHeight - (contentBottom - anchorTop) - TOP_INSET;
    // Never shrink below what the *current* scroll position needs, or the browser clamps
    // scrollTop and the content jumps up under the reader.
    const floor = scroller.scrollTop + scroller.clientHeight - contentBottom;

    setSpacerHeight(Math.max(0, needed, floor));

    if (lastUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = lastUserId;
      // The scroll waits for the spacer to be laid out — see the effect below.
      pendingScrollRef.current = true;
    }
  }, [enabled, measure, lastUserId, streamedLength]);

  useLayoutEffect(() => {
    if (!pendingScrollRef.current) return;

    const m = measure();
    if (!m) return;

    pendingScrollRef.current = false;
    m.scroller.scrollTo({ top: Math.max(0, m.anchorTop - TOP_INSET), behavior: "smooth" });
  }, [measure, spacerHeight]);

  return enabled ? spacerHeight : 0;
}
