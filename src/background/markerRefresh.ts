import OBR from "@owlbear-rodeo/sdk";
import { bandSetFromMetadata } from "../bandSets/bandSets";
import { globalSettingsFromMetadata } from "../settings/globalSettings";
import { markerLookFromMetadata, refreshAllTokenHeightMarkers } from "../tokenHeight/markers";

// Keeps the persistent height markers in step with what they're drawn from
// (the Bandas, the language their names come in, the room's marker look,
// the color theme), without flooding Owlbear with writes. It used to rewrite
// every marker on every scene metadata change — any extension's, or
// Owlbear's own — from every connected client at once, which ran into
// Owlbear's rate limit ("Too many requests", 2026-10-08) and crowded out
// the Medición's own writes. Now:
// - only the GM's client writes (markers are shared, one writer is
//   enough — so they always carry the GM's color theme);
// - only when something markers depend on actually changed;
// - and refreshAllTokenHeightMarkers only writes the markers that differ.

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
        console.error("Daggerheight: failed to refresh height markers", error);
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
