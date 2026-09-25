import type { Image, Vector2 } from "@owlbear-rodeo/sdk";
import { IconPosition } from "../engine/types";

const OPPOSITE_POSITION: Record<IconPosition, IconPosition> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/**
 * The ephemeral Lectura icon and the persistent per-token height marker
 * share the same BandSet visual config (shape/position/size/distance), so
 * without this they'd render on top of each other whenever a token being
 * measured also has its own marker. Always anchoring the Lectura on the
 * opposite side keeps both visible at once.
 */
export function oppositeIconPosition(position: IconPosition): IconPosition {
  return OPPOSITE_POSITION[position];
}

export interface TokenBounds {
  topLeft: Vector2;
  scaledWidth: number;
  scaledHeight: number;
}

/**
 * A token's on-screen top-left corner and rendered size, in scene units.
 * Ported from owlbear-daggerheart-altitude/src/markers.ts's tokenBounds.
 * Shared by anything that needs to anchor or size itself relative to a
 * token's actual footprint rather than just its center point (which
 * grid.offset can put anywhere within the image).
 */
export function getTokenBounds(token: Image, dpi: number): TokenBounds {
  const dpiScale = dpi / token.grid.dpi;
  const width = token.image.width * dpiScale;
  const height = token.image.height * dpiScale;
  const offsetX = (token.grid.offset.x / token.image.width) * width;
  const offsetY = (token.grid.offset.y / token.image.height) * height;
  const scaledWidth = width * token.scale.x;
  const scaledHeight = height * token.scale.y;
  return {
    topLeft: {
      x: token.position.x - offsetX * token.scale.x,
      y: token.position.y - offsetY * token.scale.y,
    },
    scaledWidth,
    scaledHeight,
  };
}

/**
 * Anchor just outside a token's real footprint, on the configured side,
 * accounting for its image size, grid offset, and scale. Ported from
 * owlbear-daggerheart-altitude/src/markers.ts's computeAnchor. Shared by the
 * ephemeral Lectura icons (phase 4) and the persistent per-token height
 * markers (phase 5), which both need the exact same math.
 */
export function computeIconAnchor(
  token: Image,
  dpi: number,
  position: IconPosition,
  iconDistance: number
): Vector2 {
  const { topLeft, scaledWidth, scaledHeight } = getTokenBounds(token, dpi);
  const margin = iconDistance * dpi;
  switch (position) {
    case "right":
      return { x: topLeft.x + scaledWidth + margin, y: topLeft.y + scaledHeight / 2 };
    case "top":
      return { x: topLeft.x + scaledWidth / 2, y: topLeft.y - margin };
    case "bottom":
      return { x: topLeft.x + scaledWidth / 2, y: topLeft.y + scaledHeight + margin };
    case "left":
    default:
      return { x: topLeft.x - margin, y: topLeft.y + scaledHeight / 2 };
  }
}
