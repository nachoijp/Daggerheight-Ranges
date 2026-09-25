import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { getDefaultBandSets } from "../bandSets/bandSets";
import { languageFromMetadata } from "../i18n/language";

export function syncSettings() {
  onScene(async () => {
    const isGm = (await OBR.player.getRole()) === "GM";
    if (isGm) {
      syncBandSetIfNeeded();
    }
  });

  onGm(async () => {
    const sceneReady = await OBR.scene.isReady();
    if (sceneReady) {
      syncBandSetIfNeeded();
    }
  });
}

async function onScene(func: () => void) {
  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      func();
    }
  });
  const ready = await OBR.scene.isReady();
  if (ready) {
    func();
  }
}

async function onGm(func: () => void) {
  let isGm = false;
  OBR.player.onChange((player) => {
    if (player.role === "GM" && !isGm) {
      func();
    }
    isGm = player.role === "GM";
  });
  isGm = (await OBR.player.getRole()) === "GM";
  if (isGm) {
    func();
  }
}

let syncing = false;
async function syncBandSetIfNeeded() {
  if (syncing) {
    return;
  }
  try {
    syncing = true;
    const metadata = await OBR.scene.getMetadata();
    const bandSet = metadata[getPluginId("bandSet")];
    if (bandSet) {
      return;
    }
    const language = languageFromMetadata(metadata);
    await OBR.scene.setMetadata({
      [getPluginId("bandSet")]: getDefaultBandSets(language)[0],
    });
  } finally {
    syncing = false;
  }
}
