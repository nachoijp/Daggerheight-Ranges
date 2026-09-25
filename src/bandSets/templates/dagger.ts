import { BandSet } from "../../engine/types";
import type { Language } from "../../i18n/language";
import { translate } from "../../i18n/translate";

// The preset's own name ("Dagger") is a proper noun, left untranslated —
// only the Bandas' own names (generic distance words) are localized.
export function dagger(language: Language): BandSet {
  return {
    name: "Dagger",
    id: "dagger",
    shape: "circle",
    metric: "spherical",
    hideSize: true,
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
        id: "dagger-melee",
      },
      {
        radius: 3,
        name: translate(language, "presets.dagger.veryClose"),
        id: "dagger-very-close",
      },
      {
        radius: 6,
        name: translate(language, "presets.dagger.close"),
        id: "dagger-close",
      },
      {
        radius: 12,
        name: translate(language, "presets.dagger.far"),
        id: "dagger-far",
      },
      {
        radius: 60,
        name: translate(language, "presets.dagger.veryFar"),
        id: "dagger-very-far",
      },
    ],
  };
}
