import { Color } from "../theme/themes";

export function getColorString(color: Color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function getLabelTextColor(color: Color, threshold: number) {
  // Luminance
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  return brightness < threshold ? "white" : "black";
}
