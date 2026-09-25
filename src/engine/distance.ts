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
 * Distance adjusted for both tokens' real size and an extra Tolerancia
 * margin, t in [0, 1]. Unlike the original single-radius design, the
 * excess-radius correction (see excessRadius) is applied unconditionally,
 * always in full — true body-to-body contact is detected regardless of
 * what Tolerancia is set to, it's never gated behind the slider. Tolerancia
 * is a genuinely separate, additive margin on top of that: 0% adds none
 * (only true contact counts); 100% adds a full extra grid unit of slack
 * beyond true contact. It can no longer make a Lectura *stricter* than
 * plain geometry (no more "penalize excess size" mode at 0%) — Tolerancia
 * now only ever adds generosity, never subtracts it.
 */
export function effectiveDistance(
  centerDistance: number,
  excessRadiusSum: number,
  tolerance: number
): number {
  return centerDistance - excessRadiusSum - tolerance;
}
