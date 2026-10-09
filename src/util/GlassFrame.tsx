import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { alpha, useTheme } from "@mui/material/styles";

import { GLASS_BORDER, GLASS_MARGIN } from "./glass";

// GM Notes' panel is two translucent frames: Owlbear's own (translucent,
// blurred) paper filling its action popover, and GM Notes' panel at 20%
// inside it, GLASS_MARGIN in from the edge. Owlbear's paper behind a
// popover opened from OBR.popover.open is opaque instead (tried
// 2026-10-08), so these popovers are opened with hidePaper and both frames
// are drawn here. Drawing only GM Notes' 20% layer let the map show through
// far too much.
//
// The outer frame's color and opacity were solved from screenshots of GM
// Notes over a white and over a dark background (2026-10-08): GM Notes'
// panel comes out 69% opaque, rgb(43, 47, 59) — matched by this gray at 62%
// under the inner 20% layer. Only the outer frame blurs: a blurred layer
// nested in another blurred one composited far more opaque than its own
// values (87%).
/** Owlbear's own translucent popover paper, as measured in the dark theme. */
const OUTER_DARK = "rgb(48, 52, 63)";
const OUTER_OPACITY = 0.62;
/** GM Notes' own panel layer, same value. */
const INNER_OPACITY = 0.2;
const BLUR = "blur(18px) saturate(1.3)";

/**
 * The translucent, blurred panel the extension's popovers sit in, matching
 * GM Notes' look. The page itself is transparent. Dropdown menus and
 * tooltips keep MUI's own opaque paper, so they stay readable over it.
 */
export function GlassFrame({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const divider = dark ? "rgba(255,255,255,.09)" : "rgba(20,18,30,.10)";
  // Only measured in the dark theme; the light one keeps the theme's paper.
  const outer = dark ? OUTER_DARK : theme.palette.background.paper;
  return (
    <>
      <GlobalStyles
        styles={{
          "html, body, #root": { height: "100%" },
          body: { background: "transparent", overflow: "hidden" },
        }}
      />
      <Box
        sx={{
          height: "100%",
          boxSizing: "border-box",
          p: `${GLASS_MARGIN}px`,
          bgcolor: alpha(outer, OUTER_OPACITY),
          backdropFilter: BLUR,
          WebkitBackdropFilter: BLUR,
          border: `${GLASS_BORDER}px solid ${divider}`,
          borderRadius: "16px",
        }}
      >
        <Box
          sx={{
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            bgcolor: alpha(theme.palette.background.default, INNER_OPACITY),
            border: `${GLASS_BORDER}px solid ${divider}`,
            borderRadius: "14px",
            boxShadow: "0 10px 34px -10px rgba(0,0,0,.5)",
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
}
