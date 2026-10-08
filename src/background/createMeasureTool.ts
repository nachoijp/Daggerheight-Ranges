import OBR, {
  buildEffect,
  buildShape,
  isImage,
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
import {
  LocalMeasureView,
  mirrorEnd,
  mirrorHeightText,
  mirrorStart,
  mirrorStates,
} from "./measureMirror";
import {
  getBandLabel,
  sameLecturaState,
  type LecturaContext,
  type LecturaState,
} from "../render/lecturaItems";
import ringSksl from "./ring.frag";
import { getPluginId } from "../util/getPluginId";
import { getMetadata } from "../util/getMetadata";
import { getStoredTheme, Theme } from "../theme/themes";
import { getColorString, getLabelTextColor } from "../util/color";
import {
  DEFAULT_TOLERANCE,
  distance3D,
  effectiveDistance,
  excessRadius,
  shownDistance,
} from "../engine/distance";
import { findBand } from "../engine/bands";
import { Band, BandSet } from "../engine/types";
import { getDefaultBandSets, resolveBandSet } from "../bandSets/bandSets";
import { flattenGridScale } from "../util/flattenGridScale";
import { getTokenRadius } from "../render/iconAnchor";
import {
  clearTokenHeightMarker,
  getAllTokenHeightMarkers,
  getTokenHeightState,
  setTokenHeightMarker,
  tokenHeightsFromMarkers,
  type TokenHeightState,
} from "../tokenHeight/markers";
import { DEFAULT_LANGUAGE, languageFromMetadata, type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import {
  DEFAULT_GLOBAL_SETTINGS,
  globalSettingsFromMetadata,
  letterToCode,
  type GlobalSettings,
  type MarkerStyle,
} from "../settings/globalSettings";

type OriginMarkerRequest = {
  token: Image;
  ref: TokenHeightState | undefined;
  bandSet: BandSet;
  dpi: number;
  style: MarkerStyle;
  attempt: number;
};

let bandInteraction: InteractionManager<Item[]> | null = null;
// Owlbear stops network-syncing an interaction 15s after it starts — other
// clients' rings just vanish ("Interaction lasted too long: network sync
// stopped"; `setTimeout(..., 15*1e3)` in Owlbear's player-connection
// bundle, observed 2026-09-30 — undocumented, may change). Original Ranges
// has the same limit; rather than work around it, the mirrored gradient,
// Lecturas and height label are ended on other clients at the same moment,
// so the whole Medición disappears together there like a normal end
// instead of leaving a frozen gradient behind. Slightly early on purpose:
// Owlbear's own timer started a little before startItemInteraction
// resolved here. The measuring client's own view is unaffected.
const REMOTE_SYNC_CUTOFF_MS = 14900;
let remoteSyncCutoffTimer: ReturnType<typeof setTimeout> | null = null;
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
// Keyed by token: a released Medición's marker write lands after the next
// Medición may have started on another token (see releaseMedicion), and a
// cache meant for one token read for another said "no marker" and added a
// duplicate.
let originMarkerCache: { tokenId: string; markers: Path[] } | undefined;
// Bumped as each marker write starts. onToolDown seeds the cache from a
// marker list it fetched earlier; if any write started since, that list may
// already be stale, so the cache is left empty (look it up fresh) instead.
let originMarkerWrites = 0;
// downTarget itself is a snapshot taken once at onToolDown and never
// mutated, so its .position goes stale the moment a drag starts (the real
// position only updates on release, via saveTokenPosition). Track the live
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
let activeLanguage: Language = DEFAULT_LANGUAGE;
let activeHotkeys: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
// Mirrors activeHotkeys.enableAltitude (missing = true) — read fresh from
// module state elsewhere (onKeyDown, releaseMedicion, cancelMedicion)
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
// Mirrors activeHotkeys.showLecturaDistance (missing = false).
let activeShowDistance = false;
// Mirrors activeHotkeys.markerStyle (missing = "icons"): the grabbed token's
// marker writes need it, and it's already in hand from onToolDown's fetch.
let activeMarkerStyle: MarkerStyle = "icons";
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
// This client's own copy of the Lecturas + height label (client-local
// items, see measureMirror.ts), plus the last state drawn for each, so a
// refresh only touches — and only broadcasts — what actually changed.
let measureView: LocalMeasureView | null = null;
let activeLecturaStates: Map<string, LecturaState> = new Map();
let activeHeightLabelText = "";
// Bumped by cleanup(): lets onToolDown notice, after each of its awaits,
// that the Medición it was setting up already ended (a quick click whose
// onToolUp ran mid-setup) instead of leaving orphaned items behind — which
// would now include other clients' mirrored copies.
let toolDownGeneration = 0;

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

// The latest token-drag move, still waiting on its snapPosition round trip.
// Releasing right after a move used to read the token's position before that
// reply came back, so the token landed one (or, on a fast flick, every) step
// behind where it was dropped; releaseMedicion waits for it first. Replies come
// back in order, so the latest one being done means every earlier one is too.
// Never rejects (a failed snap just keeps the previous position).
let pendingMove: Promise<void> | null = null;

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
    refreshBandPositions();
    refreshLecturas();
    measureView?.moveHeightLabel(activeCenter);
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
    refreshLecturas();
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

/**
 * `matched` is the tolerance-adjusted distance Bandas are matched against,
 * shared by getLecturaBandIndex and the Filtro check so both agree on "how
 * far is this token"; `shown` is the one the Lectura's number displays.
 */
function getLecturaDistance(
  tokenPosition: Vector2,
  dpi: number,
  height: number,
  bandSet: BandSet,
  tokenRadius: number
): { matched: number; shown: number } {
  const dx = (tokenPosition.x - activeLecturaCenter.x) / dpi;
  const dy = (tokenPosition.y - activeLecturaCenter.y) / dpi;
  const centerDistance = distance3D(dx, dy, height, bandSet.metric);
  const tolerance = (bandSet.tolerance ?? DEFAULT_TOLERANCE) / 100;
  const excessRadiusSum = excessRadius(activeOriginRadius) + excessRadius(tokenRadius);
  return {
    matched: effectiveDistance(centerDistance, excessRadiusSum, tolerance),
    shown: shownDistance(centerDistance, excessRadiusSum),
  };
}

/** Index into bandSet.bands of the Banda a token is currently in, or undefined if out of range. */
function getLecturaBandIndex(distance: number, bandSet: BandSet): number | undefined {
  const band = findBand(distance, bandSet);
  return band ? bandSet.bands.indexOf(band) : undefined;
}

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
  const tokenId = request.token.id;
  const known = originMarkerCache?.tokenId === tokenId ? originMarkerCache.markers : undefined;
  originMarkerWrites++;
  try {
    if (request.ref) {
      const markers = await setTokenHeightMarker(
        [request.token],
        request.ref.bandId,
        request.ref.direction,
        request.bandSet,
        request.dpi,
        known,
        request.style
      );
      originMarkerCache = { tokenId, markers };
    } else {
      await clearTokenHeightMarker([tokenId], known);
      originMarkerCache = { tokenId, markers: [] };
    }
    return true;
  } catch (err) {
    console.error("Daggerheight: failed to sync token height marker", err);
    // The write may have actually landed server-side despite this client
    // not getting confirmation — forget the cache rather than risk the next
    // attempt trusting a stale "no marker" guess and creating a duplicate.
    originMarkerCache = undefined;
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
 * so releaseMedicion()/restoreOriginMarker() can await "everything settles".
 */
function scheduleOriginMarkerSync(ref: TokenHeightState | undefined): Promise<void> {
  return enqueueOriginMarkerWrite(originMarkerRequest(ref));
}

/**
 * A marker write for the grabbed token, built from this Medición's state
 * right now — so it can be built before cleanup() resets that state and
 * written after (see releaseMedicion). null when no token is grabbed.
 * `position` anchors it where the token actually ends up, when that's not
 * its live dragged position (a cancelled or unsaved drag goes back).
 */
function originMarkerRequest(
  ref: TokenHeightState | undefined,
  position?: Vector2
): OriginMarkerRequest | null {
  const live = liveDownTargetImage();
  if (!live || !activeBandSet) {
    return null;
  }
  const token = position ? { ...live, position } : live;
  return { token, ref, bandSet: activeBandSet, dpi: activeDpi, style: activeMarkerStyle, attempt: 0 };
}

function enqueueOriginMarkerWrite(request: OriginMarkerRequest | null): Promise<void> {
  if (!request) {
    return originMarkerSyncTail;
  }
  originMarkerSyncLatest = request;
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

/**
 * Undoes any scheduleOriginMarkerSync() writes when a drag is cancelled
 * instead of released. The request is built from this Medición's state, so
 * it's taken before cleanup() and passed in.
 */
async function restoreOriginMarker(request: OriginMarkerRequest | null) {
  if (!request) {
    return;
  }
  // Let anything already scheduled land first, so it can't race in after
  // (and overwrite) the restore below with a stale in-progress height.
  await originMarkerSyncTail;
  await writeOriginMarker(request);
}

/** One token's Lectura, as the measuring client computes it — every client draws it from this. */
function computeLecturaState(token: Image, bandSet: BandSet): LecturaState {
  const dz = tokenDz(token);
  const { matched, shown } = getLecturaDistance(
    token.position,
    activeDpi,
    dz,
    bandSet,
    getTokenRadius(token, activeDpi)
  );
  const state: LecturaState = {
    index: getLecturaBandIndex(matched, bandSet) ?? null,
    withinFilter: isWithinFilter(matched, bandSet),
    dz,
  };
  // Rounded here, not just when drawn: sameLecturaState compares it, so a
  // Lectura is only redrawn (and re-broadcast) when the shown number changes.
  if (activeShowDistance) {
    state.distance = Math.round(shown);
  }
  return state;
}

// Only the band rings/labels live in the interaction now — it only ever
// moves them, which is the one kind of change it reliably syncs.
function refreshBandPositions() {
  if (!bandInteraction) {
    return;
  }
  const update = bandInteraction[0];
  update((draft) => {
    for (const item of draft) {
      const offset = getMetadata(item.metadata, getPluginId("offset"), {
        x: 0,
        y: 0,
      });
      item.position = Math2.subtract(activeCenter, offset);
    }
  });
}

// Recomputes every Lectura but only touches (and only broadcasts) the ones
// whose drawn result actually changed — most pointer moves change none.
function refreshLecturas() {
  if (!measureView || !activeBandSet || !activeLecturasEnabled) {
    return;
  }
  const changed: Record<string, LecturaState> = {};
  let anyChanged = false;
  for (const token of activeTokens) {
    const state = computeLecturaState(token, activeBandSet);
    if (!sameLecturaState(activeLecturaStates.get(token.id), state)) {
      activeLecturaStates.set(token.id, state);
      changed[token.id] = state;
      anyChanged = true;
    }
  }
  if (anyChanged) {
    measureView.applyStates(changed);
    mirrorStates(changed);
  }
}

function refreshHeightLabel() {
  if (!measureView || !activeAltitudeEnabled) {
    return;
  }
  const text = currentHeightLabelText();
  if (text !== activeHeightLabelText) {
    activeHeightLabelText = text;
    measureView.setHeightText(text);
    mirrorHeightText(text);
  }
}


function cleanup() {
  if (remoteSyncCutoffTimer) {
    clearTimeout(remoteSyncCutoffTimer);
    remoteSyncCutoffTimer = null;
  }
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
  if (measureView) {
    measureView.end();
    measureView = null;
  }
  mirrorEnd();
  toolDownGeneration++;
  activeLecturaStates = new Map();
  activeHeightLabelText = "";
  downTarget = null;
  activeBandSet = null;
  sortedBands = [];
  bandIndex = 0;
  activeTokens = [];
  activeTokenHeights = new Map();
  pendingPointerPosition = null;
  pendingLecturaPosition = null;
  originMarkerBeforeEdit = undefined;
  originMarkerCache = undefined;
  liveTokenPosition = null;
  pendingMove = null;
}

// Owlbear answers a burst of scene writes with "Too many requests"
// (RateLimitHit, seen live 2026-10-08 on fast token drags). Waits grow, so a
// short limit costs little and a longer one still gets a few chances.
const SAVE_RETRY_DELAYS_MS = [50, 100, 200];

/**
 * Writes the dragged token's final position (and bumps it and its
 * attachments to the top), retrying a rejected write. The interaction keeps
 * showing the token where it was dropped until then, and is always ended
 * here — if every attempt fails, the token goes back where it started, as
 * with a cancelled drag. Returns where the token landed, or null if it
 * went back.
 */
async function saveTokenPosition(interaction: InteractionManager<Item>): Promise<Vector2 | null> {
  const final = interaction[0](() => {});
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const withAttachments = await OBR.scene.items.getItemAttachments([final.id]);
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
        return final.position;
      } catch (error) {
        if (attempt >= SAVE_RETRY_DELAYS_MS.length) {
          console.error("Daggerheight: failed to save the dragged token's position", error);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, SAVE_RETRY_DELAYS_MS[attempt]));
      }
    }
  } finally {
    interaction[1]();
  }
}

/**
 * Ends a Medición that was released (not cancelled). Everything on screen
 * — rings, gradient, Lecturas, height label — goes right away; the scene
 * writes it leaves behind (the token's new position, then its height
 * marker, in that order, like before) carry on afterwards on their own.
 * They used to run first, so one rejected write skipped cleanup() and left
 * the whole Medición stuck on screen until the next one. Everything those
 * writes need is taken out of the module state before cleanup() resets it,
 * so a new Medición starting meanwhile can't change or cancel them.
 */
async function releaseMedicion() {
  // Taken before the wait below: a new Medición starting meanwhile runs
  // cleanup(), which would otherwise cancel this drag (sending the token
  // back) and reset the state the marker write is built from.
  const interaction = tokenInteraction;
  tokenInteraction = null;
  const startPosition = downTarget?.position;
  const markerRequest = activeAltitudeEnabled ? originMarkerRequest(currentOriginBandRef()) : null;
  const generation = toolDownGeneration;
  // The latest snapped drag position, so the token lands where it was dropped.
  if (pendingMove) {
    await pendingMove;
  }
  // Unless a new Medición started meanwhile: its own cleanup() already
  // ended this one, and cleaning up again now would end the new one instead.
  if (generation === toolDownGeneration) {
    cleanup();
  }
  const landed = interaction ? await saveTokenPosition(interaction) : null;
  // The marker goes wherever the token really ended up: where it was
  // dropped if that was saved, back at the start otherwise.
  const position = landed ?? startPosition;
  await enqueueOriginMarkerWrite(
    markerRequest && position ? { ...markerRequest, token: { ...markerRequest.token, position } } : markerRequest
  );
}

/** Ends a cancelled Medición: the same immediate cleanup, then the grabbed token's marker goes back to how it was — and where the token goes back to. */
async function cancelMedicion() {
  const restore = activeAltitudeEnabled
    ? originMarkerRequest(originMarkerBeforeEdit, downTarget?.position)
    : null;
  cleanup();
  await restoreOriginMarker(restore);
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
      const generation = toolDownGeneration;

      const tokenPosition =
        event.target && !event.target.locked && event.target.position;
      const initialPosition = tokenPosition || event.pointerPosition;
      // Account for the grab offset so the token doesn't snap to the pointer
      if (tokenPosition) {
        grabOffset = Math2.subtract(event.pointerPosition, tokenPosition);
      } else {
        grabOffset = { x: 0, y: 0 };
      }

      // Everything onToolDown needs is fetched at once instead of one call
      // after another — each is its own round trip, and the Medición (for
      // everyone, not just this client) can't appear until all are back.
      // downTarget is still set the moment the permission check resolves,
      // not after the rest: the move/drag-start handlers route on it, so
      // the band items' move path must not fire for a token grab.
      const target = event.target;
      const permissionCheck =
        target && !target.locked && target.type === "IMAGE"
          ? canUpdateItem(target).then((canUpdate) => {
              if (canUpdate && generation === toolDownGeneration) {
                downTarget = target;
              }
            })
          : Promise.resolve();
      const writesBeforeFetch = originMarkerWrites;
      const [sceneMetadata, dpi, gridScale, characterImages, allHeightMarkers] = await Promise.all([
        OBR.scene.getMetadata(),
        OBR.scene.grid.getDpi(),
        OBR.scene.grid.getScale(),
        OBR.scene.items.getItems<Image>(
          (item): item is Image => isImage(item) && item.layer === "CHARACTER"
        ),
        // Fetched unconditionally (whether the altitude feature is on is
        // only known from sceneMetadata above) — cheaper than a second
        // sequential round trip when it is.
        getAllTokenHeightMarkers(),
        permissionCheck,
      ]);
      if (generation !== toolDownGeneration) {
        return;
      }
      const language = languageFromMetadata(sceneMetadata);
      const rawBandSet = (sceneMetadata[getPluginId("bandSet")] ??
        getDefaultBandSets(language)[0]) as BandSet;
      const bandSet = resolveBandSet(rawBandSet, language);

      const theme = getStoredTheme();
      activeCenter = initialPosition;
      activeLecturaCenter = initialPosition;
      activeBandSet = bandSet;
      activeLanguage = language;
      activeHotkeys = globalSettingsFromMetadata(sceneMetadata);
      activeAltitudeEnabled = activeHotkeys.enableAltitude ?? true;
      activeLecturasEnabled = activeHotkeys.enableLecturas ?? true;
      activeShowDistance = activeHotkeys.showLecturaDistance ?? false;
      activeMarkerStyle = activeHotkeys.markerStyle ?? "icons";
      activeDpi = dpi;
      activeOriginRadius =
        downTarget && isImage(downTarget) ? getTokenRadius(downTarget, dpi) : 0;
      sortedBands = [...bandSet.bands].sort((a, b) => a.radius - b.radius);

      // Not awaited here — awaited alongside the band interaction below, so
      // the two local/remote setups overlap instead of queueing.
      shaders = getShaders(initialPosition, theme, bandSet, dpi);
      const addedShaders = shaders;
      const shadersAdded = OBR.scene.local.addItems(addedShaders);

      const tokens = characterImages.filter((item) => item.id !== downTarget?.id);
      const heightMarkers = activeAltitudeEnabled ? allHeightMarkers : [];
      activeTokens = tokens;
      activeTokenHeights = tokenHeightsFromMarkers(heightMarkers, bandSet);

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
        // fetched above — no extra round trip — unless a marker write has
        // started since that fetch went out.
        originMarkerCache =
          downTarget && writesBeforeFetch === originMarkerWrites
            ? { tokenId: downTarget.id, markers: originMarker ? [originMarker] : [] }
            : undefined;
        if (originState) {
          const sortedIndex = sortedBands.findIndex((b) => b.id === originState.bandId);
          if (sortedIndex !== -1) {
            bandIndex = (sortedIndex + 1) * (originState.direction === "up" ? 1 : -1);
          }
        }
      } else {
        originMarkerBeforeEdit = undefined;
        originMarkerCache = undefined;
      }
      if (generation !== toolDownGeneration) {
        return;
      }
      const bandItems = getBandItems(activeCenter, theme, bandSet, dpi, gridScale);
      const [interaction] = await Promise.all([
        OBR.interaction.startItemInteraction(bandItems),
        shadersAdded,
      ]);
      if (generation !== toolDownGeneration) {
        interaction[1]();
        // cleanup() may have run before these finished adding, so its own
        // delete could have missed them.
        OBR.scene.local.deleteItems(addedShaders.map((shader) => shader.id));
        return;
      }
      bandInteraction = interaction;
      remoteSyncCutoffTimer = setTimeout(() => {
        remoteSyncCutoffTimer = null;
        mirrorEnd();
      }, REMOTE_SYNC_CUTOFF_MS);

      const ctx: LecturaContext = {
        bandSet,
        theme,
        dpi,
        language,
        gridScale,
        showDistance: activeShowDistance,
      };
      activeLecturaStates = new Map();
      if (activeLecturasEnabled) {
        for (const token of activeTokens) {
          activeLecturaStates.set(token.id, computeLecturaState(token, bandSet));
        }
      }
      const states = Object.fromEntries(activeLecturaStates);
      activeHeightLabelText = currentHeightLabelText();
      const heightLabel = activeAltitudeEnabled
        ? { center: activeCenter, text: activeHeightLabelText }
        : null;
      measureView = new LocalMeasureView(ctx);
      measureView.start(activeTokens, states, heightLabel);
      // Sent only once the interaction exists: other clients attach the
      // shaders/height label to this ring, which has to exist there first.
      const firstRing = bandItems.find((item) => isShape(item));
      if (firstRing) {
        mirrorStart({ ctx, states, shaders, ringId: firstRing.id, heightLabel });
      }
    },
    async onToolDragStart() {
      if (downTarget) {
        const generation = toolDownGeneration;
        const interaction = await OBR.interaction.startItemInteraction(
          downTarget
        );
        // Released before this came back (a fast flick): the Medición is
        // already over and cleaned up, so nothing would ever cancel this
        // interaction — the token would stay held in it until the next
        // Medición. Cancel it here instead.
        if (generation !== toolDownGeneration) {
          interaction[1]();
          return;
        }
        tokenInteraction = interaction;
      }
    },
    async onToolDragMove(_, event) {
      // Check the down target first as that's the earliest indicator of a valid target
      if (downTarget) {
        if (tokenInteraction) {
          const update = tokenInteraction[0];
          const move = OBR.scene.grid
            .snapPosition(Math2.subtract(event.pointerPosition, grabOffset))
            .then((position) => {
              update?.((token) => {
                token.position = position;
              });
              liveTokenPosition = position;
              scheduleLecturaRefresh(position);
            });
          pendingMove = move.catch((error) => {
            console.error("Daggerheight: failed to snap the dragged token", error);
          });
          await pendingMove;
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
        refreshLecturas();
        refreshHeightLabel();
      } else if (event.code === letterToCode(activeHotkeys.hotkeyLower)) {
        bandIndex = Math.max(bandIndex - 1, -sortedBands.length);
        refreshLecturas();
        refreshHeightLabel();
      } else {
        return;
      }
      // Not awaited: the ephemeral label above already updated synchronously
      // via refreshHeightLabel(); the persistent marker's own write is coalesced
      // (see scheduleOriginMarkerSync's comment) so onKeyDown doesn't block
      // on the network for every press.
      if (downTarget) {
        scheduleOriginMarkerSync(currentOriginBandRef());
      }
    },
    // The marker writes these leave behind are built from this Medición's
    // state before cleanup() resets it (see releaseMedicion) — reading it
    // after an await used to find it already reset and silently skip them.
    async onToolDragEnd() {
      await releaseMedicion();
    },
    async onToolDragCancel() {
      await cancelMedicion();
    },
    async onDeactivate() {
      await cancelMedicion();
    },
    async onToolUp() {
      await releaseMedicion();
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
