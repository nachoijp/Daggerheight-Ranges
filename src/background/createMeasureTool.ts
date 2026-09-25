import OBR, {
  buildEffect,
  buildLabel,
  buildPath,
  buildShape,
  isImage,
  isLabel,
  isPath,
  isShape,
  Math2,
  type GridScale,
  type Image,
  type InteractionManager,
  type Item,
  type Path,
  type Vector2,
  type Uniform,
  type Matrix,
} from "@owlbear-rodeo/sdk";
import measureIcon from "../assets/range.svg";
import { canUpdateItem } from "./permission";
import ringSksl from "./ring.frag";
import { getPluginId } from "../util/getPluginId";
import { getMetadata } from "../util/getMetadata";
import { Color, getStoredTheme, Theme } from "../theme/themes";
import { getColorString, getLabelTextColor } from "../util/color";
import {
  DEFAULT_TOLERANCE,
  distance3D,
  effectiveDistance,
  excessRadius,
} from "../engine/distance";
import { findBand } from "../engine/bands";
import { Band, BandSet } from "../engine/types";
import { getDefaultBandSets, resolveBandSet } from "../bandSets/bandSets";
import { flattenGridScale } from "../util/flattenGridScale";
import { buildIconStackCommands, getStrokeWidthRatio, type Direction } from "../render/iconStack";
import { computeIconAnchor, getTokenBounds, oppositeIconPosition } from "../render/iconAnchor";
import {
  clearTokenHeightMarker,
  getAllTokenHeightMarkers,
  getTokenHeightState,
  setTokenHeightMarker,
  type TokenHeightState,
} from "../tokenHeight/markers";
import { DEFAULT_LANGUAGE, languageFromMetadata, type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import {
  DEFAULT_GLOBAL_SETTINGS,
  globalSettingsFromMetadata,
  letterToCode,
  type GlobalSettings,
} from "../settings/globalSettings";

type OriginMarkerRequest = {
  token: Image;
  ref: TokenHeightState | undefined;
  bandSet: BandSet;
  dpi: number;
  attempt: number;
};

let bandInteraction: InteractionManager<Item[]> | null = null;
let tokenInteraction: InteractionManager<Item> | null = null;
let shaders: Item[] = [];
let grabOffset: Vector2 = { x: 0, y: 0 };
let downTarget: Item | null = null;
let labelOffset = -16;
// The grabbed token's own persistent Altura marker as it was before this
// Medición touched it — undefined means it had none. Used to restore it if
// the drag is cancelled, mirroring how a cancelled drag already leaves the
// token's position untouched.
let originMarkerBeforeEdit: TokenHeightState | undefined;
// Cache of the grabbed token's own marker item (if any), kept in sync with
// every successful write — lets writeOriginMarker skip the "does this token
// already have a marker" getItems round trip setTokenHeightMarker would
// otherwise do on every single keypress, since it's always the same token
// for the whole drag. undefined means "unknown, look it up fresh" — used
// deliberately (not just an empty array) after a failed write, since a
// failure might have actually landed server-side despite the client not
// getting confirmation; trusting a stale "no marker" guess in that case
// could addItems a real duplicate instead of updateItems-ing the one that's
// already there. Only ever trust the cache right after a confirmed success.
let originMarkerKnownExisting: Path[] | undefined;
// downTarget itself is a snapshot taken once at onToolDown and never
// mutated, so its .position goes stale the moment a drag starts (the real
// position only updates on release, via finalizeMove). Track the live
// dragged position separately so a marker written mid-drag anchors to where
// the token actually is on screen, not where it started.
let liveTokenPosition: Vector2 | null = null;
// Marker writes go through setTokenHeightMarker/clearTokenHeightMarker —
// the exact same functions the Altura picker's dropdown already uses
// reliably — coalesced so a fast key-mashing burst doesn't fire one real
// scene-write RPC per keypress: at most one write in flight, plus one
// trailing write for whatever the latest press asked for. See
// scheduleOriginMarkerSync's own comment for how the coalescing works.
let originMarkerSyncLatest: OriginMarkerRequest | null = null;
let originMarkerSyncTail: Promise<void> = Promise.resolve();
let originMarkerSyncPending = false;

// A ring can only encode one height value, but a correct Lectura needs the
// Origen's height AND each token's own height, so rings are always drawn at
// their nominal radius — the Lectura text is the source of truth. Each
// token's own height now comes from its persistent marker (see
// ../tokenHeight/markers.ts), closing the loop that was deferred in phase 2.
let activeCenter: Vector2 = { x: 0, y: 0 };
// Separate from activeCenter: when relocating a grabbed token, the rings
// stay frozen at activeCenter (so you can judge "how far can this token move
// and stay in range of where it started"), but a Lectura answers a different
// question — "how far is everything from this token right now" — so it has
// to track the token's live position as it's dragged, not the frozen start
// point. In free-point mode there's only one reference point, so this always
// mirrors activeCenter there.
let activeLecturaCenter: Vector2 = { x: 0, y: 0 };
let activeBandSet: BandSet | null = null;
let activeTheme: Theme | null = null;
let activeLanguage: Language = DEFAULT_LANGUAGE;
let activeHotkeys: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
// Mirrors activeHotkeys.enableAltitude (missing = true) — read fresh from
// module state elsewhere (onKeyDown, restoreOriginMarker, finalizeMove)
// rather than off the GlobalSettings object directly, so the whole altitude
// feature — Z/X, the height label, marker seeding/writes — turns off
// together instead of each call site defaulting it separately.
let activeAltitudeEnabled = true;
// Mirrors activeHotkeys.enableLecturas (missing = true). When off, the tool
// itself, its shortcut, and the Bandas rings/gradient stay exactly as they
// are — only the per-token Lectura items (icon/ring/circle + label) are
// skipped, leaving plain Ranges-style distance rings with no per-token
// readings.
let activeLecturasEnabled = true;
let activeDpi = 0;
// The Origen's own footprint radius (grid units), 0 for a free-point
// Medición. Only its excess over a standard 1-grid-unit token (see
// excessRadius in engine/distance.ts) actually affects Lectura matching.
let activeOriginRadius = 0;
let sortedBands: Band[] = [];
let bandIndex = 0;
// tokenId -> signed height in grid units (positive = marked "up", negative =
// "down"), resolved once per Medición against the active BandSet. Missing
// entry means no marker / its Banda was deleted — treated as ground (0).
let activeTokenHeights: Map<string, number> = new Map();
// Snapshot of the tokens being measured, taken once when the Medición
// starts. onToolDragMove fires far faster than an async re-fetch of live
// token positions can resolve, so refreshing from a fresh async call on
// every pointer move made the rings visibly lag behind and "jump" once a
// stale call finally landed. Reading from this cached, synchronous snapshot
// keeps the whole reposition+relabel step in lockstep with the pointer, at
// the reasonable cost of not reflecting another player moving a token mid-
// measurement.
let activeTokens: Image[] = [];

// onToolDragMove can fire far more often than the screen repaints (raw
// mousemove events, not frame-synced). Doing the full reposition+relabel
// work on every single one of those events is what made the drag feel
// heavy; coalescing to roughly once per frame (~60fps) keeps it visually
// identical while cutting the actual work down a lot. This runs in the
// extension's hidden background document, which browsers can suspend
// requestAnimationFrame in (it's not actually being painted), so a short
// setTimeout is used instead — it isn't tied to rendering and reliably
// fires either way.
let pendingPointerPosition: Vector2 | null = null;
let refreshScheduled = false;

function scheduleRefresh(pointerPosition: Vector2) {
  pendingPointerPosition = pointerPosition;
  if (refreshScheduled) {
    return;
  }
  refreshScheduled = true;
  setTimeout(() => {
    refreshScheduled = false;
    if (!pendingPointerPosition) {
      return;
    }
    activeCenter = pendingPointerPosition;
    activeLecturaCenter = pendingPointerPosition;
    pendingPointerPosition = null;
    refreshItems();
    if (shaders.length > 0) {
      OBR.scene.local.updateItems(shaders, (items) => {
        for (const item of items) {
          item.position = activeCenter;
        }
      });
    }
  }, 16);
}

// Same throttling reasoning as scheduleRefresh above, but for the
// relocate-a-token drag path: only activeLecturaCenter (and therefore the
// Lecturas) moves here — activeCenter/the rings/shaders intentionally stay
// put, that's the frozen-preview feature.
let pendingLecturaPosition: Vector2 | null = null;
let lecturaRefreshScheduled = false;

function scheduleLecturaRefresh(position: Vector2) {
  pendingLecturaPosition = position;
  if (lecturaRefreshScheduled) {
    return;
  }
  lecturaRefreshScheduled = true;
  setTimeout(() => {
    lecturaRefreshScheduled = false;
    if (!pendingLecturaPosition) {
      return;
    }
    activeLecturaCenter = pendingLecturaPosition;
    pendingLecturaPosition = null;
    refreshItems();
  }, 16);
}

function getRadiusForBand(radius: number, dpi: number) {
  // No +dpi/2 grid-alignment fudge here (unlike Ranges, which this was
  // copied from): Lecturas compare the raw band.radius directly, so the
  // drawn ring has to match that exactly or the ring visually promises a
  // boundary the Lectura text doesn't agree with. The Origen's own excess
  // radius (see excessRadius) and the flat Tolerancia margin are both
  // added for the same reason — a big Origen token's rings/shader need to
  // visually grow by the same amount its Lecturas already do, and so does
  // any extra Tolerancia slack, or the drawing promises a boundary the
  // math doesn't agree with.
  const tolerance = (activeBandSet?.tolerance ?? DEFAULT_TOLERANCE) / 100;
  return (radius + excessRadius(activeOriginRadius) + tolerance) * dpi;
}

function getBandRing(
  center: Vector2,
  offset: Vector2,
  size: number,
  name: string,
  color: string,
  shape: BandSet["shape"]
) {
  return buildShape()
    .fillOpacity(0)
    .strokeWidth(2)
    .strokeOpacity(0.9)
    .strokeColor(color)
    .strokeDash([10, 10])
    .shapeType(shape === "square" ? "RECTANGLE" : "CIRCLE")
    .position(Math2.subtract(center, offset))
    .width(size)
    .height(size)
    .name(name)
    .metadata({
      [getPluginId("offset")]: offset,
    })
    .disableHit(true)
    .layer("POPOVER")
    .build();
}

function getBandLabel(
  center: Vector2,
  offset: Vector2,
  text: string,
  backgroundColor: string,
  textColor: string,
  opacityScale = 1
) {
  return buildLabel()
    .fillColor(textColor)
    .fillOpacity(1.0 * opacityScale)
    .plainText(text)
    .position(Math2.subtract(center, offset))
    .pointerDirection("UP")
    .backgroundOpacity(0.8 * opacityScale)
    .backgroundColor(backgroundColor)
    .padding(8)
    .cornerRadius(20)
    .pointerHeight(0)
    .metadata({
      [getPluginId("offset")]: offset,
    })
    .minViewScale(1)
    .disableHit(true)
    .layer("POPOVER")
    .build();
}

function getShaders(
  center: Vector2,
  theme: Theme,
  bandSet: BandSet,
  dpi: number
): Item[] {
  const uniforms: Uniform[] = [];

  /*
   * Data uniform layout (each mat3 contains 2 circles):
   * [r1, r2, 0]  [R1, G1, B1]  [R2, G2, B2]
   * Where: r = radius, R/G/B = color components (0.0-1.0)
   * The shader is hard coded with 5 mat3 uniforms, so it supports up to 10 bands
   */
  if (bandSet.bands.length > 10) {
    console.warn(
      `Bandas "${bandSet.name}" has more than 10 bands, the shader needs updating to support more bands`
    );
  }
  for (let dataIndex = 0; dataIndex < 5; dataIndex++) {
    const band1Index = dataIndex * 2;
    const band2Index = dataIndex * 2 + 1;
    const color1 = theme.colors[band1Index % theme.colors.length];
    const color2 = theme.colors[band2Index % theme.colors.length];
    const band1 = bandSet.bands[band1Index];
    const band2 = bandSet.bands[band2Index];
    const radius1 = band1 ? getRadiusForBand(band1.radius, dpi) : 0;
    const radius2 = band2 ? getRadiusForBand(band2.radius, dpi) : 0;
    const value: Matrix = [
      radius1,
      radius2,
      0,
      color1.r / 255,
      color1.g / 255,
      color1.b / 255,
      color2.r / 255,
      color2.g / 255,
      color2.b / 255,
    ];

    uniforms.push({
      name: `data${dataIndex + 1}`,
      value: value,
    });
  }

  const darken = buildEffect()
    .sksl(
      `
half4 main(float2 coord) {
    return half4(0.85, 0.85, 0.85, 1.0);
}
      `
    )
    .effectType("VIEWPORT")
    .layer("POINTER")
    .zIndex(0)
    .blendMode("MULTIPLY")
    .build();

  const color = buildEffect()
    .sksl(ringSksl)
    .effectType("VIEWPORT")
    .position(center)
    .layer("POINTER")
    .zIndex(1)
    .blendMode("COLOR")
    .uniforms([
      ...uniforms,
      {
        name: "minFalloff",
        value: 0.1,
      },
      {
        name: "maxFalloff",
        value: 0.6,
      },
      {
        name: "type",
        value: bandSet.shape === "square" ? 1 : 0,
      },
    ])
    .build();

  return [darken, color];
}

function getBandItems(
  center: Vector2,
  theme: Theme,
  bandSet: BandSet,
  dpi: number,
  gridScale: GridScale
): Item[] {
  const items = [];
  for (let i = 0; i < bandSet.bands.length; i++) {
    const baseColor = theme.colors[i % theme.colors.length];
    const color = getColorString(baseColor);
    const textColor = getLabelTextColor(baseColor, 180);
    const band = bandSet.bands[i];
    const radius = getRadiusForBand(band.radius, dpi);
    let bandOffset = { x: 0, y: 0 };
    if (bandSet.shape === "square") {
      bandOffset = { x: radius, y: radius };
    }
    items.push(
      getBandRing(center, bandOffset, radius * 2, band.name, color, bandSet.shape)
    );
    const labelItemOffset = { x: 0, y: radius + labelOffset };
    let labelText = "";
    if (!bandSet.hideLabel) {
      labelText += band.name;
    }
    if (!bandSet.hideSize) {
      labelText += `${labelText ? " " : ""}${flattenGridScale(
        gridScale,
        band.radius
      )}`;
    }
    if (labelText) {
      items.push(
        getBandLabel(center, labelItemOffset, labelText, color, textColor)
      );
    }
  }

  return items;
}

const lecturaColor: Color = { r: 66, g: 66, b: 66 };
const heightLabelOffset: Vector2 = { x: 0, y: -40 };

/**
 * Half the token's larger on-screen dimension, in grid units — how big
 * Tolerancia treats the token as being. Reuses the same footprint math the
 * icon anchor/ring/circle sizing already does (accounts for the token's
 * real image size, grid offset, and scale), so a Large/Huge creature
 * actually needs more of itself in range than a 1×1 token, instead of
 * everyone being measured as if they were the same fixed half-square.
 */
function getTokenRadius(token: Image, dpi: number): number {
  const { scaledWidth, scaledHeight } = getTokenBounds(token, dpi);
  return Math.max(scaledWidth, scaledHeight) / dpi / 2;
}

/** Same tolerance-adjusted distance Bandas are matched against, shared by getLecturaBandIndex and the Filtro check so both agree on "how far is this token". */
function getLecturaDistance(
  tokenPosition: Vector2,
  dpi: number,
  height: number,
  bandSet: BandSet,
  tokenRadius: number
): number {
  const dx = (tokenPosition.x - activeLecturaCenter.x) / dpi;
  const dy = (tokenPosition.y - activeLecturaCenter.y) / dpi;
  const centerDistance = distance3D(dx, dy, height, bandSet.metric);
  const tolerance = (bandSet.tolerance ?? DEFAULT_TOLERANCE) / 100;
  const excessRadiusSum = excessRadius(activeOriginRadius) + excessRadius(tokenRadius);
  return effectiveDistance(centerDistance, excessRadiusSum, tolerance);
}

/** Index into bandSet.bands of the Banda a token is currently in, or undefined if out of range. */
function getLecturaBandIndex(distance: number, bandSet: BandSet): number | undefined {
  const band = findBand(distance, bandSet);
  return band ? bandSet.bands.indexOf(band) : undefined;
}

// A token beyond the Filtro's distance is dimmed rather than hidden, so
// "which tokens are in range" reads as a highlight against everything else
// staying visible for context, instead of losing track of them entirely.
const FILTERED_OUT_OPACITY_SCALE = 0.25;

function isWithinFilter(distance: number, bandSet: BandSet): boolean {
  if (!bandSet.filterEnabled || !bandSet.filterBandId) {
    return true;
  }
  const filterBand = bandSet.bands.find((band) => band.id === bandSet.filterBandId);
  // The referenced Banda was deleted — don't silently hide/dim every
  // Lectura until the user notices and re-picks one.
  if (!filterBand) {
    return true;
  }
  return distance <= filterBand.radius;
}

function lecturaOpacityScale(withinFilter: boolean): number {
  return withinFilter ? 1 : FILTERED_OUT_OPACITY_SCALE;
}

// bandIndex is signed: 0 = Suelo, positive = that many Bandas up, negative =
// that many Bandas down — mirrors the up/down direction a persistent token
// marker can have, so grabbing a marked token as Origen can seed this
// exactly and Z/X can keep going from there in either direction.
function currentHeight() {
  if (bandIndex === 0) {
    return 0;
  }
  return bandIndex > 0
    ? sortedBands[bandIndex - 1].radius
    : -sortedBands[-bandIndex - 1].radius;
}

/**
 * The Origen-to-token height gap for the distance formula. Every metric only
 * ever uses this squared or via its absolute value, so which side is higher
 * doesn't need to be tracked separately from the sign here.
 */
function tokenDz(token: Item) {
  return currentHeight() - (activeTokenHeights.get(token.id) ?? 0);
}

function currentHeightLabelText() {
  if (bandIndex === 0) {
    return translate(activeLanguage, "onMap.ground");
  }
  // Owlbear's map-text font is missing the ↑/↓ glyphs (renders as a
  // missing-character box) but does support emoji, so ⬆️/⬇️ it is — also
  // much narrower than a "(arriba)"/"(abajo)" suffix.
  return bandIndex > 0
    ? `${sortedBands[bandIndex - 1].name} ⬆️`
    : `${sortedBands[-bandIndex - 1].name} ⬇️`;
}

/** Mirrors currentHeight()'s sign-branching, as the {bandId, direction} shape a persistent marker is stored as. */
function currentOriginBandRef(): TokenHeightState | undefined {
  if (bandIndex === 0) {
    return undefined;
  }
  return bandIndex > 0
    ? { bandId: sortedBands[bandIndex - 1].id, direction: "up" }
    : { bandId: sortedBands[-bandIndex - 1].id, direction: "down" };
}

/** downTarget with its stale snapshot position swapped for the live dragged one, if a drag is in progress. */
function liveDownTargetImage(): Image | undefined {
  if (!downTarget || !isImage(downTarget)) {
    return undefined;
  }
  return liveTokenPosition ? { ...downTarget, position: liveTokenPosition } : downTarget;
}

const ORIGIN_MARKER_MAX_ATTEMPTS = 3;
const ORIGIN_MARKER_RETRY_DELAY_MS = 200;

/**
 * Writes or clears the token's marker via the exact same functions the
 * Altura picker's dropdown uses. Every OBR.scene.* call is a real
 * postMessage round trip with its own 5s timeout (the SDK caches nothing
 * locally) — during a drag there's other traffic sharing that same channel
 * (position updates, ring/label refreshes), so an occasional call failing
 * outright is a real possibility, not just theoretical. Returns whether it
 * actually succeeded so the caller can retry instead of leaving a stale
 * marker sitting there until the next keypress happens to trigger a fresh
 * attempt.
 */
async function writeOriginMarker(request: OriginMarkerRequest): Promise<boolean> {
  try {
    if (request.ref) {
      originMarkerKnownExisting = await setTokenHeightMarker(
        [request.token],
        request.ref.bandId,
        request.ref.direction,
        request.bandSet,
        request.dpi,
        originMarkerKnownExisting
      );
    } else {
      await clearTokenHeightMarker([request.token.id], originMarkerKnownExisting);
      originMarkerKnownExisting = [];
    }
    return true;
  } catch (err) {
    console.error("Daggerheight: failed to sync token height marker", err);
    // The write may have actually landed server-side despite this client
    // not getting confirmation — forget the cache rather than risk the next
    // attempt trusting a stale "no marker" guess and creating a duplicate.
    originMarkerKnownExisting = undefined;
    return false;
  }
}

/**
 * Writes the grabbed token's real Altura marker for real, live during the
 * drag — the Medición is already visible to the whole room while in
 * progress, so this keeps the marker consistent with that instead of only
 * previewing the height change locally via the ephemeral label. Coalesced:
 * a press that lands while a write is already pending just replaces
 * originMarkerSyncLatest with its own (newer) request instead of queuing
 * another real write, so a fast key-mashing burst can't fire one real
 * scene-write RPC per keypress — this keeps at most one write in flight
 * plus one trailing write, and whichever press was actually last always
 * wins. Returns the same promise every caller in a coalesced batch shares,
 * so finalizeMove()/restoreOriginMarker() can await "everything settles".
 */
function scheduleOriginMarkerSync(ref: TokenHeightState | undefined): Promise<void> {
  const token = liveDownTargetImage();
  if (!token || !activeBandSet) {
    return originMarkerSyncTail;
  }
  originMarkerSyncLatest = { token, ref, bandSet: activeBandSet, dpi: activeDpi, attempt: 0 };
  if (originMarkerSyncPending) {
    // A write is already in flight (or about to drain originMarkerSyncLatest
    // again) — this press's request was just recorded above, so there's
    // nothing more to do here. Resetting "pending" only once the whole
    // drain loop below actually finishes (not before each write) is what
    // makes this a real coalesce instead of spawning a second parallel
    // task for a press that lands mid-write.
    return originMarkerSyncTail;
  }
  originMarkerSyncPending = true;
  originMarkerSyncTail = (async () => {
    for (;;) {
      const latest: OriginMarkerRequest | null = originMarkerSyncLatest;
      if (!latest) {
        break;
      }
      originMarkerSyncLatest = null;
      const ok = await writeOriginMarker(latest);
      // Only retry a failure if nothing newer has come in while it was
      // running — a fresher request already supersedes it, so retrying the
      // stale one would just be wasted work (or worse, could land after
      // the newer one and clobber it back).
      if (!ok && !originMarkerSyncLatest && latest.attempt + 1 < ORIGIN_MARKER_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, ORIGIN_MARKER_RETRY_DELAY_MS));
        if (!originMarkerSyncLatest) {
          originMarkerSyncLatest = { ...latest, attempt: latest.attempt + 1 };
        }
      }
    }
    originMarkerSyncPending = false;
  })();
  return originMarkerSyncTail;
}

/** Undoes any scheduleOriginMarkerSync() writes when a drag is cancelled instead of released. */
async function restoreOriginMarker() {
  const token = liveDownTargetImage();
  if (!token || !activeBandSet || !activeAltitudeEnabled) {
    return;
  }
  // Let anything already scheduled land first, so it can't race in after
  // (and overwrite) the restore below with a stale in-progress height.
  await originMarkerSyncTail;
  await writeOriginMarker({
    token,
    ref: originMarkerBeforeEdit,
    bandSet: activeBandSet,
    dpi: activeDpi,
    attempt: 0,
  });
}

const lecturaLabelOffset: Vector2 = { x: 0, y: 40 };
// Ring/circle modes are sized to exactly match the token's own footprint —
// no extra padding, it read as visibly bigger than the token otherwise.
const LECTURA_SHAPE_PADDING = 1;

// dz = Origen height - token height (see tokenDz). Positive means the
// Origen is higher, i.e. the token is below it; negative means the token is
// above the Origen.
// Owlbear's own text-rendering font doesn't include ↑/↓ glyphs (they render
// as a missing-character box on the map) but does support emoji.
function directionArrow(dz: number): string {
  if (dz > 0) {
    return " ⬇️";
  }
  if (dz < 0) {
    return " ⬆️";
  }
  return "";
}

/** Mirrors directionArrow's sign-branching, as the up/down taper an icon-stack Lectura should point. */
function lecturaIconDirection(dz: number): Direction {
  return dz > 0 ? "down" : "up";
}

function getLecturaLabelText(index: number | undefined, dz: number, bandSet: BandSet): string {
  const bandName =
    index === undefined ? translate(activeLanguage, "onMap.outOfRange") : bandSet.bands[index].name;
  return `${bandName}${directionArrow(dz)}`;
}

function lecturaColorFor(index: number | undefined, theme: Theme): Color {
  return index === undefined ? lecturaColor : theme.colors[index % theme.colors.length];
}

/** Center + padded size shared by the ring and circle Visualización modes. */
function lecturaShapeGeometry(token: Image, dpi: number) {
  const { topLeft, scaledWidth, scaledHeight } = getTokenBounds(token, dpi);
  return {
    center: { x: topLeft.x + scaledWidth / 2, y: topLeft.y + scaledHeight / 2 },
    size: Math.max(scaledWidth, scaledHeight) * LECTURA_SHAPE_PADDING,
  };
}

/** Top-left position for a Shape item of the given size/center, accounting for RECTANGLE anchoring at its corner vs CIRCLE at its center. */
function lecturaShapePosition(center: Vector2, size: number, bandShape: BandSet["shape"]): Vector2 {
  const offset = bandShape === "square" ? { x: size / 2, y: size / 2 } : { x: 0, y: 0 };
  return Math2.subtract(center, offset);
}

function withLecturaMetadata(item: Item, tokenId: string, role: "visual" | "label"): Item {
  return {
    ...item,
    metadata: {
      ...item.metadata,
      [getPluginId("lecturaTokenId")]: tokenId,
      [getPluginId("lecturaRole")]: role,
    },
  };
}

function buildLecturaVisualItem(
  token: Image,
  dpi: number,
  bandSet: BandSet,
  theme: Theme,
  index: number | undefined,
  withinFilter: boolean,
  dz: number
): Item {
  const visualization = bandSet.visualization ?? "icon";
  const color = getColorString(lecturaColorFor(index, theme));
  const opacityScale = lecturaOpacityScale(withinFilter);

  if (visualization === "icon") {
    const shape =
      (index !== undefined ? bandSet.bands[index].iconShape : undefined) ??
      bandSet.iconShape ??
      "circle";
    // Opposite side from the persistent marker's own position, so the two
    // don't render on top of each other when a measured token has both.
    const position = oppositeIconPosition(bandSet.iconPosition ?? "top");
    const size = bandSet.iconSize ?? 1;
    const iconDistance = bandSet.iconDistance ?? 0.15;
    const direction = lecturaIconDirection(dz);
    const commands =
      index === undefined
        ? []
        : buildIconStackCommands(shape, index + 1, dpi, size, position, direction);
    const item = buildPath()
      .commands(commands)
      .fillColor(color)
      .fillOpacity(1 * opacityScale)
      .strokeColor("#111827")
      .strokeOpacity(0.65 * opacityScale)
      .strokeWidth(dpi * getStrokeWidthRatio(shape))
      .position(computeIconAnchor(token, dpi, position, iconDistance))
      .disableHit(true)
      .layer("POPOVER")
      .build();
    return withLecturaMetadata(item, token.id, "visual");
  }

  const { center, size } = lecturaShapeGeometry(token, dpi);
  const shapeType = bandSet.shape === "square" ? "RECTANGLE" : "CIRCLE";
  const position = lecturaShapePosition(center, size, bandSet.shape);

  if (visualization === "ring") {
    const item = buildShape()
      .shapeType(shapeType)
      .fillOpacity(0)
      .strokeColor(color)
      .strokeOpacity((index === undefined ? 0 : 0.9) * opacityScale)
      .strokeWidth(dpi * (bandSet.ringWidth ?? 0.05))
      .position(position)
      .width(size)
      .height(size)
      .disableHit(true)
      .layer("POPOVER")
      .build();
    return withLecturaMetadata(item, token.id, "visual");
  }

  // circle
  const item = buildShape()
    .shapeType(shapeType)
    .fillColor(color)
    .fillOpacity((index === undefined ? 0 : bandSet.circleOpacity ?? 0.35) * opacityScale)
    .strokeOpacity(0)
    .position(position)
    .width(size)
    .height(size)
    .disableHit(true)
    .layer("POPOVER")
    .build();
  return withLecturaMetadata(item, token.id, "visual");
}

function buildLecturaLabelItem(
  token: Image,
  bandSet: BandSet,
  theme: Theme,
  index: number | undefined,
  dz: number,
  withinFilter: boolean
): Item {
  const color = lecturaColorFor(index, theme);
  const textColor = getLabelTextColor(color, 180);
  // Unlike the icon/ring/circle visual (dimmed, still visible for context),
  // a filtered-out token's label is hidden outright — the Filtro is meant
  // to answer "which tokens match", and a dimmed label is still readable
  // clutter for tokens that don't.
  const item = getBandLabel(
    token.position,
    lecturaLabelOffset,
    getLecturaLabelText(index, dz, bandSet),
    getColorString(color),
    textColor,
    withinFilter ? 1 : 0
  );
  return withLecturaMetadata(item, token.id, "label");
}

function buildLecturaItems(
  token: Image,
  dpi: number,
  bandSet: BandSet,
  theme: Theme
): Item[] {
  const dz = tokenDz(token);
  const distance = getLecturaDistance(token.position, dpi, dz, bandSet, getTokenRadius(token, dpi));
  const index = getLecturaBandIndex(distance, bandSet);
  const withinFilter = isWithinFilter(distance, bandSet);
  const items = [buildLecturaVisualItem(token, dpi, bandSet, theme, index, withinFilter, dz)];
  if (bandSet.showLabel) {
    items.push(buildLecturaLabelItem(token, bandSet, theme, index, dz, withinFilter));
  }
  return items;
}

function getHeightLabelItem(center: Vector2): Item {
  const textColor = getLabelTextColor(lecturaColor, 180);
  const item = getBandLabel(
    center,
    heightLabelOffset,
    currentHeightLabelText(),
    getColorString(lecturaColor),
    textColor
  );
  return {
    ...item,
    metadata: { ...item.metadata, [getPluginId("heightLabel")]: true },
  };
}

// Existing items are mutated in place (same ids) rather than rebuilt from
// scratch each time — replacing the whole array with freshly built items
// (new ids every call) made the synced rings appear stuck/laggy for other
// clients, since it stops looking like "move this item" and starts looking
// like "delete everything, add it all back" to the interaction sync.
function refreshItems() {
  if (!bandInteraction || !activeBandSet || !activeTheme) {
    return;
  }
  const bandSet = activeBandSet;
  const theme = activeTheme;
  const tokenById = new Map(activeTokens.map((token) => [token.id, token]));
  const heightLabelText = currentHeightLabelText();
  const update = bandInteraction[0];
  update((draft) => {
    for (const item of draft) {
      const lecturaTokenId = getMetadata(
        item.metadata,
        getPluginId("lecturaTokenId"),
        ""
      );
      if (lecturaTokenId) {
        const token = tokenById.get(lecturaTokenId);
        if (token) {
          const role = getMetadata(item.metadata, getPluginId("lecturaRole"), "visual");
          const dz = tokenDz(token);
          const distance = getLecturaDistance(
            token.position,
            activeDpi,
            dz,
            bandSet,
            getTokenRadius(token, activeDpi)
          );
          const index = getLecturaBandIndex(distance, bandSet);
          const withinFilter = isWithinFilter(distance, bandSet);
          const opacityScale = lecturaOpacityScale(withinFilter);
          if (role === "label" && isLabel(item)) {
            // Hidden outright when filtered out, not just dimmed — see
            // buildLecturaLabelItem's comment for why labels differ from
            // the icon/ring/circle visual.
            const labelOpacity = withinFilter ? 1 : 0;
            const color = lecturaColorFor(index, theme);
            item.position = Math2.subtract(token.position, lecturaLabelOffset);
            item.text.plainText = getLecturaLabelText(index, dz, bandSet);
            item.text.style.fillColor = getLabelTextColor(color, 180);
            item.text.style.fillOpacity = labelOpacity;
            item.style.backgroundColor = getColorString(color);
            item.style.backgroundOpacity = 0.8 * labelOpacity;
          } else {
            const visualization = bandSet.visualization ?? "icon";
            const color = getColorString(lecturaColorFor(index, theme));
            if (visualization === "icon" && isPath(item)) {
              const shape =
                (index !== undefined ? bandSet.bands[index].iconShape : undefined) ??
                bandSet.iconShape ??
                "circle";
              const position = oppositeIconPosition(bandSet.iconPosition ?? "top");
              const size = bandSet.iconSize ?? 1;
              const iconDistance = bandSet.iconDistance ?? 0.15;
              item.position = computeIconAnchor(token, activeDpi, position, iconDistance);
              item.commands =
                index === undefined
                  ? []
                  : buildIconStackCommands(
                      shape,
                      index + 1,
                      activeDpi,
                      size,
                      position,
                      lecturaIconDirection(dz)
                    );
              item.style.fillColor = color;
              item.style.fillOpacity = 1 * opacityScale;
              item.style.strokeOpacity = 0.65 * opacityScale;
            } else if (isShape(item)) {
              const { center, size } = lecturaShapeGeometry(token, activeDpi);
              item.position = lecturaShapePosition(center, size, bandSet.shape);
              item.width = size;
              item.height = size;
              if (visualization === "ring") {
                item.style.strokeColor = color;
                item.style.strokeOpacity = (index === undefined ? 0 : 0.9) * opacityScale;
                item.style.strokeWidth = activeDpi * (bandSet.ringWidth ?? 0.05);
                item.style.fillOpacity = 0;
              } else {
                item.style.fillColor = color;
                item.style.fillOpacity =
                  (index === undefined ? 0 : bandSet.circleOpacity ?? 0.35) * opacityScale;
                item.style.strokeOpacity = 0;
              }
            }
          }
        }
        continue;
      }
      if (getMetadata(item.metadata, getPluginId("heightLabel"), false)) {
        if (isLabel(item)) {
          item.position = Math2.subtract(activeCenter, heightLabelOffset);
          item.text.plainText = heightLabelText;
        }
        continue;
      }
      const offset = getMetadata(item.metadata, getPluginId("offset"), {
        x: 0,
        y: 0,
      });
      item.position = Math2.subtract(activeCenter, offset);
    }
  });
}

function cleanup() {
  if (bandInteraction) {
    const cancel = bandInteraction[1];
    cancel();
    bandInteraction = null;
  }
  if (tokenInteraction) {
    const cancel = tokenInteraction[1];
    cancel();
    tokenInteraction = null;
  }
  if (shaders.length > 0) {
    OBR.scene.local.deleteItems(shaders.map((shader) => shader.id));
    shaders = [];
  }
  downTarget = null;
  activeBandSet = null;
  activeTheme = null;
  sortedBands = [];
  bandIndex = 0;
  activeTokens = [];
  activeTokenHeights = new Map();
  pendingPointerPosition = null;
  pendingLecturaPosition = null;
  originMarkerBeforeEdit = undefined;
  originMarkerKnownExisting = undefined;
  liveTokenPosition = null;
}

async function finalizeMove() {
  if (tokenInteraction) {
    const final = tokenInteraction[0](() => {});
    const withAttachments = await OBR.scene.items.getItemAttachments([
      final.id,
    ]);
    withAttachments.sort((a, b) => a.zIndex - b.zIndex);
    await OBR.scene.items.updateItems(withAttachments, (items) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id === final.id) {
          item.position = final.position;
        }
        if (!item.disableAutoZIndex) {
          item.zIndex = Date.now() + i;
        }
      }
    });
  }
  // Ensures the final height actually lands even if the last keypress's
  // coalesced write is still pending/in flight when the drag is released.
  if (activeAltitudeEnabled) {
    await scheduleOriginMarkerSync(currentOriginBandRef());
  }
}

export function createMeasureTool(language: Language, hotkeys: GlobalSettings) {
  OBR.tool.createMode({
    id: getPluginId("mode/measure"),
    icons: [
      {
        icon: measureIcon,
        label: translate(language, "toolbar.medicion"),
        filter: {
          activeTools: ["rodeo.owlbear.tool/measure"],
          permissions: ["RULER_CREATE"],
        },
      },
    ],
    onToolClick() {
      return false;
    },
    async onToolDown(_, event) {
      cleanup();

      const tokenPosition =
        event.target && !event.target.locked && event.target.position;
      const initialPosition = tokenPosition || event.pointerPosition;
      // Account for the grab offset so the token doesn't snap to the pointer
      if (tokenPosition) {
        grabOffset = Math2.subtract(event.pointerPosition, tokenPosition);
      } else {
        grabOffset = { x: 0, y: 0 };
      }

      // Check the token interaction first so the move event doesn't fire for the
      // band items while checking the permissions
      if (
        event.target &&
        !event.target.locked &&
        event.target.type === "IMAGE" &&
        (await canUpdateItem(event.target))
      ) {
        downTarget = event.target;
      }

      const [sceneMetadata, dpi, gridScale] = await Promise.all([
        OBR.scene.getMetadata(),
        OBR.scene.grid.getDpi(),
        OBR.scene.grid.getScale(),
      ]);
      const language = languageFromMetadata(sceneMetadata);
      const rawBandSet = (sceneMetadata[getPluginId("bandSet")] ??
        getDefaultBandSets(language)[0]) as BandSet;
      const bandSet = resolveBandSet(rawBandSet, language);

      const theme = getStoredTheme();
      activeCenter = initialPosition;
      activeLecturaCenter = initialPosition;
      activeBandSet = bandSet;
      activeTheme = theme;
      activeLanguage = language;
      activeHotkeys = globalSettingsFromMetadata(sceneMetadata);
      activeAltitudeEnabled = activeHotkeys.enableAltitude ?? true;
      activeLecturasEnabled = activeHotkeys.enableLecturas ?? true;
      activeDpi = dpi;
      activeOriginRadius =
        downTarget && isImage(downTarget) ? getTokenRadius(downTarget, dpi) : 0;
      sortedBands = [...bandSet.bands].sort((a, b) => a.radius - b.radius);

      shaders = getShaders(initialPosition, theme, bandSet, dpi);
      await OBR.scene.local.addItems(shaders);

      const [tokens, heightMarkers] = await Promise.all([
        OBR.scene.items.getItems<Image>(
          (item): item is Image =>
            isImage(item) && item.layer === "CHARACTER" && item.id !== downTarget?.id
        ),
        activeAltitudeEnabled ? getAllTokenHeightMarkers() : Promise.resolve([]),
      ]);
      activeTokens = tokens;
      activeTokenHeights = new Map();
      for (const marker of heightMarkers) {
        const state = marker.attachedTo && getTokenHeightState(marker);
        const band = state && bandSet.bands.find((b) => b.id === state.bandId);
        if (marker.attachedTo && state && band) {
          activeTokenHeights.set(
            marker.attachedTo,
            state.direction === "up" ? band.radius : -band.radius
          );
        }
      }

      // If the click landed on a token that already has its own height
      // marker, start the Medición at that height instead of always
      // resetting to Suelo — otherwise you'd have to manually replay the
      // marker with Z/X every time. Skipped entirely when the altitude
      // feature is off — bandIndex just stays 0 (Suelo) always, matching
      // plain Ranges behavior.
      bandIndex = 0;
      if (activeAltitudeEnabled) {
        const originId = event.target?.id;
        const originMarker = originId && heightMarkers.find((m) => m.attachedTo === originId);
        const originState = originMarker && getTokenHeightState(originMarker);
        // Only relevant when downTarget is actually set — a free-point/locked
        // click never gets its marker written back by scheduleOriginMarkerSync().
        originMarkerBeforeEdit = downTarget ? originState || undefined : undefined;
        // Seeds writeOriginMarker's cache from the same marker list already
        // fetched above — no extra round trip.
        originMarkerKnownExisting = downTarget
          ? originMarker
            ? [originMarker]
            : []
          : undefined;
        if (originState) {
          const sortedIndex = sortedBands.findIndex((b) => b.id === originState.bandId);
          if (sortedIndex !== -1) {
            bandIndex = (sortedIndex + 1) * (originState.direction === "up" ? 1 : -1);
          }
        }
      } else {
        originMarkerBeforeEdit = undefined;
        originMarkerKnownExisting = undefined;
      }
      const bandItems = getBandItems(activeCenter, theme, bandSet, dpi, gridScale);
      const lecturaItems = activeLecturasEnabled
        ? activeTokens.flatMap((token) => buildLecturaItems(token, dpi, bandSet, theme))
        : [];
      const heightItem = activeAltitudeEnabled ? [getHeightLabelItem(activeCenter)] : [];
      bandInteraction = await OBR.interaction.startItemInteraction([
        ...bandItems,
        ...lecturaItems,
        ...heightItem,
      ]);
    },
    async onToolDragStart() {
      if (downTarget) {
        tokenInteraction = await OBR.interaction.startItemInteraction(
          downTarget
        );
      }
    },
    async onToolDragMove(_, event) {
      // Check the down target first as that's the earliest indicator of a valid target
      if (downTarget) {
        if (tokenInteraction) {
          const update = tokenInteraction[0];
          const position = await OBR.scene.grid.snapPosition(
            Math2.subtract(event.pointerPosition, grabOffset)
          );
          update?.((token) => {
            token.position = position;
          });
          liveTokenPosition = position;
          scheduleLecturaRefresh(position);
        }
      } else if (bandInteraction) {
        scheduleRefresh(event.pointerPosition);
      }
    },
    onKeyDown(_, event) {
      if (!bandInteraction || event.repeat || !activeAltitudeEnabled) {
        return;
      }
      if (event.code === letterToCode(activeHotkeys.hotkeyRaise)) {
        bandIndex = Math.min(bandIndex + 1, sortedBands.length);
        refreshItems();
      } else if (event.code === letterToCode(activeHotkeys.hotkeyLower)) {
        bandIndex = Math.max(bandIndex - 1, -sortedBands.length);
        refreshItems();
      } else {
        return;
      }
      // Not awaited: the ephemeral label above already updated synchronously
      // via refreshItems(); the persistent marker's own write is coalesced
      // (see scheduleOriginMarkerSync's comment) so onKeyDown doesn't block
      // on the network for every press.
      if (downTarget) {
        scheduleOriginMarkerSync(currentOriginBandRef());
      }
    },
    async onToolDragEnd() {
      // cleanup() nulls downTarget/activeBandSet/bandIndex — it has to run
      // after finalizeMove() actually finishes, not just after it's called,
      // or finalizeMove()'s own trailing marker-sync call (itself after an
      // earlier await) ends up reading state cleanup() already reset,
      // silently doing nothing. Without this, releasing right as a marker
      // write was still catching up could leave the persisted marker one
      // step behind — and re-grabbing the token immediately after seeds the
      // new ephemeral label from that stale marker.
      await finalizeMove();
      cleanup();
    },
    async onToolDragCancel() {
      await restoreOriginMarker();
      cleanup();
    },
    async onDeactivate() {
      await restoreOriginMarker();
      cleanup();
    },
    async onToolUp() {
      await finalizeMove();
      cleanup();
    },
    shortcut: hotkeys.hotkeyActivate,
    cursors: [
      {
        cursor: "grabbing",
        filter: {
          dragging: true,
          target: [
            {
              value: "IMAGE",
              key: "type",
            },
          ],
        },
      },
      {
        cursor: "grab",
        filter: {
          dragging: false,
          target: [
            {
              value: "IMAGE",
              key: "type",
            },
            {
              value: false,
              key: "locked",
            },
          ],
        },
      },
      {
        cursor: "crosshair",
      },
    ],
  });
}
