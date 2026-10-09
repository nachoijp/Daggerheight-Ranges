import {
  buildEffect,
  buildShape,
  Math2,
  type GridScale,
  type Item,
  type Matrix,
  type Uniform,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import ringSksl from "./ring.frag";
import { getPluginId } from "../util/getPluginId";
import { getColorString, getLabelTextColor } from "../util/color";
import { flattenGridScale } from "../util/flattenGridScale";
import { Theme } from "../theme/themes";
import { BandSet } from "../engine/types";
import { DEFAULT_TOLERANCE, excessRadius } from "../engine/distance";
import { showsBandName, showsDistance, type RingLabel } from "../settings/display";
import { getBandLabel } from "./lecturaItems";

// The Medición's rings around the Origen, their labels, and the colored
// gradient behind them.

/** How far above its ring a Banda's label sits, in px. */
const LABEL_OFFSET = -16;

/**
 * A Banda's ring radius in px. It matches exactly the boundary a Lectura
 * is matched against: the Banda's radius, plus the Origen's own bulk past a
 * standard token (see excessRadius) and the Tolerancia margin — otherwise
 * the ring would promise a boundary the Lecturas don't agree with.
 */
export function ringRadius(radius: number, dpi: number, bandSet: BandSet, originRadius: number): number {
  const tolerance = (bandSet.tolerance ?? DEFAULT_TOLERANCE) / 100;
  return (radius + excessRadius(originRadius) + tolerance) * dpi;
}

function buildRing(
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
    // Each ring and label keeps its offset from the Origen, so moving them
    // all is just "Origen minus offset" (see refreshBandPositions).
    .metadata({ [getPluginId("offset")]: offset })
    .disableHit(true)
    .layer("POPOVER")
    .build();
}

/** One ring per Banda, plus its label when the room's ring label shows anything. */
export function buildBandRingItems(
  center: Vector2,
  theme: Theme,
  bandSet: BandSet,
  dpi: number,
  gridScale: GridScale,
  ringLabel: RingLabel,
  originRadius: number
): Item[] {
  const items: Item[] = [];
  bandSet.bands.forEach((band, i) => {
    const baseColor = theme.colors[i % theme.colors.length];
    const color = getColorString(baseColor);
    const radius = ringRadius(band.radius, dpi, bandSet, originRadius);
    // A circle is positioned by its center, a rectangle by its corner.
    const offset = bandSet.shape === "square" ? { x: radius, y: radius } : { x: 0, y: 0 };
    items.push(buildRing(center, offset, radius * 2, band.name, color, bandSet.shape));

    const parts: string[] = [];
    if (showsBandName(ringLabel)) {
      parts.push(band.name);
    }
    if (showsDistance(ringLabel)) {
      parts.push(flattenGridScale(gridScale, band.radius));
    }
    if (parts.length > 0) {
      const labelOffset = { x: 0, y: radius + LABEL_OFFSET };
      items.push(getBandLabel(center, labelOffset, parts.join(" "), color, getLabelTextColor(baseColor, 180)));
    }
  });
  return items;
}

/**
 * The darkening and the colored gradient behind the rings: two viewport
 * shaders. ring.frag takes up to 10 Bandas as five mat3 uniforms, each
 * holding two: [r1, r2, 0, R1, G1, B1, R2, G2, B2] (radius in px, colors
 * 0-1).
 */
export function buildGradientShaders(
  center: Vector2,
  theme: Theme,
  bandSet: BandSet,
  dpi: number,
  originRadius: number
): Item[] {
  if (bandSet.bands.length > 10) {
    console.warn(`Bandas "${bandSet.name}" has more than 10 bands; the gradient shows only the first 10`);
  }
  const uniforms: Uniform[] = [];
  for (let pair = 0; pair < 5; pair++) {
    const [first, second] = [pair * 2, pair * 2 + 1];
    const color1 = theme.colors[first % theme.colors.length];
    const color2 = theme.colors[second % theme.colors.length];
    const band1 = bandSet.bands[first];
    const band2 = bandSet.bands[second];
    const value: Matrix = [
      band1 ? ringRadius(band1.radius, dpi, bandSet, originRadius) : 0,
      band2 ? ringRadius(band2.radius, dpi, bandSet, originRadius) : 0,
      0,
      color1.r / 255,
      color1.g / 255,
      color1.b / 255,
      color2.r / 255,
      color2.g / 255,
      color2.b / 255,
    ];
    uniforms.push({ name: `data${pair + 1}`, value });
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
      { name: "minFalloff", value: 0.1 },
      { name: "maxFalloff", value: 0.6 },
      { name: "type", value: bandSet.shape === "square" ? 1 : 0 },
    ])
    .build();

  return [darken, color];
}
