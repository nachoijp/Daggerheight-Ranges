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

// Everything needed to draw a Lectura, independent of which client is
// drawing it. The measuring client computes each token's LecturaState (the
// distance math lives in createMeasureTool.ts); every client — including
// the measuring one — turns those states into its own client-local items
// here. Interaction items only sync position changes to other clients
// (confirmed live 2026-09-30: text/color/commands patches never reach
// them), so Lecturas can't ride the band interaction like the rings do.

export type LecturaContext = {
  bandSet: BandSet;
  theme: Theme;
  dpi: number;
  language: Language;
  /** Optional: a measuring client from before the Lectura distance existed doesn't send them. */
  gridScale?: GridScale;
  showDistance?: boolean;
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

export const lecturaColor: Color = { r: 66, g: 66, b: 66 };
export const heightLabelOffset: Vector2 = { x: 0, y: -40 };
const lecturaLabelOffset: Vector2 = { x: 0, y: 40 };
// Ring/circle modes are sized to exactly match the token's own footprint —
// no extra padding, it read as visibly bigger than the token otherwise.
const LECTURA_SHAPE_PADDING = 1;

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

function showsDistance(ctx: LecturaContext): boolean {
  return !!ctx.showDistance && !!ctx.gridScale;
}

/** Whether a Lectura gets a text label at all: its Banda name, its distance, or both. */
function hasLecturaLabel(ctx: LecturaContext): boolean {
  return !!ctx.bandSet.showLabel || showsDistance(ctx);
}

function getLecturaLabelText(state: LecturaState, ctx: LecturaContext): string {
  const parts: string[] = [];
  if (ctx.bandSet.showLabel) {
    parts.push(
      state.index === null
        ? translate(ctx.language, "onMap.outOfRange")
        : ctx.bandSet.bands[state.index].name
    );
  }
  if (showsDistance(ctx) && state.distance !== undefined) {
    parts.push(formatDistance(ctx.gridScale!, state.distance));
  }
  return `${parts.join(" · ")}${directionArrow(state.dz)}`;
}

function lecturaColorFor(index: number | null, theme: Theme): Color {
  return index === null ? lecturaColor : theme.colors[index % theme.colors.length];
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

function iconShapeFor(state: LecturaState, bandSet: BandSet) {
  return (
    (state.index !== null ? bandSet.bands[state.index].iconShape : undefined) ??
    bandSet.iconShape ??
    "circle"
  );
}

function iconCommands(state: LecturaState, ctx: LecturaContext) {
  const { bandSet, dpi } = ctx;
  if (state.index === null) {
    return [];
  }
  // Opposite side from the persistent marker's own position, so the two
  // don't render on top of each other when a measured token has both.
  return buildIconStackCommands(
    iconShapeFor(state, bandSet),
    state.index + 1,
    dpi,
    bandSet.iconSize ?? 1,
    oppositeIconPosition(bandSet.iconPosition ?? "top"),
    lecturaIconDirection(state.dz)
  );
}

function iconAnchor(token: Image, ctx: LecturaContext) {
  return computeIconAnchor(
    token,
    ctx.dpi,
    oppositeIconPosition(ctx.bandSet.iconPosition ?? "top"),
    ctx.bandSet.iconDistance ?? 0.15
  );
}

function buildLecturaVisualItem(token: Image, state: LecturaState, ctx: LecturaContext): Item {
  const { bandSet, theme, dpi } = ctx;
  const visualization = bandSet.visualization ?? "icon";
  const color = getColorString(lecturaColorFor(state.index, theme));
  const opacityScale = lecturaOpacityScale(state.withinFilter);

  if (visualization === "icon") {
    const item = buildPath()
      .commands(iconCommands(state, ctx))
      .fillColor(color)
      .fillOpacity(1 * opacityScale)
      .strokeColor("#111827")
      .strokeOpacity(0.65 * opacityScale)
      .strokeWidth(dpi * getStrokeWidthRatio(iconShapeFor(state, bandSet)))
      .position(iconAnchor(token, ctx))
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
      .strokeOpacity((state.index === null ? 0 : 0.9) * opacityScale)
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
    .fillOpacity((state.index === null ? 0 : bandSet.circleOpacity ?? 0.35) * opacityScale)
    .strokeOpacity(0)
    .position(position)
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
  const items = [buildLecturaVisualItem(token, state, ctx)];
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
  const { bandSet, theme, dpi } = ctx;
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
  const visualization = bandSet.visualization ?? "icon";
  const color = getColorString(lecturaColorFor(state.index, theme));
  if (visualization === "icon" && isPath(item)) {
    item.position = iconAnchor(token, ctx);
    item.commands = iconCommands(state, ctx);
    item.style.fillColor = color;
    item.style.fillOpacity = 1 * opacityScale;
    item.style.strokeOpacity = 0.65 * opacityScale;
    item.style.strokeWidth = dpi * getStrokeWidthRatio(iconShapeFor(state, bandSet));
  } else if (isShape(item)) {
    if (visualization === "ring") {
      item.style.strokeColor = color;
      item.style.strokeOpacity = (state.index === null ? 0 : 0.9) * opacityScale;
      item.style.strokeWidth = dpi * (bandSet.ringWidth ?? 0.05);
      item.style.fillOpacity = 0;
    } else {
      item.style.fillColor = color;
      item.style.fillOpacity =
        (state.index === null ? 0 : bandSet.circleOpacity ?? 0.35) * opacityScale;
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
