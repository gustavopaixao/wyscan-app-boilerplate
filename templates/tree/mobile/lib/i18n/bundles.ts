import de from "../../locales/de.json";
import en from "../../locales/en.json";
import es from "../../locales/es.json";
import fr from "../../locales/fr.json";
import it from "../../locales/it.json";
import nl from "../../locales/nl.json";
import ptBR from "../../locales/pt-BR.json";
import ptPT from "../../locales/pt-PT.json";

export type MessageKey = keyof typeof en;

const bundles: Record<string, Record<MessageKey, string>> = {
  en,
  "pt-BR": ptBR,
  "pt-PT": ptPT,
  es,
  fr,
  de,
  it,
  nl,
};

export function resolveBundle(tag: string | undefined): Record<MessageKey, string> {
  if (!tag) return en;
  if (bundles[tag]) return bundles[tag];
  const short = tag.split("-")[0] ?? "";
  if (short === "pt") return bundles["pt-BR"];
  return bundles[short] ?? en;
}

export { en as enBundle };
