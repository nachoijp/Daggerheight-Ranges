import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { languageFromMetadata } from "../i18n/language";
import { globalSettingsFromMetadata } from "../settings/globalSettings";
import { createMeasureTool } from "./createMeasureTool";
import { createThemeAction } from "./createThemeAction";
import { createSettingsAction } from "./createSettingsAction";
import { createTokenHeightMenu } from "./createTokenHeightMenu";
import { createDistancesAction } from "./createDistancesAction";

// Everything this extension adds to Owlbear's own UI — the Medición mode,
// the toolbar actions, the Altura context menu — registered from the
// current scene's settings, and registered again whenever those change
// (the language of their labels, the activation shortcut, which of them
// exist at all). These used to be registered once at load, so any change
// needed a room reload. Re-registering an id replaces it; whatever is
// turned off is removed.

let lastSignature: string | null = null;

export function registerToolbar(metadata: Record<string, unknown>) {
  const language = languageFromMetadata(metadata);
  const settings = globalSettingsFromMetadata(metadata);
  const altitudeMenu = (settings.enableAltitude ?? true) && settings.showAltitudeMenu;
  const distancePanel = settings.distancePanel ?? "off";
  const signature = JSON.stringify([language, settings.hotkeyActivate, altitudeMenu, distancePanel]);
  if (signature === lastSignature) {
    return;
  }
  const firstTime = lastSignature === null;
  lastSignature = signature;

  createMeasureTool(language, settings);
  createThemeAction(language);
  createSettingsAction(language);
  if (distancePanel !== "off") {
    createDistancesAction(language, distancePanel);
  } else if (!firstTime) {
    OBR.tool.removeAction(getPluginId("action/distances"));
  }
  if (altitudeMenu) {
    createTokenHeightMenu(language);
  } else if (!firstTime) {
    OBR.contextMenu.remove(getPluginId("menu/tokenHeight"));
  }
}

/** Keeps the registration in step with the scene's settings: changed from Opciones, or another scene opened. */
export function watchToolbar() {
  OBR.scene.onMetadataChange(registerToolbar);
  OBR.scene.onReadyChange(async (ready) => {
    if (ready) {
      registerToolbar(await OBR.scene.getMetadata());
    }
  });
}
