import OBR, {
  isImage,
  Math2,
  type GridScale,
  type Image,
  type InteractionManager,
  type Item,
  type Vector2,
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
  enqueueOriginMarkerWrite,
  forgetCache,
  restoreOriginMarker,
  seedCache,
  writesSoFar,
  type OriginMarkerRequest,
} from "./originMarkerSync";
import { sameLecturaState, type LecturaContext, type LecturaState } from "../render/lecturaItems";
import { buildBandRingItems, buildGradientShaders, buildOriginAnchor } from "../render/bandRings";
import { getTokenRadius } from "../render/iconAnchor";
import { getPluginId } from "../util/getPluginId";
import { getMetadata } from "../util/getMetadata";
import { getStoredTheme } from "../theme/themes";
import {
  DEFAULT_TOLERANCE,
  bodyCenterHeight,
  bodyDistance,
  excessRadius,
  matchedDistance,
} from "../engine/distance";
import { findBandIndex } from "../engine/bands";
import { bandAtHeight, heightStepOf, stepHeight } from "../engine/heights";
import { BandSet } from "../engine/types";
import { formatDistance } from "../util/flattenGridScale";
import { bandSetFromMetadata } from "../bandSets/bandSets";
import { resolveDisplay, showsDistance, type DisplaySettings } from "../settings/display";
import {
  getAllTokenHeightMarkers,
  getTokenHeight,
  markerLookFromMetadata,
  tokenHeightsFromMarkers,
  type MarkerLook,
} from "../tokenHeight/markers";
import { DEFAULT_LANGUAGE, languageFromMetadata, type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import {
  DEFAULT_GLOBAL_SETTINGS,
  globalSettingsFromMetadata,
  groundHotkey,
  letterToCode,
  type GlobalSettings,
} from "../settings/globalSettings";

// The Medición tool: drag from a point, or from a token to move it, and see
// rings around the Origen, a Lectura on every other token, and the Origen's
// height (Z/X raise or lower it, C puts it back on the ground). Everything below is the state of the one
// Medición in progress; cleanup() resets it.

// Owlbear stops syncing an interaction to other clients 15s after it
// starts (undocumented): their rings vanish. The mirrored
// gradient, Lecturas and height label are ended for them at the same
// moment, slightly early since Owlbear's timer starts a little before ours.
const REMOTE_SYNC_CUTOFF_MS = 14900;
let remoteSyncCutoffTimer: ReturnType<typeof setTimeout> | null = null;

/** The Origen's anchor (see buildOriginAnchor) — the only item Owlbear syncs while it moves. */
let bandInteraction: InteractionManager<Item[]> | null = null;
/** The token being moved, when the Medición started on one. */
let tokenInteraction: InteractionManager<Item> | null = null;
/** What follows the Origen on this client: the gradient's shaders, the rings and their labels. */
let originItems: Item[] = [];
let grabOffset: Vector2 = { x: 0, y: 0 };
/** The token the Medición started on (if the player may move it), as it was at the start. */
let downTarget: Item | null = null;
/** That token's height before this Medición changed it — restored on cancel. */
let originHeightBeforeEdit = 0;
/** Where the dragged token is now; downTarget keeps its starting position. */
let liveTokenPosition: Vector2 | null = null;

/** Where the rings are drawn. While a token is dragged they stay at its starting point. */
let activeCenter: Vector2 = { x: 0, y: 0 };
/** What the Lecturas measure from: follows the dragged token. */
let activeLecturaCenter: Vector2 = { x: 0, y: 0 };
let activeBandSet: BandSet | null = null;
let activeLanguage: Language = DEFAULT_LANGUAGE;
let activeSettings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
let activeAltitudeEnabled = true;
let activeDisplay: DisplaySettings | null = null;
/** Whether any Lectura is drawn at all (a visual, a label, or both). */
let activeLecturasEnabled = true;
/** Whether Lectura labels show the distance, so each state carries it. */
let activeShowDistance = false;
let activeMarkerLook: MarkerLook | null = null;
let activeDpi = 0;
let activeGridScale: GridScale | null = null;
/** The Origen token's radius in grid units, 0 from a point. */
let activeOriginRadius = 0;
/** The Origen's height in grid units: 0 = ground, positive up, negative down. */
let originHeight = 0;
/** tokenId -> signed height in grid units, from the height markers. */
let activeTokenHeights: Map<string, number> = new Map();
// The measured tokens as they were when the Medición started: moves come in
// far faster than fresh reads could, so Lecturas measure this snapshot.
// Hidden ones only for the GM.
let activeTokens: Image[] = [];
/** The hidden tokens among activeTokens (GM only): their Lecturas are drawn here, never sent to anyone else. */
let hiddenTokenIds: Set<string> = new Set();
/**
 * A GM measuring from a hidden token: nothing of this Medición may reach the
 * players, or they'd see rings centered on a creature they can't see. The
 * rings are hidden items (the GM sees them faded, as Owlbear shows hidden
 * things), and nothing is mirrored.
 */
let secretMedicion = false;
/** This client's Lecturas and height label, and the last state drawn for each. */
let measureView: LocalMeasureView | null = null;
let activeLecturaStates: Map<string, LecturaState> = new Map();
let activeHeightLabelText = "";
// Bumped by cleanup(), so a handler that awaited can tell its Medición ended
// meanwhile and stop instead of drawing for it.
let toolDownGeneration = 0;
// The latest token move, waiting on its snapPosition reply. Released tokens
// wait for it, so they land where they were dropped. Never rejects.
let pendingMove: Promise<void> | null = null;

// Pointer moves come in faster than frames; redraws are coalesced to about
// one per 16ms. setTimeout rather than requestAnimationFrame: this runs in
// a hidden background page, where animation frames may never fire.
let pendingPointerPosition: Vector2 | null = null;
let refreshScheduled = false;
let pendingLecturaPosition: Vector2 | null = null;
let lecturaRefreshScheduled = false;

/** A Medición from a point: the rings, gradient, Lecturas and height label all follow the pointer. */
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
    if (originItems.length > 0) {
      OBR.scene.local.updateItems(originItems, (items) => {
        for (const item of items) {
          const offset = getMetadata(item.metadata, getPluginId("offset"), { x: 0, y: 0 });
          item.position = Math2.subtract(activeCenter, offset);
        }
      });
    }
  }, 16);
}

/** A token being moved: only the Lecturas follow it; the rings stay where it started. */
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

/**
 * A token's distance from the Lectura center: `matched` (with Tolerancia)
 * decides its Banda and the Filtro; `shown` (without it) is the number its
 * label displays. Both measure between the two tokens' bodies (see
 * bodyDistance).
 */
function getLecturaDistance(token: Image, bandSet: BandSet): { matched: number; shown: number } {
  const dx = (token.position.x - activeLecturaCenter.x) / activeDpi;
  const dy = (token.position.y - activeLecturaCenter.y) / activeDpi;
  const tokenRadius = getTokenRadius(token, activeDpi);
  const dz =
    bodyCenterHeight(activeTokenHeights.get(token.id) ?? 0, tokenRadius) -
    bodyCenterHeight(originHeight, activeOriginRadius);
  const excessRadiusSum = excessRadius(activeOriginRadius) + excessRadius(tokenRadius);
  const { distance } = bodyDistance(dx, dy, dz, excessRadiusSum, bandSet.metric);
  const tolerance = (bandSet.tolerance ?? DEFAULT_TOLERANCE) / 100;
  return { matched: matchedDistance(distance, tolerance), shown: distance };
}

function isWithinFilter(distance: number, bandSet: BandSet): boolean {
  if (!activeDisplay?.filterEnabled || !activeDisplay.filterBandId) {
    return true;
  }
  const filterBandId = activeDisplay.filterBandId;
  // A Banda that isn't in this set (deleted, or picked with another set)
  // filters nothing.
  const filterBand = bandSet.bands.find((band) => band.id === filterBandId);
  if (!filterBand) {
    return true;
  }
  return distance <= filterBand.radius;
}

/** Origen height minus the token's height (only its sign matters: which way the Lectura's arrow points). */
function tokenDz(token: Item) {
  return originHeight - (activeTokenHeights.get(token.id) ?? 0);
}

function currentHeightLabelText() {
  if (originHeight === 0) {
    return translate(activeLanguage, "onMap.ground");
  }
  // By Banda, a height that is one is called by its name; otherwise (or by
  // cell) it's the distance itself.
  const band = activeBandSet && heightStepOf(activeBandSet) === "band" ? bandAtHeight(originHeight, activeBandSet) : undefined;
  const text = band
    ? band.name
    : activeGridScale
      ? formatDistance(activeGridScale, Math.abs(originHeight))
      : String(Math.abs(originHeight));
  // Emoji arrows: Owlbear's map font has no plain ↑/↓.
  return `${text} ${originHeight > 0 ? "⬆️" : "⬇️"}`;
}

/** downTarget at its current dragged position. */
function liveDownTargetImage(): Image | undefined {
  if (!downTarget || !isImage(downTarget)) {
    return undefined;
  }
  return liveTokenPosition ? { ...downTarget, position: liveTokenPosition } : downTarget;
}

/**
 * A marker write for the Origen token, built from the current Medición — so
 * it can be built before cleanup() resets that and written after. null when
 * no token is grabbed. `position` puts the marker where the token really
 * ends up, when that isn't where it's being dragged.
 */
function originMarkerRequest(height: number, position?: Vector2): OriginMarkerRequest | null {
  const live = liveDownTargetImage();
  if (!live || !activeBandSet || !activeMarkerLook) {
    return null;
  }
  const token = position ? { ...live, position } : live;
  return { token, height, bandSet: activeBandSet, dpi: activeDpi, look: activeMarkerLook, attempt: 0 };
}

/** One token's Lectura, as the measuring client computes it — every client draws it from this. */
function computeLecturaState(token: Image, bandSet: BandSet): LecturaState {
  const dz = tokenDz(token);
  const { matched, shown } = getLecturaDistance(token, bandSet);
  const state: LecturaState = {
    index: findBandIndex(matched, bandSet),
    withinFilter: isWithinFilter(matched, bandSet),
    dz,
  };
  // Rounded here, not when drawn: sameLecturaState compares it, so a Lectura
  // is only redrawn and re-sent when the number shown changes.
  if (activeShowDistance) {
    state.distance = Math.round(shown);
  }
  return state;
}

/** The Lecturas other clients may see: none of a hidden token's. */
function sharedStates(states: Record<string, LecturaState>): Record<string, LecturaState> {
  return Object.fromEntries(Object.entries(states).filter(([tokenId]) => !hiddenTokenIds.has(tokenId)));
}

/** Moves the rings and their labels to activeCenter. */
function refreshBandPositions() {
  if (!bandInteraction) {
    return;
  }
  const update = bandInteraction[0];
  update((draft) => {
    for (const item of draft) {
      const offset = getMetadata(item.metadata, getPluginId("offset"), { x: 0, y: 0 });
      item.position = Math2.subtract(activeCenter, offset);
    }
  });
}

/** Recomputes every Lectura, but only redraws (and sends) the ones that changed. */
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
    const shared = sharedStates(changed);
    if (Object.keys(shared).length > 0) {
      mirrorStates(shared);
    }
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

/** Ends the Medición on screen (here and for everyone) and resets its state. */
function cleanup() {
  if (remoteSyncCutoffTimer) {
    clearTimeout(remoteSyncCutoffTimer);
    remoteSyncCutoffTimer = null;
  }
  if (bandInteraction) {
    bandInteraction[1]();
    bandInteraction = null;
  }
  if (tokenInteraction) {
    tokenInteraction[1]();
    tokenInteraction = null;
  }
  if (originItems.length > 0) {
    OBR.scene.local.deleteItems(originItems.map((item) => item.id));
    originItems = [];
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
  activeDisplay = null;
  activeMarkerLook = null;
  activeGridScale = null;
  originHeight = 0;
  activeTokens = [];
  hiddenTokenIds = new Set();
  secretMedicion = false;
  activeTokenHeights = new Map();
  pendingPointerPosition = null;
  pendingLecturaPosition = null;
  originHeightBeforeEdit = 0;
  forgetCache();
  liveTokenPosition = null;
  pendingMove = null;
}

// Owlbear refuses bursts of scene writes ("Too many requests"). The waits
// grow, so a short limit costs little and a longer one still gets a chance.
const SAVE_RETRY_DELAYS_MS = [50, 100, 200];

/**
 * Saves the dragged token's final position (and brings it and its
 * attachments to the top), retrying refused writes, then ends the drag. If
 * every attempt fails the token goes back where it started. Returns where
 * it landed, or null if it went back.
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
          console.error("Rising Ranges: failed to save the dragged token's position", error);
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
 * Ends a released Medición. Everything on screen goes right away; the
 * token's new position and then its marker are written afterwards. What
 * those writes need is taken first: a new Medición starting meanwhile runs
 * cleanup(), which would cancel the drag and reset that state.
 */
async function releaseMedicion() {
  const interaction = tokenInteraction;
  tokenInteraction = null;
  const startPosition = downTarget?.position;
  const markerRequest = activeAltitudeEnabled ? originMarkerRequest(originHeight) : null;
  const generation = toolDownGeneration;
  // The last snapped move, so the token lands where it was dropped.
  if (pendingMove) {
    await pendingMove;
  }
  // A new Medición that started meanwhile already ended this one; cleaning
  // up again would end the new one instead.
  if (generation === toolDownGeneration) {
    cleanup();
  }
  const landed = interaction ? await saveTokenPosition(interaction) : null;
  // The marker goes where the token really ended up: where it was dropped
  // if that was saved, back at the start otherwise.
  const position = landed ?? startPosition;
  await enqueueOriginMarkerWrite(
    markerRequest && position ? { ...markerRequest, token: { ...markerRequest.token, position } } : markerRequest
  );
}

/** Ends a cancelled Medición: the token goes back, and so does its marker. */
async function cancelMedicion() {
  const restore = activeAltitudeEnabled ? originMarkerRequest(originHeightBeforeEdit, downTarget?.position) : null;
  cleanup();
  await restoreOriginMarker(restore);
}

export function createMeasureTool(language: Language, settings: GlobalSettings) {
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

      const tokenPosition = event.target && !event.target.locked && event.target.position;
      const initialPosition = tokenPosition || event.pointerPosition;
      // So a grabbed token doesn't jump to center on the pointer.
      grabOffset = tokenPosition ? Math2.subtract(event.pointerPosition, tokenPosition) : { x: 0, y: 0 };

      // Everything is fetched at once: each call is a round trip, and the
      // Medición can't appear until all are back. downTarget is set as soon
      // as the permission check resolves — the drag handlers route on it.
      const target = event.target;
      const permissionCheck =
        target && !target.locked && target.type === "IMAGE"
          ? canUpdateItem(target).then((canUpdate) => {
              if (canUpdate && generation === toolDownGeneration) {
                downTarget = target;
              }
            })
          : Promise.resolve();
      const writesBeforeFetch = writesSoFar();
      const [sceneMetadata, dpi, gridScale, characterImages, allHeightMarkers, role] = await Promise.all([
        OBR.scene.getMetadata(),
        OBR.scene.grid.getDpi(),
        OBR.scene.grid.getScale(),
        OBR.scene.items.getItems<Image>((item): item is Image => isImage(item) && item.layer === "CHARACTER"),
        getAllTokenHeightMarkers(),
        OBR.player.getRole(),
        permissionCheck,
      ]);
      if (generation !== toolDownGeneration) {
        return;
      }
      const language = languageFromMetadata(sceneMetadata);
      const bandSet = bandSetFromMetadata(sceneMetadata);

      const theme = getStoredTheme();
      activeCenter = initialPosition;
      activeLecturaCenter = initialPosition;
      activeBandSet = bandSet;
      activeLanguage = language;
      activeSettings = globalSettingsFromMetadata(sceneMetadata);
      activeAltitudeEnabled = activeSettings.enableAltitude ?? true;
      activeDisplay = resolveDisplay(activeSettings.display, bandSet, activeSettings);
      activeLecturasEnabled = activeDisplay.lecturaStyle !== "none" || activeDisplay.lecturaLabel !== "none";
      activeShowDistance = showsDistance(activeDisplay.lecturaLabel);
      activeMarkerLook = markerLookFromMetadata(sceneMetadata);
      activeDpi = dpi;
      activeGridScale = gridScale;
      activeOriginRadius = downTarget && isImage(downTarget) ? getTokenRadius(downTarget, dpi) : 0;

      // Added while the rings' interaction starts below, not before it.
      const shaders = buildGradientShaders(initialPosition, theme, bandSet, dpi, activeOriginRadius);
      originItems = shaders;
      const shadersAdded = OBR.scene.local.addItems(shaders);

      const heightMarkers = activeAltitudeEnabled ? allHeightMarkers : [];
      // A player's client still has hidden tokens (Owlbear just doesn't draw
      // them): measuring them would show their Lecturas.
      activeTokens = characterImages.filter(
        (item) => item.id !== downTarget?.id && (role === "GM" || item.visible)
      );
      hiddenTokenIds = new Set(activeTokens.filter((item) => !item.visible).map((item) => item.id));
      secretMedicion = target?.type === "IMAGE" && !target.visible;
      activeTokenHeights = tokenHeightsFromMarkers(heightMarkers, bandSet);

      // A Medición started on a token with a height marker starts at that
      // height.
      originHeight = 0;
      if (activeAltitudeEnabled) {
        const originId = event.target?.id;
        const originMarker = originId && heightMarkers.find((m) => m.attachedTo === originId);
        originHeight = (originMarker && getTokenHeight(originMarker, bandSet)) || 0;
        originHeightBeforeEdit = downTarget ? originHeight : 0;
        if (downTarget) {
          seedCache(downTarget.id, originMarker ? [originMarker] : [], writesBeforeFetch);
        } else {
          forgetCache();
        }
      } else {
        originHeightBeforeEdit = 0;
        forgetCache();
      }
      if (generation !== toolDownGeneration) {
        return;
      }
      const ringItems = buildBandRingItems(
        activeCenter,
        theme,
        bandSet,
        dpi,
        gridScale,
        activeDisplay.ringLabel,
        activeDisplay.ringLabelSize,
        activeOriginRadius
      );
      const anchor = buildOriginAnchor(activeCenter);
      if (secretMedicion) {
        for (const item of [anchor, ...ringItems]) {
          item.visible = false;
        }
      }
      const [interaction] = await Promise.all([
        OBR.interaction.startItemInteraction([anchor]),
        shadersAdded,
        OBR.scene.local.addItems(ringItems),
      ]);
      if (generation !== toolDownGeneration) {
        interaction[1]();
        // cleanup() may have run before these finished adding.
        OBR.scene.local.deleteItems([...shaders, ...ringItems].map((item) => item.id));
        return;
      }
      bandInteraction = interaction;
      originItems = [...shaders, ...ringItems];
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
        display: activeDisplay,
      };
      activeLecturaStates = new Map();
      if (activeLecturasEnabled) {
        for (const token of activeTokens) {
          activeLecturaStates.set(token.id, computeLecturaState(token, bandSet));
        }
      }
      const states = Object.fromEntries(activeLecturaStates);
      activeHeightLabelText = currentHeightLabelText();
      const heightLabel = activeAltitudeEnabled ? { center: activeCenter, text: activeHeightLabelText } : null;
      measureView = new LocalMeasureView(ctx);
      measureView.start(activeTokens, states, heightLabel);
      // Only now: other clients attach what they draw to the anchor, so it
      // has to exist for them first.
      if (!secretMedicion) {
        mirrorStart({
          ctx,
          states: sharedStates(states),
          shaders,
          ringId: anchor.id,
          heightLabel,
          origin: { center: activeCenter, radius: activeOriginRadius },
        });
      }
    },
    async onToolDragStart() {
      if (downTarget) {
        const generation = toolDownGeneration;
        const interaction = await OBR.interaction.startItemInteraction(downTarget);
        // Released before this came back: nothing else would end it.
        if (generation !== toolDownGeneration) {
          interaction[1]();
          return;
        }
        tokenInteraction = interaction;
      }
    },
    async onToolDragMove(_, event) {
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
            console.error("Rising Ranges: failed to snap the dragged token", error);
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
      if (!activeBandSet) {
        return;
      }
      let next: number;
      if (event.code === letterToCode(activeSettings.hotkeyRaise)) {
        next = stepHeight(originHeight, 1, activeBandSet);
      } else if (event.code === letterToCode(activeSettings.hotkeyLower)) {
        next = stepHeight(originHeight, -1, activeBandSet);
      } else if (event.code === letterToCode(groundHotkey(activeSettings))) {
        next = 0;
      } else {
        return;
      }
      if (next === originHeight) {
        return;
      }
      originHeight = next;
      refreshLecturas();
      refreshHeightLabel();
      // The marker follows too; not awaited, writes are queued.
      if (downTarget) {
        enqueueOriginMarkerWrite(originMarkerRequest(originHeight));
      }
    },
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
    shortcut: settings.hotkeyActivate,
    cursors: [
      {
        cursor: "grabbing",
        filter: {
          dragging: true,
          target: [{ value: "IMAGE", key: "type" }],
        },
      },
      {
        cursor: "grab",
        filter: {
          dragging: false,
          target: [
            { value: "IMAGE", key: "type" },
            { value: false, key: "locked" },
          ],
        },
      },
      {
        cursor: "crosshair",
      },
    ],
  });
}
