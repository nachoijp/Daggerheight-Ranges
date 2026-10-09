import {
  buildLabel,
  buildPath,
  buildShape,
  isLabel,
  isPath,
  isShape,
  Math2,
  type GridScale,
  type Image,
  type Item,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import { getMetadata } from "../util/getMetadata";
import { Color, Theme } from "../theme/themes";
import { getColorString, getLabelTextColor } from "../util/color";
import { BandSet } from "../engine/types";
import { buildIconStackCommands, getStrokeWidthRatio, type Direction } from "./iconStack";
import { computeIconAnchor, getTokenBounds, oppositeIconPosition } from "./iconAnchor";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { formatDistance } from "../util/flattenGridScale";
import {
  resolveDisplay,
  showsBandName,
  showsDistance,
  type DisplaySettings,
} from "../settings/display";

// Drawing a Lectura. The measuring client computes each token's
// LecturaState (createMeasureTool.ts) and every client — itself included —
// draws its own client-local items from it here (see measureMirror.ts).

export type LecturaContext = {
  bandSet: BandSet;
  theme: Theme;
  dpi: number;
  language: Language;
  /** Optional: a measuring client from before the Lectura distance existed doesn't send them. */
  gridScale?: GridScale;
  /** Only read when `display` is missing (a measuring client from 0.5.x). */
  showDistance?: boolean;
  /** The room's display settings, resolved by the measuring client. Missing from clients before 0.6.0. */
  display?: DisplaySettings;
};

/** JSON-safe (it's broadcast): null, not undefined, for "out of range". */
export type LecturaState = {
  /** Index into bandSet.bands, or null if out of range. */
  index: number | null;
  withinFilter: boolean;
  /** Origen height - token height, grid units (see tokenDz). */
  dz: number;
  /** Shown distance, whole grid units — only set when the Lectura shows it. */
  distance?: number;
};

export function sameLecturaState(a: LecturaState | undefined, b: LecturaState): boolean {
  // Only dz's sign affects what's drawn (arrow + icon taper).
  return (
    !!a &&
    a.index === b.index &&
    a.withinFilter === b.withinFilter &&
    Math.sign(a.dz) === Math.sign(b.dz) &&
    a.distance === b.distance
  );
}

/** The context's display settings, rebuilt the 0.5.x way when an older measuring client didn't send them. */
function displayOf(ctx: LecturaContext): DisplaySettings {
  return ctx.display ?? resolveDisplay(undefined, ctx.bandSet, { showLecturaDistance: ctx.showDistance });
}

export const lecturaColor: Color = { r: 66, g: 66, b: 66 };
export const heightLabelOffset: Vector2 = { x: 0, y: -40 };
const lecturaLabelOffset: Vector2 = { x: 0, y: 40 };

// A token beyond the Filtro's distance is dimmed rather than hidden, so
// "which tokens are in range" reads as a highlight against everything else
// staying visible for context, instead of losing track of them entirely.
const FILTERED_OUT_OPACITY_SCALE = 0.25;

function lecturaOpacityScale(withinFilter: boolean): number {
  return withinFilter ? 1 : FILTERED_OUT_OPACITY_SCALE;
}

export function getBandLabel(
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

function showsDistanceIn(ctx: LecturaContext): boolean {
  return showsDistance(displayOf(ctx).lecturaLabel) && !!ctx.gridScale;
}

/** Whether a Lectura gets a text label at all: its Banda name, its distance, or both. */
function hasLecturaLabel(ctx: LecturaContext): boolean {
  return showsBandName(displayOf(ctx).lecturaLabel) || showsDistanceIn(ctx);
}

function getLecturaLabelText(state: LecturaState, ctx: LecturaContext): string {
  const parts: string[] = [];
  if (showsBandName(displayOf(ctx).lecturaLabel)) {
    parts.push(
      state.index === null
        ? translate(ctx.language, "onMap.outOfRange")
        : ctx.bandSet.bands[state.index].name
    );
  }
  if (showsDistanceIn(ctx) && state.distance !== undefined) {
    parts.push(formatDistance(ctx.gridScale!, state.distance));
  }
  return `${parts.join(" · ")}${directionArrow(state.dz)}`;
}

function lecturaColorFor(index: number | null, theme: Theme): Color {
  return index === null ? lecturaColor : theme.colors[index % theme.colors.length];
}

/** Center + size of the ring and circle styles: the token's own footprint (the circle style scales it). */
function lecturaShapeGeometry(token: Image, dpi: number, scale: number) {
  const { topLeft, scaledWidth, scaledHeight } = getTokenBounds(token, dpi);
  return {
    center: { x: topLeft.x + scaledWidth / 2, y: topLeft.y + scaledHeight / 2 },
    size: Math.max(scaledWidth, scaledHeight) * scale,
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

function iconShapeFor(state: LecturaState, ctx: LecturaContext) {
  return (
    (state.index !== null ? ctx.bandSet.bands[state.index].iconShape : undefined) ??
    displayOf(ctx).iconShape
  );
}

function iconCommands(state: LecturaState, ctx: LecturaContext) {
  if (state.index === null) {
    return [];
  }
  const display = displayOf(ctx);
  // Opposite side from the persistent marker's own position, so the two
  // don't render on top of each other when a measured token has both.
  return buildIconStackCommands(
    iconShapeFor(state, ctx),
    state.index + 1,
    ctx.dpi,
    display.lecturaIcon.size,
    oppositeIconPosition(display.marker.position),
    lecturaIconDirection(state.dz),
    // A token at the Origen's own height points neither way: keep it centered.
    state.dz !== 0
  );
}

function iconAnchor(token: Image, ctx: LecturaContext) {
  const { marker } = displayOf(ctx);
  return computeIconAnchor(token, ctx.dpi, oppositeIconPosition(marker.position), marker.distance);
}

function buildLecturaVisualItem(token: Image, state: LecturaState, ctx: LecturaContext): Item {
  const { bandSet, theme, dpi } = ctx;
  const display = displayOf(ctx);
  const color = getColorString(lecturaColorFor(state.index, theme));
  const opacityScale = lecturaOpacityScale(state.withinFilter);

  if (display.lecturaStyle === "icon") {
    const { opacity } = display.lecturaIcon;
    const item = buildPath()
      .commands(iconCommands(state, ctx))
      .fillColor(color)
      .fillOpacity(opacity * opacityScale)
      .strokeColor("#111827")
      .strokeOpacity(0.65 * opacity * opacityScale)
      .strokeWidth(dpi * getStrokeWidthRatio(iconShapeFor(state, ctx)))
      .position(iconAnchor(token, ctx))
      .disableHit(true)
      .layer("POPOVER")
      .build();
    return withLecturaMetadata(item, token.id, "visual");
  }

  const shapeType = bandSet.shape === "square" ? "RECTANGLE" : "CIRCLE";

  if (display.lecturaStyle === "ring") {
    const { center, size } = lecturaShapeGeometry(token, dpi, 1);
    const item = buildShape()
      .shapeType(shapeType)
      .fillOpacity(0)
      .strokeColor(color)
      .strokeOpacity((state.index === null ? 0 : display.lecturaRing.opacity) * opacityScale)
      .strokeWidth(dpi * display.lecturaRing.size)
      .position(lecturaShapePosition(center, size, bandSet.shape))
      .width(size)
      .height(size)
      .disableHit(true)
      .layer("POPOVER")
      .build();
    return withLecturaMetadata(item, token.id, "visual");
  }

  // circle
  const { center, size } = lecturaShapeGeometry(token, dpi, display.lecturaCircle.size);
  const item = buildShape()
    .shapeType(shapeType)
    .fillColor(color)
    .fillOpacity((state.index === null ? 0 : display.lecturaCircle.opacity) * opacityScale)
    .strokeOpacity(0)
    .position(lecturaShapePosition(center, size, bandSet.shape))
    .width(size)
    .height(size)
    .disableHit(true)
    .layer("POPOVER")
    .build();
  return withLecturaMetadata(item, token.id, "visual");
}

function buildLecturaLabelItem(token: Image, state: LecturaState, ctx: LecturaContext): Item {
  const color = lecturaColorFor(state.index, ctx.theme);
  const textColor = getLabelTextColor(color, 180);
  // Unlike the icon/ring/circle visual (dimmed, still visible for context),
  // a filtered-out token's label is hidden outright — the Filtro is meant
  // to answer "which tokens match", and a dimmed label is still readable
  // clutter for tokens that don't.
  const item = getBandLabel(
    token.position,
    lecturaLabelOffset,
    getLecturaLabelText(state, ctx),
    getColorString(color),
    textColor,
    state.withinFilter ? 1 : 0
  );
  return withLecturaMetadata(item, token.id, "label");
}

export function buildLecturaItems(token: Image, state: LecturaState, ctx: LecturaContext): Item[] {
  const items: Item[] = [];
  if (displayOf(ctx).lecturaStyle !== "none") {
    items.push(buildLecturaVisualItem(token, state, ctx));
  }
  if (hasLecturaLabel(ctx)) {
    items.push(buildLecturaLabelItem(token, state, ctx));
  }
  return items;
}

export function getLecturaTokenId(item: Item): string {
  return getMetadata(item.metadata, getPluginId("lecturaTokenId"), "");
}

// Existing items are mutated in place (same ids) rather than rebuilt — the
// item's OBR type can't change by mutation anyway, and rebuilding would
// flicker.
export function applyLecturaState(
  item: Item,
  token: Image,
  state: LecturaState,
  ctx: LecturaContext
) {
  const { theme, dpi } = ctx;
  const display = displayOf(ctx);
  const role = getMetadata(item.metadata, getPluginId("lecturaRole"), "visual");
  const opacityScale = lecturaOpacityScale(state.withinFilter);
  if (role === "label" && isLabel(item)) {
    const labelOpacity = state.withinFilter ? 1 : 0;
    const color = lecturaColorFor(state.index, theme);
    item.text.plainText = getLecturaLabelText(state, ctx);
    item.text.style.fillColor = getLabelTextColor(color, 180);
    item.text.style.fillOpacity = labelOpacity;
    item.style.backgroundColor = getColorString(color);
    item.style.backgroundOpacity = 0.8 * labelOpacity;
    return;
  }
  const color = getColorString(lecturaColorFor(state.index, theme));
  if (display.lecturaStyle === "icon" && isPath(item)) {
    const { opacity } = display.lecturaIcon;
    item.position = iconAnchor(token, ctx);
    item.commands = iconCommands(state, ctx);
    item.style.fillColor = color;
    item.style.fillOpacity = opacity * opacityScale;
    item.style.strokeOpacity = 0.65 * opacity * opacityScale;
    item.style.strokeWidth = dpi * getStrokeWidthRatio(iconShapeFor(state, ctx));
  } else if (isShape(item)) {
    if (display.lecturaStyle === "ring") {
      item.style.strokeColor = color;
      item.style.strokeOpacity = (state.index === null ? 0 : display.lecturaRing.opacity) * opacityScale;
      item.style.strokeWidth = dpi * display.lecturaRing.size;
      item.style.fillOpacity = 0;
    } else {
      item.style.fillColor = color;
      item.style.fillOpacity =
        (state.index === null ? 0 : display.lecturaCircle.opacity) * opacityScale;
      item.style.strokeOpacity = 0;
    }
  }
}

export function buildHeightLabelItem(center: Vector2, text: string): Item {
  const textColor = getLabelTextColor(lecturaColor, 180);
  const item = getBandLabel(
    center,
    heightLabelOffset,
    text,
    getColorString(lecturaColor),
    textColor
  );
  return {
    ...item,
    metadata: { ...item.metadata, [getPluginId("heightLabel")]: true },
  };
}
