import OBR from "@owlbear-rodeo/sdk";
import { bandSetFromMetadata } from "../bandSets/bandSets";
import { globalSettingsFromMetadata } from "../settings/globalSettings";
import { markerLookFromMetadata, refreshAllTokenHeightMarkers } from "../tokenHeight/markers";

// Keeps the height markers in step with what they're drawn from (the
// Bandas, the language of their names, the room's marker look, the color
// theme) while writing as little as possible — Owlbear rate-limits writes
// ("Too many requests"), and the Medición's own writes need the room:
// - only the GM's client writes (markers are shared, so they carry the GM's
//   color theme);
// - only when something they depend on changed — not on every metadata
//   change, which other extensions and Owlbear itself make too;
// - and only the markers that come out different.

let isGm = false;
let lastSignature: string | null = null;
let running = false;
let dirty = false;

/** Everything in scene metadata a marker's look depends on. */
function markerSignature(metadata: Record<string, unknown>): string {
  return JSON.stringify([
    bandSetFromMetadata(metadata),
    globalSettingsFromMetadata(metadata).enableAltitude ?? true,
    markerLookFromMetadata(metadata),
  ]);
}

/** One refresh at a time; a request landing mid-refresh gets one more pass after it. */
function refresh() {
  if (!isGm) {
    return;
  }
  dirty = true;
  if (running) {
    return;
  }
  running = true;
  (async () => {
    while (dirty) {
      dirty = false;
      try {
        await refreshAllTokenHeightMarkers();
      } catch (error) {
        console.error("Rising Ranges: failed to refresh height markers", error);
      }
    }
    running = false;
  })();
}

function onMetadata(metadata: Record<string, unknown>) {
  const signature = markerSignature(metadata);
  if (signature !== lastSignature) {
    lastSignature = signature;
    refresh();
  }
}

export async function startMarkerRefresh() {
  OBR.scene.onMetadataChange(onMetadata);
  OBR.scene.onReadyChange(async (ready) => {
    // A newly opened scene: always refresh once, whatever its metadata.
    lastSignature = null;
    if (ready) {
      onMetadata(await OBR.scene.getMetadata());
    }
  });
  OBR.player.onChange((player) => {
    const becameGm = player.role === "GM" && !isGm;
    isGm = player.role === "GM";
    if (becameGm) {
      refresh();
    }
  });
  // The GM's color theme is stored in localStorage by another page of this
  // extension, which tells this one it changed.
  window.addEventListener("storage", (event) => {
    if (event.key === "theme") {
      refresh();
    }
  });
  isGm = (await OBR.player.getRole()) === "GM";
  if (await OBR.scene.isReady()) {
    onMetadata(await OBR.scene.getMetadata());
  }
}
