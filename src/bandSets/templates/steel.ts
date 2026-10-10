import { BandSet } from "../../engine/types";
import type { Language } from "../../i18n/language";
import { translate } from "../../i18n/translate";

export function steel(language: Language): BandSet {
  const melee = (radius: number, id: string) => ({
    radius,
    name: `${translate(language, "presets.melee")} ${radius}`,
    id,
  });
  const ranged = (radius: number, id: string) => ({
    radius,
    name: `${translate(language, "presets.steel.ranged")} ${radius}`,
    id,
  });

  return {
    name: "Steel",
    id: "steel",
    shape: "square",
    // Draw Steel counts every square as 1, diagonals and height included:
    // the larger of the ground distance and the height.
    metric: "cubic",
    heightStep: "unit",
    tolerance: 50,
    filterEnabled: false,
    visualization: "circle",
    showLabel: true,
    ringWidth: 0.05,
    iconShape: "triangle",
    iconPosition: "left",
    bands: [
      // Named as the Draw Steel book does. Old-style height markers name
      // their Banda by id, so the existing ids stay (steel-shift is Melee 3).
      melee(1, "steel-melee"),
      melee(2, "steel-melee-2"),
      melee(3, "steel-shift"),
      ranged(5, "steel-ranged"),
      ranged(10, "steel-ranged-2"),
      ranged(12, "steel-ranged-3"),
      ranged(15, "steel-ranged-15"),
      ranged(20, "steel-ranged-20"),
    ],
  };
}
