import OBR from "@owlbear-rodeo/sdk";
import { syncSettings } from "./syncSettings";
import { startMeasureMirrorReceiver } from "./measureMirror";
import { startHeightOverlays } from "./heightOverlays";
import { startMarkerRefresh } from "./markerRefresh";
import { registerToolbar, watchToolbar } from "./toolbar";

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
  startMeasureMirrorReceiver();

  // Toolbar labels, the Medición tool's activation shortcut, and which of
  // the extension's buttons/menus exist come from the scene's settings —
  // and follow them live from then on (see toolbar.ts). Bounded-wait for
  // real scene metadata so the common case (a Scene exists, just hasn't
  // finished loading yet) registers with the right language and hotkeys
  // straight away, without blocking registration forever in a Room that
  // has no Scene at all (defaults until one opens).
  const sceneReady = await waitUntilSceneReady(SCENE_READY_TIMEOUT_MS);
  registerToolbar(sceneReady ? await OBR.scene.getMetadata() : {});
  watchToolbar();

  // Height markers are real Scene items — unlike the toolbar registration
  // above, there is nothing useful to fall back to without a Scene, so both
  // of these simply wait until (if ever) a Scene actually loads.
  startMarkerRefresh().catch((error) => {
    console.error("Daggerheight: failed to start height marker refresh", error);
  });
  startHeightOverlays().catch((error) => {
    console.error("Daggerheight: failed to start height extras", error);
  });
}

init().catch((error) => {
  console.error("Daggerheight: failed to initialize", error);
});
