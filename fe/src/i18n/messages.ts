import de from "../../messages/de.json";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import type { LanguageCode } from "../state/types.js";

/**
 * All four dictionaries are bundled rather than fetched per locale. Together they are a
 * few kilobytes — less than one round trip would cost — and switching language stays
 * synchronous, so nothing flashes untranslated while a chunk loads.
 *
 * `en` doubles as the type: every other locale is checked against its shape, so a key
 * added here and forgotten there fails the typecheck instead of rendering as a raw
 * `Namespace.key` at runtime.
 */
export const MESSAGES: Record<LanguageCode, typeof en> = { de, en, ru, uk };
