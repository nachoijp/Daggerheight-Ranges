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
async function waitUntilSceneReady() {
  if (await OBR.scene.isReady()) {
    return;
  }
  return new Promise<void>((resolve) => {
    const unsubscribe = OBR.scene.onReadyChange((ready) => {
      if (ready) {
        unsubscribe();
        resolve();
      }
    });
  });
}

async function init() {
  await waitUntilOBRReady();
  await waitUntilSceneReady();
  syncSettings();
  // Toolbar icon labels, the Medición tool's own activation shortcut, and
  // whether the Altura context menu is registered at all are set once here
  // — like BandSet's own early phases, none of this live-updates if the GM
  // changes it later without a reload (the SDK has no "update this
  // action/mode's label or shortcut" call, nor a way to unregister a
  // context menu once created).
  const metadata = await OBR.scene.getMetadata();
  const language = languageFromMetadata(metadata);
  const globalSettings = globalSettingsFromMetadata(metadata);
  createMeasureTool(language, globalSettings);
  createThemeAction(language);
  createSettingsAction(language);
  if ((globalSettings.enableAltitude ?? true) && globalSettings.showAltitudeMenu) {
    createTokenHeightMenu(language);
  }
  refreshAllTokenHeightMarkers();
  OBR.scene.onMetadataChange(() => refreshAllTokenHeightMarkers());
}

init().catch((error) => {
  console.error("Daggerheight: failed to initialize", error);
});
