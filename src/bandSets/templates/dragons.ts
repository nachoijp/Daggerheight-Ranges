import { BandSet } from "../../engine/types";
import type { Language } from "../../i18n/language";

// Band names here are plain distance numbers, not words — nothing to
// localize, but this still takes `language` to match the other presets'
// signature so getDefaultBandSets() can call all three uniformly.
export function dragons(_language: Language): BandSet {
  return {
    name: "Dragons",
    id: "dragons",
    shape: "square",
    metric: "spherical",
    hideLabel: true,
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
        name: "5",
        id: "dragons-5",
      },
      {
        radius: 3,
        name: "15",
        id: "dragons-15",
      },
      {
        radius: 6,
        name: "30",
        id: "dragons-30",
      },
      {
        radius: 12,
        name: "60",
        id: "dragons-60",
      },
      {
        radius: 24,
        name: "120",
        id: "dragons-120",
      },
    ],
  };
}
