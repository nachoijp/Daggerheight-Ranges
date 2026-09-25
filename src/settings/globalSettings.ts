import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { isPlainObject } from "../util/isPlainObject";

/**
 * Room-wide, GM-configured settings from the Global tab (aside from
 * language, which already has its own dedicated metadata slot). Bundled
 * into one object/key since they're all edited together on the same tab.
 */
export type GlobalSettings = {
  /** Single uppercase letter — also used directly as ToolMode's `shortcut`. */
  hotkeyActivate: string;
  hotkeyRaise: string;
  hotkeyLower: string;
  /** Whether the "Altura" right-click context menu is registered at all —
   * only takes effect when enableAltitude is also true. */
  showAltitudeMenu: boolean;
  /** Whether Lecturas (per-token readings — icon/ring/circle + label,
   * whichever the Bandas' own Visualización is set to) are shown during a
   * Medición. The tool itself, its activation shortcut, and the Bandas
   * rings/gradient always stay — this only strips the per-token reading
   * layer, leaving plain Ranges-style distance rings. Optional so a
   * GlobalSettings object saved before this field existed still validates —
   * missing = true. */
  enableLecturas?: boolean;
  /** Master switch for the whole altitude/height mechanic — the Z/X
   * hotkeys, the height label during a Medición, and persistent per-token
   * markers, on top of (not instead of) showAltitudeMenu's own menu-only
   * toggle. Off = the extension behaves like plain Ranges (no altitude
   * concept at all). Optional for the same reason as enableMedicion above —
   * missing = true. */
  enableAltitude?: boolean;
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  hotkeyActivate: "O",
  hotkeyRaise: "X",
  hotkeyLower: "Z",
  showAltitudeMenu: true,
  enableLecturas: true,
  enableAltitude: true,
};

const METADATA_KEY = getPluginId("globalSettings");

function isLetter(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]$/.test(value);
}

function isGlobalSettings(value: unknown): value is GlobalSettings {
  return (
    isPlainObject(value) &&
    isLetter(value.hotkeyActivate) &&
    isLetter(value.hotkeyRaise) &&
    isLetter(value.hotkeyLower) &&
    typeof value.showAltitudeMenu === "boolean" &&
    (value.enableLecturas === undefined || typeof value.enableLecturas === "boolean") &&
    (value.enableAltitude === undefined || typeof value.enableAltitude === "boolean")
  );
}

export function globalSettingsFromMetadata(metadata: Record<string, unknown>): GlobalSettings {
  const stored = metadata[METADATA_KEY];
  return isGlobalSettings(stored) ? stored : DEFAULT_GLOBAL_SETTINGS;
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return globalSettingsFromMetadata(await OBR.scene.getMetadata());
}

export async function setGlobalSettings(settings: GlobalSettings): Promise<void> {
  await OBR.scene.setMetadata({ [METADATA_KEY]: settings });
}

/** A hotkey letter as ToolMode.onKeyDown's event.code, e.g. "X" -> "KeyX". */
export function letterToCode(letter: string): string {
  return `Key${letter}`;
}
