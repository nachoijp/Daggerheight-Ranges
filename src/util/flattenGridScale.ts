import { type GridScale } from "@owlbear-rodeo/sdk";

export function flattenGridScale(scale: GridScale, multiplier = 1): string {
  return `${(multiplier * scale.parsed.multiplier).toFixed(
    scale.parsed.digits
  )}${scale.parsed.unit}`;
}

/** A distance in grid units as text, rounded to whole grid units first so it only changes cell by cell. */
export function formatDistance(scale: GridScale, gridUnits: number): string {
  return flattenGridScale(scale, Math.round(gridUnits));
}
