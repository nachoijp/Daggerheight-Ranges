import OBR, {
  buildPath,
  isImage,
  isPath,
  type Image,
  type Item,
  type Path,
} from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { isPlainObject } from "../util/isPlainObject";
import { getColorString } from "../util/color";
import { getStoredTheme, Theme } from "../theme/themes";
import { Band, BandSet } from "../engine/types";
import { buildIconStackCommands, getStrokeWidthRatio, Direction } from "../render/iconStack";
import { computeIconAnchor } from "../render/iconAnchor";
import { getDefaultBandSets, resolveBandSet } from "../bandSets/bandSets";
import { languageFromMetadata } from "../i18n/language";
import { deepEqual } from "../util/deepEqual";
import { globalSettingsFromMetadata, type MarkerStyle } from "../settings/globalSettings";

const METADATA_KEY = getPluginId("tokenHeight");

export interface TokenHeightState {
  bandId: string;
  direction: Direction;
}

export function getTokenHeightState(item: Item): TokenHeightState | undefined {
  const metadata = item.metadata[METADATA_KEY];
  if (
    isPlainObject(metadata) &&
    typeof metadata.bandId === "string" &&
    (metadata.direction === "up" || metadata.direction === "down")
  ) {
    return { bandId: metadata.bandId, direction: metadata.direction };
  }
  return undefined;
}

export function isTokenHeightMarker(item: Item): item is Path {
  return isPath(item) && getTokenHeightState(item) !== undefined;
}

/**
 * tokenId -> signed height in grid units (positive = marked "up", negative =
 * "down"), resolved against the given BandSet. A token with no marker, or
 * whose marker's Banda was deleted, has no entry — treated as ground (0).
 */
export function tokenHeightsFromMarkers(markers: Item[], bandSet: BandSet): Map<string, number> {
  const heights = new Map<string, number>();
  for (const marker of markers) {
    const state = marker.attachedTo && getTokenHeightState(marker);
    const band = state && bandSet.bands.find((b) => b.id === state.bandId);
    if (marker.attachedTo && state && band) {
      heights.set(marker.attachedTo, state.direction === "up" ? band.radius : -band.radius);
    }
  }
  return heights;
}

export async function getAllTokenHeightMarkers(): Promise<Path[]> {
  return OBR.scene.items.getItems<Path>(isTokenHeightMarker);
}

export async function getActiveBandSet(): Promise<BandSet> {
  return (await getActiveMarkerConfig()).bandSet;
}

/** Everything a marker's look depends on that lives in scene metadata — one round trip for both. */
async function getActiveMarkerConfig(): Promise<{ bandSet: BandSet; style: MarkerStyle }> {
  const sceneMetadata = await OBR.scene.getMetadata();
  const language = languageFromMetadata(sceneMetadata);
  const rawBandSet = (sceneMetadata[getPluginId("bandSet")] ??
    getDefaultBandSets(language)[0]) as BandSet;
  return {
    bandSet: resolveBandSet(rawBandSet, language),
    style: globalSettingsFromMetadata(sceneMetadata).markerStyle ?? "icons",
  };
}

// In the "label" style the marker is still there (it's what stores the
// token's height, and what the label is drawn from) — just invisible.
const MARKER_STROKE_OPACITY = 0.65;
function markerOpacity(style: MarkerStyle): number {
  return style === "label" ? 0 : 1;
}

/** Mutates a marker draft's geometry/color/anchor/metadata in place. Shared by setTokenHeightMarker's update path and refreshAllTokenHeightMarkers, so both apply the exact same derivation. */
function applyMarkerGeometry(
  marker: Path,
  token: Image,
  band: Band,
  bandIndex: number,
  direction: Direction,
  bandSet: BandSet,
  theme: Theme,
  dpi: number,
  style: MarkerStyle
): void {
  const shape = band.iconShape ?? bandSet.iconShape ?? "circle";
  const position = bandSet.iconPosition ?? "top";
  const size = bandSet.iconSize ?? 1;
  const iconDistance = bandSet.iconDistance ?? 0.15;
  marker.commands = buildIconStackCommands(shape, bandIndex + 1, dpi, size, position, direction);
  marker.style.fillColor = getColorString(theme.colors[bandIndex % theme.colors.length]);
  marker.style.strokeWidth = dpi * getStrokeWidthRatio(shape);
  marker.style.fillOpacity = markerOpacity(style);
  marker.style.strokeOpacity = MARKER_STROKE_OPACITY * markerOpacity(style);
  marker.position = computeIconAnchor(token, dpi, position, iconDistance);
  marker.visible = token.visible;
  marker.name = `Daggerheight: ${band.name} (${direction})`;
  marker.metadata[METADATA_KEY] = { bandId: band.id, direction } as TokenHeightState;
}

function buildTokenHeightMarker(
  token: Image,
  band: Band,
  bandIndex: number,
  direction: Direction,
  bandSet: BandSet,
  theme: Theme,
  dpi: number,
  style: MarkerStyle
): Path {
  const shape = band.iconShape ?? bandSet.iconShape ?? "circle";
  const position = bandSet.iconPosition ?? "top";
  const size = bandSet.iconSize ?? 1;
  const iconDistance = bandSet.iconDistance ?? 0.15;
  const commands = buildIconStackCommands(shape, bandIndex + 1, dpi, size, position, direction);
  const color = getColorString(theme.colors[bandIndex % theme.colors.length]);
  const item = buildPath()
    .commands(commands)
    .fillColor(color)
    .fillOpacity(markerOpacity(style))
    .strokeColor("#111827")
    .strokeOpacity(MARKER_STROKE_OPACITY * markerOpacity(style))
    .strokeWidth(dpi * getStrokeWidthRatio(shape))
    .position(computeIconAnchor(token, dpi, position, iconDistance))
    .attachedTo(token.id)
    .layer("ATTACHMENT")
    .locked(true)
    .disableHit(true)
    .visible(token.visible)
    .name(`Daggerheight: ${band.name} (${direction})`)
    .metadata({ [METADATA_KEY]: { bandId: band.id, direction } as TokenHeightState })
    .build();
  return item;
}

// Rapid hotkey presses on the same token call this back-to-back. A marker
// that already exists is mutated in place rather than deleted+recreated —
// the same "don't rebuild what you can mutate" lesson the ephemeral
// interaction items taught (phase 2), now on a real item: a fresh id on
// every call meant an in-flight delete+add from an earlier, still-settling
// call could land after a later one's, silently clobbering it back to a
// stale height. Mutating leaves one stable item identity across the whole
// drag, so there's nothing left for a late write to race against.
//
// knownBandSet/knownDpi/knownStyle let a caller that already has all three cached (the
// Medición tool, for the whole duration of a drag) skip re-fetching them —
// every OBR.scene.* call is a real postMessage round trip with its own 5s
// timeout (no local caching in the SDK itself), and cutting two of those
// round trips out of a call that a fast key-mashing burst can issue
// several times in quick succession measurably lowers the odds of one
// stalling. Same reasoning for knownExisting: a caller that already fetched
// every token-height marker for an unrelated reason (the altitude step
// actions already need the full list to compute each token's *current*
// level) can pass it straight through instead of this doing its own
// identical getItems() call a second time. All three are optional and the
// picker's calls simply omit them, fetching fresh as before.
/**
 * Returns the resulting marker for every token passed in (whichever of
 * existing/newMarkers ends up covering it) — not read back from the SDK
 * (updateItems/addItems return void), just the same objects this function
 * already built/fetched locally. Lets a caller that writes the same token
 * repeatedly in quick succession (the Medición tool's Z/X hotkeys) cache
 * "this token already has a marker" across calls via knownExisting instead
 * of paying for a fresh getItems every time — see
 * createMeasureTool.ts's writeOriginMarker.
 */
export async function setTokenHeightMarker(
  tokens: Image[],
  bandId: string,
  direction: Direction,
  knownBandSet?: BandSet,
  knownDpi?: number,
  knownExisting?: Path[],
  knownStyle?: MarkerStyle
): Promise<Path[]> {
  if (tokens.length === 0) {
    return [];
  }
  const [{ bandSet, style }, dpi] =
    knownBandSet !== undefined && knownDpi !== undefined && knownStyle !== undefined
      ? [{ bandSet: knownBandSet, style: knownStyle }, knownDpi]
      : await Promise.all([getActiveMarkerConfig(), OBR.scene.grid.getDpi()]);
  const bandIndex = bandSet.bands.findIndex((band) => band.id === bandId);
  const band = bandSet.bands[bandIndex];
  if (!band) {
    return [];
  }
  const theme = getStoredTheme();
  const tokenById = new Map(tokens.map((token) => [token.id, token]));
  const tokenIds = tokens.map((token) => token.id);
  const existing = knownExisting
    ? knownExisting.filter(
        (item) => isTokenHeightMarker(item) && tokenIds.includes(item.attachedTo ?? "")
      )
    : await OBR.scene.items.getItems<Path>(
        (item): item is Path => isTokenHeightMarker(item) && tokenIds.includes(item.attachedTo ?? "")
      );
  const existingIds = new Set(existing.map((item) => item.id));
  const tokensWithExisting = new Set(
    existing.map((item) => item.attachedTo).filter((id): id is string => Boolean(id))
  );

  if (existing.length > 0) {
    await OBR.scene.items.updateItems(
      (item): item is Path => existingIds.has(item.id),
      (draft) => {
        for (const marker of draft) {
          const token = marker.attachedTo ? tokenById.get(marker.attachedTo) : undefined;
          if (!token) {
            continue;
          }
          applyMarkerGeometry(marker, token, band, bandIndex, direction, bandSet, theme, dpi, style);
        }
      }
    );
  }

  const newMarkers = tokens
    .filter((token) => !tokensWithExisting.has(token.id))
    .map((token) =>
      buildTokenHeightMarker(token, band, bandIndex, direction, bandSet, theme, dpi, style)
    );
  if (newMarkers.length > 0) {
    await OBR.scene.items.addItems(newMarkers);
  }

  return [...existing, ...newMarkers];
}

export async function clearTokenHeightMarker(
  tokenIds: string[],
  knownExisting?: Path[]
): Promise<void> {
  if (tokenIds.length === 0) {
    return;
  }
  const existing = knownExisting
    ? knownExisting.filter(
        (item) => isTokenHeightMarker(item) && tokenIds.includes(item.attachedTo ?? "")
      )
    : await OBR.scene.items.getItems<Path>(
        (item): item is Path => isTokenHeightMarker(item) && tokenIds.includes(item.attachedTo ?? "")
      );
  if (existing.length > 0) {
    await OBR.scene.items.deleteItems(existing.map((item) => item.id));
  }
}

/** Deletes every height marker in the scene, regardless of which token it's attached to — used when a GM turns off the whole altitude feature from the Global tab. */
export async function clearAllTokenHeightMarkers(): Promise<void> {
  const markers = await getAllTokenHeightMarkers();
  if (markers.length > 0) {
    await OBR.scene.items.deleteItems(markers.map((item) => item.id));
  }
}

/**
 * Re-derives every existing marker's geometry/color/anchor from the current
 * BandSet/theme (a marker's Banda may have been renamed/recolored/resized,
 * or the token it's attached to may have moved/rescaled, since it was set).
 * Mutates in place rather than delete+recreate — same "don't rebuild what
 * you can mutate" lesson as the ephemeral interaction items, this time on
 * real persisted ones, where a delete+recreate would also flicker visibly
 * for every connected client instead of just updating smoothly.
 */
export async function refreshAllTokenHeightMarkers(): Promise<void> {
  const [{ bandSet, style }, dpi, markers] = await Promise.all([
    getActiveMarkerConfig(),
    OBR.scene.grid.getDpi(),
    getAllTokenHeightMarkers(),
  ]);
  if (markers.length === 0) {
    return;
  }
  const theme = getStoredTheme();
  const tokenIds = markers
    .map((marker) => marker.attachedTo)
    .filter((id): id is string => Boolean(id));
  const tokens = await OBR.scene.items.getItems<Image>(
    (item): item is Image => isImage(item) && tokenIds.includes(item.id)
  );
  const tokenById = new Map(tokens.map((token) => [token.id, token]));

  // Derived on copies first, so only the markers that actually come out
  // different get written — most refreshes change nothing, and every write
  // counts against Owlbear's rate limit ("Too many requests").
  const apply = (marker: Path) => {
    const state = getTokenHeightState(marker);
    const token = marker.attachedTo ? tokenById.get(marker.attachedTo) : undefined;
    if (!state || !token) {
      return;
    }
    const bandIndex = bandSet.bands.findIndex((band) => band.id === state.bandId);
    const band = bandSet.bands[bandIndex];
    // The band this marker points to was deleted — leave the marker as-is
    // rather than deleting it, so a temporary Bandas edit doesn't silently
    // wipe markers a GM already placed.
    if (!band) {
      return;
    }
    applyMarkerGeometry(marker, token, band, bandIndex, state.direction, bandSet, theme, dpi, style);
  };
  const changedIds = markers
    .filter((marker) => {
      const next = structuredClone(marker);
      apply(next);
      return !deepEqual(next, marker);
    })
    .map((marker) => marker.id);
  if (changedIds.length === 0) {
    return;
  }

  await OBR.scene.items.updateItems<Path>(changedIds, (draft) => {
    for (const marker of draft) {
      apply(marker);
    }
  });
}

