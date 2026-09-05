import { useEffect, useState } from "react";

/** Matches the layout breakpoint where the shell stacks (see App.module.scss). */
const PHONE_QUERY = "(max-width: 900px)";

/**
 * Live answer to "is this the stacked, one-column layout?", for behaviour that CSS cannot
 * express — here, which of the two scroll strategies the transcript follows.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(media.matches);

    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}
