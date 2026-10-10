import OBR, {
  buildLabel,
  isImage,
  type GridScale,
  type Image,
  type Item,
  type Path,
} from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { getColorString, getLabelTextColor } from "../util/color";
import { formatDistance } from "../util/flattenGridScale";
import { getStoredTheme } from "../theme/themes";
import { BandSet, IconPosition } from "../engine/types";
import { bandSetFromMetadata } from "../bandSets/bandSets";
import { globalSettingsFromMetadata } from "../settings/globalSettings";
import { computeIconAnchor } from "../render/iconAnchor";
import { iconStackExtent } from "../render/iconStack";
import { followMap, LABEL_FONT_SIZE } from "../render/lecturaItems";
import { heightBandIndex } from "../engine/heights";
import {
  getTokenHeight,
  isTokenHeightMarker,
  markerLookFromMetadata,
  type MarkerLook,
} from "../tokenHeight/markers";

// The "⬆️ 30ft" label of the "label" and "both" marker styles: drawn where
// the marker's icon stack would be ("label", the marker itself is then
// transparent — see markers.ts) or just past it ("both").
//
// Client-local on every client, derived from the markers themselves, rather
// than real scene items: every client runs this background script, so real
// items would need one designated writer to avoid duplicates (and players
// can't always write), and switching styles would mean a scene-wide rewrite.
// Local items cost nothing to add or drop, and each one is attachedTo its
// token, so Owlbear moves it with the token like it does the marker.
//
// A label's position is only ever set when it's created: whenever anything
// it shows changes, it's deleted and rebuilt from the token's current
// position, rather than repositioned in place — an attached local item's
// stored position doesn't follow its token (see measureMirror.ts), so
// writing a fresh absolute position into an existing one isn't safe.

const OVERLAY_KEY = getPluginId("heightOverlay");

type Drawn = { id: string; signature: string };
type Wanted = { signature: string; build: () => Item };

let metadata: Record<string, unknown> = {};
let items: Item[] = [];
let dpi = 0;
let gridScale: GridScale | null = null;
let role: "GM" | "PLAYER" = "PLAYER";
let sceneReady = false;

/** tokenId -> the label drawn for it. */
const drawn = new Map<string, Drawn>();
// Set whenever this client may have labels it isn't tracking (a fresh
// scene, or a write that failed partway): the next pass deletes every one
// and redraws from scratch.
let resync = true;
let running = false;
let dirty = false;

const ARROW = { up: "⬆️", down: "⬇️" } as const;
// Gap between the marker's icon stack and the label, in the "both" style.
const TEXT_GAP = 0.05;
const NO_EXTENT = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

/** Where the label sits on the marker's side of the token, and which way it hangs from there (away from the token). */
function textPlacement(
  token: Image,
  side: IconPosition,
  iconDistance: number,
  extent: typeof NO_EXTENT,
  gap: number
) {
  const anchor = computeIconAnchor(token, dpi, side, iconDistance);
  switch (side) {
    case "top":
      return { position: { x: anchor.x, y: anchor.y + extent.minY - gap }, pointer: "DOWN" as const };
    case "bottom":
      return { position: { x: anchor.x, y: anchor.y + extent.maxY + gap }, pointer: "UP" as const };
    case "left":
      return { position: { x: anchor.x + extent.minX - gap, y: anchor.y }, pointer: "RIGHT" as const };
    case "right":
    default:
      return { position: { x: anchor.x + extent.maxX + gap, y: anchor.y }, pointer: "LEFT" as const };
  }
}

function wantedLabel(
  marker: Path,
  token: Image,
  bandSet: BandSet,
  scale: GridScale,
  look: MarkerLook
): Wanted | null {
  const height = getTokenHeight(marker, bandSet);
  if (height === undefined) {
    return null;
  }
  const text = `${height > 0 ? ARROW.up : ARROW.down} ${formatDistance(scale, Math.abs(height))}`;
  const theme = getStoredTheme();
  const color = theme.colors[(heightBandIndex(height, bandSet) ?? 0) % theme.colors.length];
  const { position: side, distance: iconDistance, opacity, size } = look.tuning;
  // In "label" the label takes the icons' place; in "both" it goes past them.
  const extent = look.style === "both" ? iconStackExtent(marker.commands) : NO_EXTENT;
  const gap = look.style === "both" ? TEXT_GAP * dpi : 0;
  const signature = JSON.stringify([
    text,
    color,
    side,
    iconDistance,
    opacity,
    size,
    extent,
    gap,
    dpi,
    token.scale,
    token.image.width,
    token.image.height,
    token.grid,
    token.visible,
  ]);
  return {
    signature,
    build: () => {
      const { position, pointer } = textPlacement(token, side, iconDistance, extent, gap);
      const label = buildLabel()
        .plainText(text)
        .position(position)
        .pointerDirection(pointer)
        .pointerHeight(0)
        // The marker's size setting scales the label like it does the icons
        .fontSize(LABEL_FONT_SIZE * size)
        .padding(4 * size)
        .cornerRadius(12 * size)
        .fillColor(getLabelTextColor(color, 180))
        .fillOpacity(opacity)
        .backgroundColor(getColorString(color))
        .backgroundOpacity(0.85 * opacity)
        .attachedTo(token.id)
        .layer("ATTACHMENT")
        .locked(true)
        .disableHit(true)
        .visible(token.visible)
        .build();
      label.metadata[OVERLAY_KEY] = { tokenId: token.id };
      return followMap(label);
    },
  };
}

function computeWanted(): Map<string, Wanted> {
  const wanted = new Map<string, Wanted>();
  if (!sceneReady || !dpi || !gridScale) {
    return wanted;
  }
  const settings = globalSettingsFromMetadata(metadata);
  const look = markerLookFromMetadata(metadata);
  if (!(settings.enableAltitude ?? true) || look.style === "icons") {
    return wanted;
  }
  const bandSet = bandSetFromMetadata(metadata);
  const tokens = new Map(items.filter(isImage).map((item) => [item.id, item]));
  for (const marker of items) {
    if (!isTokenHeightMarker(marker) || !marker.attachedTo) {
      continue;
    }
    const token = tokens.get(marker.attachedTo);
    // A player never sees a hidden token, so neither should its label.
    if (!token || (role !== "GM" && !token.visible)) {
      continue;
    }
    const label = wantedLabel(marker, token, bandSet, gridScale, look);
    if (label) {
      wanted.set(token.id, label);
    }
  }
  return wanted;
}

async function reconcile() {
  if (resync) {
    resync = false;
    drawn.clear();
    const leftovers = await OBR.scene.local.getItems((item) => OVERLAY_KEY in item.metadata);
    if (leftovers.length > 0) {
      await OBR.scene.local.deleteItems(leftovers.map((item) => item.id));
    }
  }
  const wanted = computeWanted();
  const toDelete: string[] = [];
  const toAdd: Item[] = [];
  for (const [key, current] of drawn) {
    const next = wanted.get(key);
    if (!next || next.signature !== current.signature) {
      toDelete.push(current.id);
      drawn.delete(key);
    }
  }
  for (const [key, next] of wanted) {
    if (drawn.has(key)) {
      continue;
    }
    const item = next.build();
    toAdd.push(item);
    drawn.set(key, { id: item.id, signature: next.signature });
  }
  if (toDelete.length > 0) {
    await OBR.scene.local.deleteItems(toDelete);
  }
  if (toAdd.length > 0) {
    await OBR.scene.local.addItems(toAdd);
  }
}

/** Runs reconcile() once at a time; a change landing mid-run gets one more pass afterwards. */
function schedule() {
  dirty = true;
  if (running) {
    return;
  }
  running = true;
  (async () => {
    while (dirty) {
      dirty = false;
      try {
        await reconcile();
      } catch (error) {
        console.error("Rising Ranges: failed to draw height labels", error);
        resync = true;
      }
    }
    running = false;
  })();
}

async function loadScene() {
  const [nextMetadata, nextItems, nextDpi, nextScale] = await Promise.all([
    OBR.scene.getMetadata(),
    OBR.scene.items.getItems(),
    OBR.scene.grid.getDpi(),
    OBR.scene.grid.getScale(),
  ]);
  metadata = nextMetadata;
  items = nextItems;
  dpi = nextDpi;
  gridScale = nextScale;
  sceneReady = true;
  resync = true;
  schedule();
}

export async function startHeightOverlays() {
  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      loadScene().catch((error) => console.error("Rising Ranges: failed to load height labels", error));
    } else {
      // The scene's local items go with it.
      sceneReady = false;
      drawn.clear();
    }
  });
  OBR.scene.items.onChange((next) => {
    items = next;
    schedule();
  });
  OBR.scene.onMetadataChange((next) => {
    metadata = next;
    schedule();
  });
  OBR.scene.grid.onChange(async () => {
    [dpi, gridScale] = await Promise.all([OBR.scene.grid.getDpi(), OBR.scene.grid.getScale()]);
    schedule();
  });
  OBR.player.onChange((player) => {
    if (player.role !== role) {
      role = player.role;
      schedule();
    }
  });
  // The color theme is picked on another page of this extension and only
  // stored in localStorage, which tells other same-origin pages it changed.
  window.addEventListener("storage", (event) => {
    if (event.key === "theme" && drawn.size > 0) {
      schedule();
    }
  });
  role = await OBR.player.getRole();
  if (await OBR.scene.isReady()) {
    await loadScene();
  }
}
