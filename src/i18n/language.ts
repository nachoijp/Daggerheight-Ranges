import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";

export type Language = "es" | "en";

export const DEFAULT_LANGUAGE: Language = "es";

const METADATA_KEY = getPluginId("language");

function isLanguage(value: unknown): value is Language {
  return value === "es" || value === "en";
}

/** Reads a Language out of an already-fetched scene metadata object, for callers that fetched it for other reasons too and shouldn't pay for a second round trip just for this. */
export function languageFromMetadata(metadata: Record<string, unknown>): Language {
  const stored = metadata[METADATA_KEY];
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

/** Room-wide, GM-configured (see Settings → Global) — stored in scene metadata like BandSet already is. */
export async function getLanguage(): Promise<Language> {
  return languageFromMetadata(await OBR.scene.getMetadata());
}

export async function setLanguage(language: Language): Promise<void> {
  await OBR.scene.setMetadata({ [METADATA_KEY]: language });
}
