import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { GLASS_FRAME } from "../util/glass";

export const DISTANCES_POPOVER_ID = getPluginId("popover/distances");

export const PANEL_MIN_WIDTH = 300;
export const PANEL_MAX_WIDTH = 560;
/** Until Owlbear reports how much room is left on screen (see roomBelow). */
export const PANEL_MAX_HEIGHT = 600;
/** Where the panel's top sits (see anchorPosition below). */
export const PANEL_TOP = 72;
/** Where the panel's left edge sits. */
export const PANEL_LEFT = 16;
// Only until the panel has measured its content and resized to fit it.
const PANEL_INITIAL_HEIGHT = 160;

// The panel's ✕ tells the background script (which owns the toolbar
// button) that it closed, over a broadcast that never leaves this client.
const CLOSED_CHANNEL = getPluginId("distancesClosed");

// Whether this client has the panel open. Tracked here because Owlbear
// can't tell: OBR.popover.getWidth never answers for a closed popover (it
// times out after 5s). If it's ever wrong (the panel closed some other
// way), the button just needs one extra click.
let open = false;

/** Background script: keeps `open` in step with the panel's own ✕. */
let watching = false;
export function watchDistancesPanel() {
  // The toolbar action is registered again whenever the settings change;
  // one listener is enough.
  if (watching) {
    return;
  }
  watching = true;
  OBR.broadcast.onMessage(CLOSED_CHANNEL, () => {
    open = false;
  });
}

/** Panel page: closes itself and lets the toolbar button know. */
export async function closeDistancesPanel() {
  await OBR.broadcast.sendMessage(CLOSED_CHANNEL, null, { destination: "LOCAL" });
  await OBR.popover.close(DISTANCES_POPOVER_ID);
}

/**
 * The toolbar button opens the Distancias panel, or closes it if it's
 * already open. The panel never closes on its own when the map is clicked
 * (it's meant to stay up while tokens move), so the button and the panel's
 * own ✕ are the ways out.
 */
export async function toggleDistancesPanel() {
  if (open) {
    open = false;
    await OBR.popover.close(DISTANCES_POPOVER_ID);
    return;
  }
  open = true;
  await OBR.popover.open({
    id: DISTANCES_POPOVER_ID,
    url: "/distances.html",
    width: PANEL_MIN_WIDTH + GLASS_FRAME,
    height: PANEL_INITIAL_HEIGHT,
    // Pinned to the screen's top-left corner rather than anchored to the
    // toolbar button: anchored, it opened over the middle of the map,
    // right on top of the tokens it lists. The offset clears Owlbear's own
    // top bar — an estimate, like the other popovers' sizes.
    anchorReference: "POSITION",
    anchorPosition: { left: PANEL_LEFT, top: PANEL_TOP },
    anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
    transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
    disableClickAway: true,
    // The page draws its own translucent panel (GlassFrame).
    hidePaper: true,
  });
}
