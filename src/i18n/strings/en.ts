import type { TranslationKey } from "./es";

// Typed as an exact Record against es.ts's keys, so TypeScript catches a
// missing or extra key in either dictionary at compile time. Domain terms
// are translated per the user's explicit choice: Banda -> Range,
// Origen -> Origin, Medición -> Measurement, Lectura -> Reading.
const en: Record<TranslationKey, string> = {
  "common.delete": "Delete",
  "common.name": "Name",
  "common.shape": "Shape",
  "common.default": "Default",

  "toolbar.medicion": "Measurement",
  "toolbar.altura": "Height",
  "toolbar.opciones": "Options",
  "toolbar.colorTheme": "Color theme",
  "toolbar.raiseHeight": "Raise height",
  "toolbar.lowerHeight": "Lower height",

  "settings.tab.bandas": "Ranges",
  "settings.tab.medicion": "Measurement",
  "settings.tab.global": "Global",

  "settings.bandSet.new": "New Ranges",
  "settings.bandSet.newName": "Ranges {n}",
  "settings.bandSet.notFound": '"{name}" not found. Please select a new one.',
  "settings.bandSet.outOfSync":
    '"{name}" is out of sync with the saved Ranges. Select a new one to update.',

  "settings.band.radiusAriaLabel": "Radius",
  "settings.band.newName": "Range {n}",

  "settings.bandSetEditor.addBanda": "Add Range",
  "settings.bandSetEditor.showName": "Show Name",
  "settings.bandSetEditor.showNameTooltip":
    "Shows the Range's name next to its ring on the map.",
  "settings.bandSetEditor.showDistance": "Show Distance",
  "settings.bandSetEditor.showDistanceTooltip":
    "Shows the distance (in the grid's unit) next to the ring on the map.",

  "settings.bandShape.tooltip": "The shape used to draw this Range's rings on the map.",
  "settings.bandShape.circleAria": "Circle",
  "settings.bandShape.squareAria": "Square",

  "settings.iconPosition.label": "Icon position",
  "settings.iconPosition.tooltip": "Which side of the token the Reading's icon appears on.",
  "settings.iconPosition.left": "Left",
  "settings.iconPosition.top": "Top",
  "settings.iconPosition.bottom": "Bottom",
  "settings.iconPosition.right": "Right",

  "settings.metric.label": "Calculation mode",
  "settings.metric.tooltip":
    "How horizontal distance and height combine to decide whether a token is within a Range. Hover each option to see a diagram.",
  "settings.metric.spherical": "Spherical",
  "settings.metric.cubic": "Cubic",
  "settings.metric.cylindrical": "Cylindrical",
  "settings.metric.sphericalDesc":
    "Distance is measured in a straight line including height, like the radius of a sphere from the Origin.",
  "settings.metric.cubicDesc":
    "The larger of horizontal distance and height is used (not added together), like stepping between concentric boxes.",
  "settings.metric.cylindricalDesc":
    "Horizontal distance is measured radially and height separately, like floors; whichever is larger is used.",

  "settings.medicion.tolerance": "Tolerance",
  "settings.medicion.toleranceTooltip":
    "Real edge-to-edge contact always counts as inside, no matter this value. Tolerance adds extra margin on top: 0% adds none; 100% adds up to a full extra grid unit of margin beyond real contact.",
  "settings.medicion.filter": "Filter",
  "settings.medicion.filterTooltip":
    "Dims (or, for labels, hides) the Reading of any token beyond the chosen Range's radius, so the ones within it stand out against the rest.",
  "settings.medicion.filterToggle": "Highlight tokens within a Range",
  "settings.medicion.filterPlaceholder": "Choose a Range",
  "settings.medicion.visualization": "Visualization",
  "settings.medicion.visualizationTooltip":
    "How each measured token is marked: a stacked icon beside it, a ring around it, or a translucent circle over it.",
  "settings.medicion.showLabel": "Show label",
  "settings.medicion.iconSize": "Icon size",
  "settings.medicion.iconSizeTooltip": "Scale of the Reading's icons, relative to normal size.",
  "settings.medicion.iconDistance": "Distance from token",
  "settings.medicion.iconDistanceTooltip": "How far from the token the Reading's icon appears.",
  "settings.medicion.ringWidth": "Ring width",
  "settings.medicion.ringWidthTooltip": "Thickness of the ring drawn around the token.",
  "settings.medicion.circleOpacity": "Circle opacity",
  "settings.medicion.circleOpacityTooltip": "How transparent the circle drawn over the token is.",

  "settings.visualization.icon": "Icon",
  "settings.visualization.ring": "Ring",
  "settings.visualization.circle": "Circle",

  "settings.iconShape.label": "Icon shape",
  "settings.iconShape.tooltip": "The shape of the stacked icons each token's Reading shows.",
  "settings.iconShape.triangle": "Triangle",
  "settings.iconShape.triangleStepped": "Stepped triangle",
  "settings.iconShape.bar": "Bar",
  "settings.iconShape.circle": "Circle",
  "settings.iconShape.diamond": "Diamond",
  "settings.iconShape.square": "Square",
  "settings.iconShape.star": "Star",
  "settings.iconShape.wingDrill": "Feather",

  "settings.bandIconShape.tooltip": "Icon shape for this Range (defaults to the set's own)",

  "settings.global.language": "Language",
  "settings.global.languageTooltip":
    "Language for the settings interface and the text drawn on the map during a Measurement. Saved for the whole room.",
  "settings.global.languageEs": "Español",
  "settings.global.languageEn": "English",
  "settings.global.hotkeys": "Hotkeys",
  "settings.global.hotkeysTooltip":
    "Keys used across the whole room. Click a key and press the new one. The Measurement activation shortcut requires reloading the room; raise/lower height take effect on the next Measurement.",
  "settings.global.hotkeyActivate": "Activate Measurement",
  "settings.global.hotkeyRaise": "Raise height",
  "settings.global.hotkeyLower": "Lower height",
  "settings.global.hotkeyRecording": "Press a key…",
  "settings.global.enableLecturas": "Readings",
  "settings.global.enableLecturasToggle": "Show a Reading on each measured token",
  "settings.global.enableLecturasTooltip":
    "If off, the Measurement tool still works the same (the rings and gradient around the Origin still show), but stops showing a Reading (icon/ring/circle + label) on each measured token — leaves plain Ranges-style behavior with no per-token readings. Applies on the next Measurement, no reload needed.",
  "settings.global.enableAltitude": "Height",
  "settings.global.enableAltitudeToggle": "Enable the height feature",
  "settings.global.enableAltitudeTooltip":
    "If off, the whole height feature disappears — hotkeys, the height label during Measurement, the context menu, and any height markers already placed get deleted. Leaves plain Range behavior with no height. The context menu requires reloading the room; the rest applies on the next Measurement.",
  "settings.global.altitudeMenu": "Height menu",
  "settings.global.altitudeMenuToggle": 'Show the "Height" option in the context menu',
  "settings.global.altitudeMenuTooltip":
    "If off, the only way to change a token's height is via hotkeys (Measurement, or the global ones if enabled). Requires reloading the room.",

  "tokenHeight.selectToken": "Select a token.",
  "tokenHeight.up": "Up",
  "tokenHeight.down": "Down",

  "onMap.ground": "Ground",
  "onMap.outOfRange": "Out of range",

  "theme.storageUnavailable": "Storage is not available",
  "theme.storageUnavailableBody":
    "The extension can't change the theme. Please enable third-party cookies.",

  "presets.melee": "Melee",
  "presets.dagger.veryClose": "Very Close",
  "presets.dagger.close": "Close",
  "presets.dagger.far": "Far",
  "presets.dagger.veryFar": "Very Far",
  "presets.steel.shift": "Shift",
  "presets.steel.ranged": "Ranged",
};

export default en;
