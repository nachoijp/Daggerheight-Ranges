// Sizes of the two translucent frames popovers sit in (see GlassFrame). Its
// own module so the background script can size popovers without pulling in
// GlassFrame's UI code.

/** Gap between the outer frame and the inner panel (room for the panel's shadow). */
export const GLASS_MARGIN = 7;
/** Each frame's own border. */
export const GLASS_BORDER = 1;
/** How much bigger than its content a glass popover is: the outer border, the gap and the inner border, on both sides. */
export const GLASS_FRAME = 2 * (GLASS_BORDER + GLASS_MARGIN + GLASS_BORDER);
