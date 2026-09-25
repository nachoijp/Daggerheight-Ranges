export type DistanceMetric = "spherical" | "cubic" | "cylindrical";

/** Which side of a token's baseline a marker represents. */
export type Direction = "up" | "down";

export type BandShape = "circle" | "square";

/** Where a Lectura's icon stack sits relative to its token. */
export type IconPosition = "left" | "right" | "top" | "bottom";

/** How a Lectura is drawn on the measured token. */
export type Visualization = "icon" | "ring" | "circle";

/** The silhouette used for a Lectura's icon stack, ported from Daggerheight 1.x. */
export type IconShape =
  | "triangle"
  | "triangleStepped"
  | "bar"
  | "circle"
  | "diamond"
  | "square"
  | "star"
  | "wingDrill";

export type Band = {
  radius: number;
  name: string;
  id: string;
  /** Overrides the BandSet's default icon shape for just this Banda (e.g. Melee should
   * always be a circle, never a directional shape). Missing = use the BandSet's own. */
  iconShape?: IconShape;
};

export type BandSet = {
  name: string;
  id: string;
  shape: BandShape;
  metric: DistanceMetric;
  bands: Band[];
  hideLabel?: boolean;
  hideSize?: boolean;
  /** Integer percent 0-100; extra margin added on top of real geometric
   * contact between the Origen and target tokens (0 = none, 100 = up to a
   * full extra grid unit) — real contact itself always counts regardless of
   * this value. See effectiveDistance in engine/distance.ts. Missing =
   * DEFAULT_TOLERANCE (50). */
  tolerance?: number;
  /** Lectura icon-stack look. Missing on older BandSets — default circle/top/1/0.15. */
  iconShape?: IconShape;
  iconPosition?: IconPosition;
  /** 0.5-2 */
  iconSize?: number;
  /** 0-0.4, fraction of grid dpi */
  iconDistance?: number;
  /** How the Lectura draws on the token. Missing = "icon" (phase 4/5 default). */
  visualization?: Visualization;
  /** Show a text Banda-name pill alongside whichever visualization is active. Missing = false. */
  showLabel?: boolean;
  /** Ring mode's stroke width, fraction of grid dpi. Missing = 0.05. */
  ringWidth?: number;
  /** Circle mode's fill opacity, 0-1. Missing = 0.35. */
  circleOpacity?: number;
  /** Dims (or, for labels, hides) any Lectura farther than the filterBandId
   * Banda's own radius, so tokens within it stand out against the rest.
   * Missing = false. */
  filterEnabled?: boolean;
  /** id of the Banda whose radius is used as the Filtro's max distance.
   * Only meaningful when filterEnabled is true. */
  filterBandId?: string;
};
