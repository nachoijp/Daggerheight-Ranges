import OBR from "@owlbear-rodeo/sdk";
import { GLASS_FRAME } from "./glass";

/** Space left free under a popover, so it never touches the screen's bottom edge. */
const BOTTOM_GAP = 16;

/**
 * The tallest content a glass popover whose top sits `top` px down Owlbear's
 * window can have before running off the bottom of the screen — so it only
 * scrolls when the screen is really too short, not at a fixed size. The
 * SDK has no event for the window being resized: callers ask again each
 * time the popover opens. null if Owlbear doesn't answer.
 */
export async function roomBelow(top: number): Promise<number | null> {
  try {
    return (await OBR.viewport.getHeight()) - top - BOTTOM_GAP - GLASS_FRAME;
  } catch {
    return null;
  }
}
