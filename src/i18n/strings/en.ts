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
  "toolbar.distancias": "Distances",

  "settings.tab.bandas": "Ranges",

  "settings.bandSet.new": "New Ranges",
  "settings.bandSet.newName": "Ranges {n}",
  "settings.bandSet.notFound": '"{name}" not found. Please select a new one.',
  "settings.bandSet.outOfSync":
    '"{name}" is out of sync with the saved Ranges. Select a new one to update.',

  "settings.band.radiusAriaLabel": "Radius",
  "settings.band.newName": "Range {n}",

  "settings.bandSetEditor.addBanda": "Add Range",

  "settings.bandShape.tooltip": "The shape used to draw this Range's rings on the map.",
  "settings.bandShape.circleAria": "Circle",
  "settings.bandShape.squareAria": "Square",

  "settings.iconPosition.label": "Position",
  "settings.iconPosition.tooltip": "Which side of the token the height marker sits on. Icon-style Readings go on the opposite side.",
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

  "settings.visualization.icon": "Icon",
  "settings.visualization.ring": "Ring",
  "settings.visualization.circle": "Circle",

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
  "settings.global.hotkeyActivate": "Activate Measurement",
  "settings.global.hotkeyRaise": "Raise height",
  "settings.global.hotkeyLower": "Lower height",
  "settings.global.hotkeyRecording": "Press a key…",
  "settings.global.enableAltitude": "Height",
  "settings.global.enableAltitudeToggle": "Enable the height feature",
  "settings.global.enableAltitudeTooltip":
    "If off, the whole height feature disappears — hotkeys, the height label during Measurement, the context menu, and any height markers already placed get deleted. Leaves plain Range behavior with no height. The context menu changes right away; the rest applies on the next Measurement.",
  "settings.global.altitudeMenuToggle": 'Show the "Height" option in the context menu',
  "settings.global.markerStyle": "Marker style",
  "settings.global.markerStyleTooltip":
    "How each token's height shows, for everyone: as the stacked icons, as a label with the exact height (e.g. \"⬆️ 30ft\"), or both. Applies instantly, no reload needed.",
  "settings.global.markerStyleIcons": "Icons",
  "settings.global.markerStyleLabel": "Label",
  "settings.global.markerStyleBoth": "Both",
  "settings.global.distancePanel": "Distances panel",
  "settings.global.distancePanelTooltip":
    "A button on the Measurement toolbar that opens a list with the distance, Range and height difference from one token to every other one. Players never see hidden tokens.",
  "settings.global.distancePanelOff": "Off",
  "settings.global.distancePanelGm": "GM only",
  "settings.global.distancePanelEveryone": "Everyone",

  "settings.tab.mapa": "Map",
  "settings.tab.altura": "Height",
  "settings.tab.general": "General",
  "settings.advanced": "Advanced",
  "settings.opacity": "Opacity",
  "settings.bandas.presetNotice": "{name} is a built-in set: its Ranges, calculation mode and Tolerance can't be edited.",
  "settings.bandas.duplicate": "Duplicate",
  "settings.bandas.copyName": "{name} (copy)",
  "settings.mapa.lectura": "Reading on each token",
  "settings.mapa.lecturaTooltip": "How each measured token is marked: a stacked icon beside it, a ring around it, or a translucent circle over it. With \"None\" nothing is drawn on the token (the label, if on, still shows).",
  "settings.mapa.none": "None",
  "settings.mapa.iconSize": "Icon size",
  "settings.mapa.iconSizeTooltip": "Scale of the Reading's icons. Separate from the height markers' size.",
  "settings.mapa.ringWidth": "Ring width",
  "settings.mapa.ringWidthTooltip": "Thickness of the ring drawn around the token.",
  "settings.mapa.circleSize": "Circle size",
  "settings.mapa.circleSizeTooltip": "Diameter of the circle relative to the token's size.",
  "settings.mapa.opacityTooltip": "How opaque the Reading is drawn. Each style remembers its own.",
  "settings.mapa.lecturaLabel": "Reading label",
  "settings.mapa.lecturaLabelTooltip": "The text next to each measured token: its Range's name, its exact distance (rounded to whole cells, counting the tokens' height and size), or both.",
  "settings.mapa.ringLabel": "Ring label",
  "settings.mapa.ringLabelTooltip": "The text next to each Range ring around the Origin: its name, its distance, or both.",
  "settings.mapa.labelBand": "Range",
  "settings.mapa.labelName": "Name",
  "settings.mapa.labelDistance": "Distance",
  "settings.mapa.labelBoth": "Both",
  "settings.mapa.labelBothRing": "Both",
  "settings.altura.iconShape": "Icon shape",
  "settings.altura.iconShapeTooltip": "The shape of the stacked icons, shared by height markers and icon-style Readings. Each Range can have its own (Ranges → edit).",
  "settings.altura.marker": "marker",
  "settings.altura.size": "Size",
  "settings.altura.sizeTooltip": "Scale of the height marker's icons.",
  "settings.altura.opacityTooltip": "How opaque the height marker (or its label) is drawn.",
  "settings.altura.distance": "Distance from token",
  "settings.altura.distanceTooltip": "How far from the token the height marker sits.",
  "settings.altura.hotkeys": "Hotkeys while measuring",
  "settings.altura.hotkeysTooltip": "Raise or lower the Origin's height while measuring. Click a key and press the new one. Applies on the next Measurement.",
  "settings.general.activateTooltip": "The key that activates the Measurement tool. Click it and press the new one.",

  "tokenHeight.selectToken": "Select a token.",
  "tokenHeight.up": "Up",
  "tokenHeight.down": "Down",

  "onMap.ground": "Ground",
  "onMap.outOfRange": "Out of range",

  "distances.disabled": "The GM turned off the distances panel.",
  "distances.origin": "Measure from",
  "distances.pickToken": "Pick or select a token",
  "distances.noOtherTokens": "There are no other tokens in the scene.",
  "distances.tableLabel": "Distances from {name}",
  "distances.token": "Token",
  "distances.band": "Range",
  "distances.distance": "Distance",
  "distances.horizontal": "Horiz.",
  "distances.horizontalTooltip":
    "Distance along the ground, ignoring height, measured per the calculation mode (cubic counts diagonals as straight). Excludes large tokens' extra size.",
  "distances.vertical": "Vert.",
  "distances.verticalTooltip":
    "Height difference: ↑ if the token is higher than the origin, ↓ if it's lower.",
  "distances.total": "Total",
  "distances.totalTooltip":
    "The full distance, combining horizontal and vertical per the calculation mode. It's what decides the Range, and the same number the Reading shows.",
  "distances.sameHeight": "Same height",
  "distances.close": "Close",
  "distances.above": "{distance} higher",
  "distances.below": "{distance} lower",

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
