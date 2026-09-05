import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps a scroll container pinned to the bottom as `dep` changes (new message, streamed
 * token) — but only while the user is already near the bottom. Scroll up to read earlier
 * turns and it stops fighting you; scroll back down and it re-pins.
 *
 * `enabled` is how the phone layout opts out: there the transcript follows
 * `useComposeScroll` instead, which anchors the question at the top rather than chasing
 * the bottom. Two hooks fighting over one scrollTop would be a jitter machine.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, dep: unknown, enabled = true) {
  const pinnedRef = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedRef.current = distanceFromBottom < 80;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [ref, dep, enabled]);
}
