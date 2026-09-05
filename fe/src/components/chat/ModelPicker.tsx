import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "use-intl";
import { Icon, Popover, Typography } from "@okkly/react";

import { ShimmerText } from "../ShimmerText.js";
import { useModels, type ModelInfo } from "../../api/models.js";
import { isStreamingAtom, modelIdAtom, modelMenuOpenAtom } from "../../state/atoms.js";
import styles from "./ModelPicker.module.scss";

export function ModelPicker() {
  const { data, isLoading } = useModels();
  const t = useTranslations("ModelPicker");
  const [open, setOpen] = useAtom(modelMenuOpenAtom);
  const [selectedId, setSelectedId] = useAtom(modelIdAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const models = data?.models ?? [];
  const effectiveId = selectedId ?? data?.defaultModelId;
  const current: ModelInfo | undefined = models.find((m) => m.id === effectiveId);

  // The chosen model may have become unavailable (key removed) between sessions.
  useEffect(() => {
    if (selectedId && data && !models.some((m) => m.id === selectedId && m.available)) {
      setSelectedId(null);
    }
  }, [selectedId, data, models, setSelectedId]);

  // Model names and descriptions come from `/models` — the backend authors them and
  // they stay in English; only the chrome around them is translated.
  const label = isLoading ? t("loadingLabel") : (current?.name ?? t("fallbackLabel"));

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.trigger}
        disabled={isStreaming || isLoading}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <Icon name="iconChevronDown" fontSize="small" color="muted" />
      </button>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        placement="top-start"
        onClose={() => setOpen(false)}
        paperClassName={styles.paper}
      >
        <div className={styles.menu} role="listbox" aria-label={t("label")}>
          {isLoading && (
            <div className={styles.loading}>
              <ShimmerText>{t("loading")}</ShimmerText>
            </div>
          )}
          {models.map((model) => {
            const isCurrent = model.id === effectiveId;
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                className={styles.option}
                disabled={!model.available}
                onClick={() => {
                  setSelectedId(model.id);
                  setOpen(false);
                }}
              >
                <span className={styles.optionMain}>
                  <span className={styles.optionName}>
                    {model.name}
                    {!model.available && <span className={styles.badge}>{t("noKey")}</span>}
                  </span>
                  <Typography variant="caption" color="muted" className={styles.optionDesc}>
                    {model.description}
                  </Typography>
                </span>
                {isCurrent && <Icon name="iconCheck" fontSize="small" color="primary" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
