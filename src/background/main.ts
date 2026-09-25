import OBR from "@owlbear-rodeo/sdk";
import { createMeasureTool } from "./createMeasureTool";
import { createThemeAction } from "./createThemeAction";
import { createSettingsAction } from "./createSettingsAction";
import { createTokenHeightMenu } from "./createTokenHeightMenu";
import { syncSettings } from "./syncSettings";
import { refreshAllTokenHeightMarkers } from "../tokenHeight/markers";
import { languageFromMetadata } from "../i18n/language";
import { globalSettingsFromMetadata } from "../settings/globalSettings";

async function waitUntilOBRReady() {
  return new Promise<void>((resolve) => {
    OBR.onReady(() => {
      resolve();
    });
  });
}

// OBR.onReady() only guarantees the SDK bridge itself is ready — it does
// NOT guarantee a scene has finished loading. Calling OBR.scene.* too early
// (right after onReady, before a scene exists) throws
// `MissingDataError: "No scene found"` — confirmed live 2026-09-24, this
// was the actual root cause of the extension silently failing to register
// its toolbar icons on a page reload (the error was thrown from an
// unawaited/uncaught init() call, so it never surfaced anywhere visible).
// syncSettings.ts already had the correct wait-for-scene pattern; init()
// just never used it.
//
// A Room with no Scene ever open is a separate, equally valid state (see
// Owlbear's extension-verification guidelines: "Valid configurations
// include a Room with a Scene open and no Scene open") — waiting
// unconditionally for scene-ready would then hang forever and the toolbar
// icons would never appear. `timeoutMs` distinguishes the two: omitted, the
// wait is unbounded (safe to leave dangling if a Scene never arrives, same
// as syncSettings.ts's own indefinite onReadyChange subscription); passed,
// it resolves `false` if no Scene becomes ready in time, letting the caller
// fall back to defaults instead of blocking registration indefinitely.
async function waitUntilSceneReady(timeoutMs?: number): Promise<boolean> {
  if (await OBR.scene.isReady()) {
    return true;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      unsubscribe();
      resolve(ready);
    };
    const unsubscribe = OBR.scene.onReadyChange((ready) => {
      if (ready) {
        finish(true);
      }
    });
    if (timeoutMs !== undefined) {
      timeout = setTimeout(() => finish(false), timeoutMs);
    }
  });
}

// Matches @owlbear-rodeo/sdk's own default RPC timeout (MessageBus.js's
// sendAsync, found while debugging the original reload bug) — long enough
// that a Scene which is genuinely just mid-load (the normal reload case)
// always resolves well within it, short enough that a scene-less Room
// doesn't leave the user staring at a toolbar with no icons for long.
const SCENE_READY_TIMEOUT_MS = 5000;

async function init() {
  await waitUntilOBRReady();
  syncSettings();

  // Toolbar icon labels, the Medición tool's own activation shortcut, and
  // whether the Altura context menu is registered at all are set once here
  // — like BandSet's own early phases, none of this live-updates if the GM
  // changes it later without a reload (the SDK has no "update this
  // action/mode's label or shortcut" call, nor a way to unregister a
  // context menu once created). Bounded-wait for real scene metadata so
  // the common case (a Scene exists, just hasn't finished loading yet)
  // still gets correct per-room language/hotkeys, without blocking
  // registration forever in a Room that has no Scene at all.
  const sceneReady = await waitUntilSceneReady(SCENE_READY_TIMEOUT_MS);
  const metadata = sceneReady ? await OBR.scene.getMetadata() : {};
  const language = languageFromMetadata(metadata);
  const globalSettings = globalSettingsFromMetadata(metadata);
  createMeasureTool(language, globalSettings);
  createThemeAction(language);
  createSettingsAction(language);
  if ((globalSettings.enableAltitude ?? true) && globalSettings.showAltitudeMenu) {
    createTokenHeightMenu(language);
  }

  // Height markers are real Scene items — unlike the toolbar registration
  // above, there's nothing useful to fall back to without a Scene, so this
  // part waits unboundedly and simply does nothing until (if ever) a Scene
  // actually loads.
  OBR.scene.onMetadataChange(() => refreshAllTokenHeightMarkers());
  if (sceneReady) {
    refreshAllTokenHeightMarkers();
  } else {
    waitUntilSceneReady().then(() => refreshAllTokenHeightMarkers());
  }
}

init().catch((error) => {
  console.error("Daggerheight: failed to initialize", error);
});
