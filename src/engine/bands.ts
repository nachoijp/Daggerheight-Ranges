import { Band, BandSet, DistanceMetric } from "./types";

/**
 * The Band a given distance falls into: the smallest-radius Band that still
 * reaches that distance. Bands are checked regardless of their order in the
 * set. Returns undefined if the distance is beyond every configured Band.
 */
export function findBand(
  distance: number,
  bandSet: BandSet
): Band | undefined {
  let closest: Band | undefined;
  for (const band of bandSet.bands) {
    if (band.radius < distance) {
      continue;
    }
    if (!closest || band.radius < closest.radius) {
      closest = band;
    }
  }
  return closest;
}

/**
 * The horizontal (ground-plane) radius a Band's true 3D radius projects to
 * at a given height above/below the Origen. For a spherical Band this is the
 * classic sphere/plane intersection radius; cubic and cylindrical Bands keep
 * their full horizontal radius until the height exceeds the Band's own
 * radius, at which point the plane misses the Band entirely (0).
 */
export function groundPlaneRadius(
  bandRadius: number,
  height: number,
  metric: DistanceMetric
): number {
  const absHeight = Math.abs(height);
  if (absHeight >= bandRadius) {
    return 0;
  }
  if (metric === "spherical") {
    return Math.sqrt(bandRadius * bandRadius - height * height);
  }
  return bandRadius;
}
