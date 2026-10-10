import type { Label } from "@owlbear-rodeo/sdk";
import { Color } from "../theme/themes";

export function getColorString(color: Color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// How thick a label's text outline is, as a share of its font size.
const LABEL_TEXT_STROKE_RATIO = 0.15;
// Black text has no outline, so it's drawn heavier to weigh about the same
// as outlined white text.
const LABEL_TEXT_WEIGHT = 400;
const LABEL_DARK_TEXT_WEIGHT = 600;

/**
 * Styles a label's text for its background color, at its current font size:
 * black text on light backgrounds; white text on the rest, outlined in the
 * same dark shade as the icons so it stays legible on mid-light colors.
 */
export function applyLabelTextStyle(label: Label, background: Color, opacity: number) {
  // Luminance
  const brightness = (background.r * 299 + background.g * 587 + background.b * 114) / 1000;
  const white = brightness < 180;
  const style = label.text.style;
  style.fillColor = white ? "white" : "black";
  style.fillOpacity = opacity;
  style.fontWeight = white ? LABEL_TEXT_WEIGHT : LABEL_DARK_TEXT_WEIGHT;
  style.strokeColor = getIconStrokeColor(background);
  style.strokeOpacity = white ? opacity : 0;
  style.strokeWidth = white ? style.fontSize * LABEL_TEXT_STROKE_RATIO : 0;
}

// How much of an icon's color its outline keeps.
const ICON_STROKE_SHADE = 0.55;

/**
 * An icon's outline: a darker shade of its own color, which still sets it off
 * the map without the near-black edge that looks heavy in Owlbear's light mode.
 */
export function getIconStrokeColor(color: Color) {
  return getColorString({
    r: Math.round(color.r * ICON_STROKE_SHADE),
    g: Math.round(color.g * ICON_STROKE_SHADE),
    b: Math.round(color.b * ICON_STROKE_SHADE),
  });
}
