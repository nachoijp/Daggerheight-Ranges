import { Band, BandSet } from "./types";

export const FINAL_BAND_ID = "final";

/**
 * The Bandas a distance can fall in: the set's own, plus its final Banda
 * (endless, after all of them) when it has one switched on. Indexes into
 * this list are what Lecturas, the Distancias panel and height markers use
 * for a Banda's color and icons — the set's own come first, so they keep
 * theirs. Rings are only drawn for the set's own.
 */
export function measuredBands(bandSet: BandSet): Band[] {
  if (!bandSet.finalBand?.enabled) {
    return bandSet.bands;
  }
  return [...bandSet.bands, { id: FINAL_BAND_ID, name: bandSet.finalBand.name, radius: Infinity }];
}

/**
 * The Band a given distance falls into: the smallest-radius Band that still
 * reaches that distance (the final Banda reaches any). Bands are checked
 * regardless of their order in the set. Returns undefined if the distance
 * is beyond every one.
 */
export function findBand(
  distance: number,
  bandSet: BandSet
): Band | undefined {
  const index = findBandIndex(distance, bandSet);
  return index === null ? undefined : measuredBands(bandSet)[index];
}

/**
 * Index into measuredBands of the Banda a distance falls in, or null if none
 * reaches it. (By index, not by Band: measuredBands builds the final Banda
 * anew each call, so one call's Band isn't found in another's list.)
 */
export function findBandIndex(distance: number, bandSet: BandSet): number | null {
  const bands = measuredBands(bandSet);
  let closest: number | null = null;
  for (let i = 0; i < bands.length; i++) {
    if (bands[i].radius < distance) {
      continue;
    }
    if (closest === null || bands[i].radius < bands[closest].radius) {
      closest = i;
    }
  }
  return closest;
}
