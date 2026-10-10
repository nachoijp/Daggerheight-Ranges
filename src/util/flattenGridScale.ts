import { type GridScale } from "@owlbear-rodeo/sdk";

/**
 * The grid's unit, e.g. "ft". Owlbear doesn't parse one out of a scale
 * written with a space ("5 ft": parsed.unit is ""), so it's then taken from
 * the scale as the GM wrote it, space and all.
 */
export function gridUnit(scale: GridScale): string {
  if (scale.parsed.unit) {
    return scale.parsed.unit;
  }
  return scale.raw.match(/^\s*[\d.,]*(.*?)\s*$/)?.[1] ?? "";
}

export function flattenGridScale(scale: GridScale, multiplier = 1): string {
  return `${(multiplier * scale.parsed.multiplier).toFixed(scale.parsed.digits)}${gridUnit(scale)}`;
}

/** A distance in grid units as text, rounded to whole grid units first so it only changes cell by cell. */
export function formatDistance(scale: GridScale, gridUnits: number): string {
  return flattenGridScale(scale, Math.round(gridUnits));
}
