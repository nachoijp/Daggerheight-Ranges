import type { Image } from "@owlbear-rodeo/sdk";
import { BandSet } from "../engine/types";
import {
  DEFAULT_TOLERANCE,
  distance3D,
  effectiveDistance,
  excessRadius,
  shownDistance,
} from "../engine/distance";
import { findBand } from "../engine/bands";
import { getTokenRadius } from "../render/iconAnchor";

export type DistanceRow = {
  token: Image;
  /** Index into bandSet.bands, or null if out of range. */
  bandIndex: number | null;
  /** Grid units, the same number a Lectura shows. */
  distance: number;
  /** Ground-plane leg alone (the metric's own flat distance), minus the same bulk. */
  horizontal: number;
  /** Target height - origin height, grid units: positive = the target is higher. */
  heightDifference: number;
};

/**
 * Every other token's reading from `origin`, closest first — the same math
 * a Medición started on `origin` would use for its Lecturas (heights from
 * the persistent markers, both tokens' excess bulk, Tolerancia for which
 * Banda it falls in).
 */
export function computeDistanceRows(
  origin: Image,
  others: Image[],
  heights: Map<string, number>,
  bandSet: BandSet,
  dpi: number
): DistanceRow[] {
  const originHeight = heights.get(origin.id) ?? 0;
  const originExcess = excessRadius(getTokenRadius(origin, dpi));
  const tolerance = (bandSet.tolerance ?? DEFAULT_TOLERANCE) / 100;
  const rows = others.map((token): DistanceRow => {
    const dx = (token.position.x - origin.position.x) / dpi;
    const dy = (token.position.y - origin.position.y) / dpi;
    const heightDifference = (heights.get(token.id) ?? 0) - originHeight;
    const centerDistance = distance3D(dx, dy, heightDifference, bandSet.metric);
    const excessSum = originExcess + excessRadius(getTokenRadius(token, dpi));
    const band = findBand(effectiveDistance(centerDistance, excessSum, tolerance), bandSet);
    return {
      token,
      bandIndex: band ? bandSet.bands.indexOf(band) : null,
      distance: shownDistance(centerDistance, excessSum),
      // Token size is a ground footprint, so it shortens this leg too; the
      // vertical one has nothing to subtract (tokens have no height of
      // their own), so it's just the raw height difference.
      horizontal: shownDistance(distance3D(dx, dy, 0, bandSet.metric), excessSum),
      heightDifference,
    };
  });
  return rows.sort((a, b) => a.distance - b.distance);
}

/** The name Owlbear shows on a token, falling back to its item name. */
export function tokenName(token: Image): string {
  return token.text?.plainText || token.name || "?";
}
