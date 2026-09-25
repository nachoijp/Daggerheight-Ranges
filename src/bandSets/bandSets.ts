import OBR from "@owlbear-rodeo/sdk";
import { isPlainObject } from "../util/isPlainObject";
import { getPluginId } from "../util/getPluginId";
import { BandSet } from "../engine/types";
import type { Language } from "../i18n/language";
import { dagger } from "./templates/dagger";
import { steel } from "./templates/steel";
import { dragons } from "./templates/dragons";

/** Built-in presets aren't user data — their Banda names are localized fresh every time, never frozen at whatever language they were in when picked. */
export function getDefaultBandSets(language: Language): BandSet[] {
  return [dagger(language), steel(language), dragons(language)];
}

/**
 * A BandSet read from scene metadata may be a stale, frozen snapshot of a
 * default preset taken in a different language (metadata stores whichever
 * full object was selected at the time, not just its id) — swap it for the
 * current localized definition whenever its id matches a known default, so
 * a language change is reflected even for a preset selected before the
 * switch. Custom BandSets (no matching default id) pass through untouched.
 */
export function resolveBandSet(bandSet: BandSet, language: Language): BandSet {
  const defaults = getDefaultBandSets(language);
  return defaults.find((defaultBandSet) => defaultBandSet.id === bandSet.id) ?? bandSet;
}

function isBandSet(value: unknown): value is BandSet {
  return (
    isPlainObject(value) &&
    "name" in value &&
    "id" in value &&
    "shape" in value &&
    "metric" in value &&
    "bands" in value
  );
}

/** Reads custom BandSets out of an already-fetched scene metadata object, for callers that fetched it for other reasons too and shouldn't pay for a second round trip just for this. */
export function customBandSetsFromMetadata(
  metadata: Record<string, unknown>
): BandSet[] {
  const stored = metadata[getPluginId("bandSets")];
  return Array.isArray(stored) ? stored.filter(isBandSet) : [];
}

/** Custom BandSets are stored per-room so every player/GM sees the same presets. */
export async function getCustomBandSets(): Promise<BandSet[]> {
  try {
    return customBandSetsFromMetadata(await OBR.scene.getMetadata());
  } catch (error) {
    console.warn(
      "Failed to read custom band sets from scene metadata:",
      error
    );
    return [];
  }
}

export async function setCustomBandSets(bandSets: BandSet[]): Promise<void> {
  try {
    await OBR.scene.setMetadata({ [getPluginId("bandSets")]: bandSets });
  } catch (error) {
    console.warn("Failed to save custom band sets to scene metadata:", error);
  }
}

export function getBandSet(
  id: string,
  customBandSets: BandSet[],
  language: Language
): BandSet | undefined {
  return [...customBandSets, ...getDefaultBandSets(language)].find((b) => b.id === id);
}
