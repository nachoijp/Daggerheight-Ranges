import { DistanceMetric } from "./types";

/** 3D distance between two points offset by (dx, dy, dz), per the configured metric. */
export function distance3D(
  dx: number,
  dy: number,
  dz: number,
  metric: DistanceMetric
): number {
  switch (metric) {
    case "spherical":
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    case "cubic":
      return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    case "cylindrical":
      return Math.max(Math.sqrt(dx * dx + dy * dy), Math.abs(dz));
  }
}

// Every Banda radius is implicitly calibrated against a "standard" 1×1
// token on both ends (e.g. Melee = 1 grid unit = two adjacent standard
// tokens' combined half-radii) — half a grid unit, in the same internal
// grid-cell units centerDistance/band.radius/getTokenRadius already use.
const STANDARD_TOKEN_RADIUS = 0.5;

/**
 * How much of a token's radius exceeds the standard baseline every Banda
 * radius already assumes. Zero for a token at or below standard size —
 * only real excess bulk (a Large/Huge token, on either the Origen or the
 * target's end) should be able to stretch or shrink a Lectura's effective
 * distance; a standard-sized token contributes nothing, at any tolerance.
 */
export function excessRadius(radius: number): number {
  return Math.max(0, radius - STANDARD_TOKEN_RADIUS);
}

export const DEFAULT_TOLERANCE = 50;

/**
 * The distance a Banda is matched against: the center distance minus both
 * tokens' excess bulk (so tokens that touch always count as touching) and
 * minus the Tolerancia margin `tolerance` (0-1 grid cells), which only
 * ever makes tokens count as closer.
 */
export function effectiveDistance(
  centerDistance: number,
  excessRadiusSum: number,
  tolerance: number
): number {
  return centerDistance - excessRadiusSum - tolerance;
}

/**
 * The distance shown to people (the Lectura's number, the Distancias
 * panel): center distance minus both tokens' excess bulk, so two Large
 * creatures side by side read as adjacent — but without Tolerancia, which
 * is a matching margin, not part of how far apart they really are.
 */
export function shownDistance(centerDistance: number, excessRadiusSum: number): number {
  return Math.max(0, centerDistance - excessRadiusSum);
}
