import { BandSet } from "../../engine/types";
import type { Language } from "../../i18n/language";
import { translate } from "../../i18n/translate";

export function steel(language: Language): BandSet {
  return {
    name: "Steel",
    id: "steel",
    shape: "square",
    metric: "spherical",
    tolerance: 50,
    filterEnabled: false,
    visualization: "circle",
    showLabel: true,
    ringWidth: 0.05,
    iconShape: "triangle",
    iconPosition: "left",
    bands: [
      {
        radius: 1,
        name: translate(language, "presets.melee"),
        id: "steel-melee",
      },
      {
        radius: 3,
        name: translate(language, "presets.steel.shift"),
        id: "steel-shift",
      },
      {
        radius: 5,
        name: translate(language, "presets.steel.ranged"),
        id: "steel-ranged",
      },
      {
        radius: 10,
        name: translate(language, "presets.steel.ranged"),
        id: "steel-ranged-2",
      },
      {
        radius: 12,
        name: translate(language, "presets.steel.ranged"),
        id: "steel-ranged-3",
      },
    ],
  };
}
