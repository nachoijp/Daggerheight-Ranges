import { Band, BandSet } from "./types";

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
