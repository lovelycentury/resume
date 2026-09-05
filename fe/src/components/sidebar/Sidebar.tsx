import { useTranslations } from "use-intl";
import { Avatar, Chip, Typography } from "@okkly/react";

import { AgentMark } from "../AgentMark.js";
import { CookieTrigger } from "../CookieConsent/index.js";
import { PROFILE, SIDEBAR_FOOTER, STARTER_KEYS } from "../../config/content.js";
import { useChatController } from "../../hooks/chat-context.js";
import styles from "./Sidebar.module.scss";

/**
 * There is no "new conversation" control by design: a visitor gets exactly one
 * conversation, it lives in `sessionStorage`, and a fresh tab is a fresh one.
 */
export function Sidebar({ className }: { className?: string }) {
  const { send, isStreaming } = useChatController();
  const t = useTranslations("Sidebar");
  const tStarter = useTranslations("Starters");

  return (
    <aside className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.profile}>
        <Avatar
          size="md"
          src={PROFILE.photo}
          initials="OK"
          alt={PROFILE.name}
          className={styles.avatar}
        />
        <div className={styles.identity}>
          <Typography variant="label-md">{PROFILE.name}</Typography>
          <Typography variant="caption" color="secondary">
            {PROFILE.role}
          </Typography>
        </div>
      </div>

      <Typography variant="body-sm" color="secondary" className={styles.blurb}>
        {t("blurb")}
      </Typography>

      <div className={styles.starters}>
        <Typography variant="overline" color="muted" as="p" className={styles.startersLabel}>
          {t("startWith")}
        </Typography>
        <ul className={styles.starterList}>
          {STARTER_KEYS.map((key) => {
            const prompt = tStarter(key);
            return (
              <li key={key}>
                <button
                  type="button"
                  className={styles.starter}
                  disabled={isStreaming}
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.footer}>
        <div className={styles.brand}>
          <AgentMark />
          <Typography variant="label-sm">{SIDEBAR_FOOTER.product}</Typography>
          <Chip
            variant="outline"
            size="small"
            label={SIDEBAR_FOOTER.badge}
            className={styles.badge}
          />
        </div>

        <a className={styles.email} href={`mailto:${PROFILE.email}`}>
          {PROFILE.email}
        </a>

        <a className={styles.email} href={PROFILE.website} target="_blank" rel="noreferrer">
          {PROFILE.website.replace(/^https?:\/\//, "")}
        </a>

        <Typography variant="caption" color="muted" as="p" className={styles.disclaimer}>
          {t("disclaimer")}
        </Typography>

        <div className={styles.footerRow}>
          {/* Withdrawing consent has to be as easy as giving it, so this stays reachable
              once the banner is gone. It renders nothing until a first decision exists. */}
          <CookieTrigger className={styles.cookieTrigger} />

          <div className={styles.social}>
            <a
              className={styles.socialLink}
              href={PROFILE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>
            <a
              className={styles.socialLink}
              href={PROFILE.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect width="4" height="12" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
