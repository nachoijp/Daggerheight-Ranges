import { findBandIndex, measuredBands } from "./bands";
import { Band, BandSet, HeightStep } from "./types";

// A token's height is a signed number of grid units: positive above the
// ground, negative below it, 0 on it. How it moves (and how its marker
// counts icons) depends on the set's heightStep: Banda by Banda, or cell by
// cell.

/** As far up or down as a height can go — far past any real map, just so a held key can't run away. */
export const MAX_HEIGHT = 999;

export function heightStepOf(bandSet: BandSet): HeightStep {
  return bandSet.heightStep ?? "band";
}

export function clampHeight(height: number): number {
  return Math.max(-MAX_HEIGHT, Math.min(MAX_HEIGHT, height));
}

/**
 * The height one step up (`direction` 1) or down (-1) from `height`. By
 * Banda, the next Banda radius past it on that side of the ground (from +7,
 * between 5 and 10, up is 10 and down is 5), stopping at the farthest. By
 * cell, the next whole grid unit.
 */
export function stepHeight(height: number, direction: 1 | -1, bandSet: BandSet): number {
  if (heightStepOf(bandSet) === "unit") {
    return clampHeight(direction > 0 ? Math.floor(height) + 1 : Math.ceil(height) - 1);
  }
  const radii = [...new Set(bandSet.bands.map((band) => band.radius))];
  const stops = [0, ...radii, ...radii.map((radius) => -radius)].sort((a, b) => a - b);
  if (direction > 0) {
    return stops.find((stop) => stop > height) ?? Math.max(height, stops[stops.length - 1]);
  }
  return [...stops].reverse().find((stop) => stop < height) ?? Math.min(height, stops[0]);
}

/**
 * Index into measuredBands of the Banda a height falls in — the smallest
 * one reaching that far (the final Banda, past all the others, if the set
 * has one), or the farthest if none does. It gives the marker its color.
 * undefined for the ground or a set with no Bandas.
 */
export function heightBandIndex(height: number, bandSet: BandSet): number | undefined {
  if (height === 0 || bandSet.bands.length === 0) {
    return undefined;
  }
  const index = findBandIndex(Math.abs(height), bandSet);
  if (index !== null) {
    return index;
  }
  const bands = measuredBands(bandSet);
  return bands.indexOf(bands.reduce((farthest, band) => (band.radius > farthest.radius ? band : farthest)));
}

/** The Banda exactly as far as a height, if any — so the Medición can call a height by its Banda's name. */
export function bandAtHeight(height: number, bandSet: BandSet): Band | undefined {
  return height === 0 ? undefined : bandSet.bands.find((band) => band.radius === Math.abs(height));
}

/** How many icons a height's marker stacks: one per Banda (counted as heightBandIndex does) or one per cell. */
export function markerIconCount(height: number, bandSet: BandSet): number {
  if (heightStepOf(bandSet) === "unit") {
    return Math.max(1, Math.round(Math.abs(height)));
  }
  return (heightBandIndex(height, bandSet) ?? 0) + 1;
}
