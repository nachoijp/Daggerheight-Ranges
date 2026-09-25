import type { Language } from "./language";
import es, { type TranslationKey } from "./strings/es";
import en from "./strings/en";

export type { TranslationKey };

const dictionaries: Record<Language, Record<TranslationKey, string>> = { es, en };

/** vars are substituted into `{name}`-style placeholders in the template. */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const template = dictionaries[language][key];
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}
