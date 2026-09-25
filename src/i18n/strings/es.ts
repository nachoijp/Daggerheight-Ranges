// Spanish is this extension's native language — this file is the source of
// truth for which keys exist (en.ts is typed against it, so a missing/extra
// key in either dictionary is a compile error).
const es = {
  "common.delete": "Eliminar",
  "common.name": "Nombre",
  "common.shape": "Forma",
  "common.default": "Predeterminado",

  "toolbar.medicion": "Medición",
  "toolbar.altura": "Altura",
  "toolbar.opciones": "Opciones",
  "toolbar.colorTheme": "Tema de color",
  "toolbar.raiseHeight": "Subir altura",
  "toolbar.lowerHeight": "Bajar altura",

  "settings.tab.bandas": "Bandas",
  "settings.tab.medicion": "Medición",
  "settings.tab.global": "Global",

  "settings.bandSet.new": "Nuevas Bandas",
  "settings.bandSet.newName": "Bandas {n}",
  "settings.bandSet.notFound": '"{name}" no encontrado. Elegí uno nuevo.',
  "settings.bandSet.outOfSync":
    '"{name}" desactualizado respecto a las Bandas guardadas. Elegí uno nuevo para actualizar.',

  "settings.band.radiusAriaLabel": "Radio",
  "settings.band.newName": "Banda {n}",

  "settings.bandSetEditor.addBanda": "Agregar Banda",
  "settings.bandSetEditor.showName": "Mostrar nombre",
  "settings.bandSetEditor.showNameTooltip":
    "Muestra el nombre de la Banda junto a su anillo en el mapa.",
  "settings.bandSetEditor.showDistance": "Mostrar distancia",
  "settings.bandSetEditor.showDistanceTooltip":
    "Muestra la distancia (en la unidad de la grilla) junto al anillo en el mapa.",

  "settings.bandShape.tooltip":
    "La forma con la que se dibujan los anillos de esta Banda en el mapa.",
  "settings.bandShape.circleAria": "Círculo",
  "settings.bandShape.squareAria": "Cuadrado",

  "settings.iconPosition.label": "Posición del ícono",
  "settings.iconPosition.tooltip": "De qué lado del token aparece el ícono de la Lectura.",
  "settings.iconPosition.left": "Izquierda",
  "settings.iconPosition.top": "Arriba",
  "settings.iconPosition.bottom": "Abajo",
  "settings.iconPosition.right": "Derecha",

  "settings.metric.label": "Modo de cálculo",
  "settings.metric.tooltip":
    "Cómo se combinan la distancia horizontal y la altura para calcular si un token está dentro de una Banda. Pasá el mouse por cada opción para ver un esquema.",
  "settings.metric.spherical": "Esférico",
  "settings.metric.cubic": "Cúbico",
  "settings.metric.cylindrical": "Cilíndrico",
  "settings.metric.sphericalDesc":
    "La distancia se mide en línea recta considerando también la altura, como el radio de una esfera desde el Origen.",
  "settings.metric.cubicDesc":
    "Se usa la mayor entre la distancia horizontal y la altura (no se suman), como saltar entre cajas concéntricas.",
  "settings.metric.cylindricalDesc":
    "El horizontal se mide de forma radial y la altura aparte, como pisos; se usa la que sea mayor de las dos.",

  "settings.medicion.tolerance": "Tolerancia",
  "settings.medicion.toleranceTooltip":
    "El contacto real entre bordes siempre cuenta como adentro, sin importar este valor. La Tolerancia agrega margen extra por encima: 0% no agrega nada; 100% agrega hasta 1 casillero completo de margen además del contacto real.",
  "settings.medicion.filter": "Filtro",
  "settings.medicion.filterTooltip":
    "Atenúa (o, en las etiquetas, oculta) la Lectura de cualquier token más allá del radio de la Banda elegida, para que los que sí están dentro resalten contra el resto.",
  "settings.medicion.filterToggle": "Resaltar tokens dentro de una Banda",
  "settings.medicion.filterPlaceholder": "Elegí una Banda",
  "settings.medicion.visualization": "Visualización",
  "settings.medicion.visualizationTooltip":
    "Cómo se marca cada token medido: un ícono apilado al lado, un anillo alrededor, o un círculo semitransparente encima.",
  "settings.medicion.showLabel": "Mostrar etiqueta",
  "settings.medicion.iconSize": "Tamaño del ícono",
  "settings.medicion.iconSizeTooltip": "Escala de los íconos de la Lectura, relativa al tamaño normal.",
  "settings.medicion.iconDistance": "Distancia al token",
  "settings.medicion.iconDistanceTooltip": "Qué tan lejos del token aparece el ícono de la Lectura.",
  "settings.medicion.ringWidth": "Ancho del anillo",
  "settings.medicion.ringWidthTooltip": "Grosor del trazo del anillo alrededor del token.",
  "settings.medicion.circleOpacity": "Opacidad del círculo",
  "settings.medicion.circleOpacityTooltip": "Qué tan transparente es el círculo dibujado sobre el token.",

  "settings.visualization.icon": "Ícono",
  "settings.visualization.ring": "Anillo",
  "settings.visualization.circle": "Círculo",

  "settings.iconShape.label": "Forma del ícono",
  "settings.iconShape.tooltip": "La forma de los íconos apilados que muestra la Lectura de cada token.",
  "settings.iconShape.triangle": "Triángulo",
  "settings.iconShape.triangleStepped": "Triángulo escalonado",
  "settings.iconShape.bar": "Barra",
  "settings.iconShape.circle": "Círculo",
  "settings.iconShape.diamond": "Rombo",
  "settings.iconShape.square": "Cuadrado",
  "settings.iconShape.star": "Estrella",
  "settings.iconShape.wingDrill": "Pluma",

  "settings.bandIconShape.tooltip": "Forma del ícono para esta Banda (por defecto, usa la del set)",

  "settings.global.language": "Idioma",
  "settings.global.languageTooltip":
    "Idioma de la interfaz de configuración y del texto que se dibuja en el mapa durante una Medición. Se guarda para toda la sala.",
  "settings.global.languageEs": "Español",
  "settings.global.languageEn": "English",
  "settings.global.hotkeys": "Atajos de teclado",
  "settings.global.hotkeysTooltip":
    "Teclas usadas en toda la sala. Hacé clic en una tecla y presioná la nueva. El atajo para activar Medición requiere recargar la sala; subir/bajar altura se aplican en la próxima Medición.",
  "settings.global.hotkeyActivate": "Activar Medición",
  "settings.global.hotkeyRaise": "Subir altura",
  "settings.global.hotkeyLower": "Bajar altura",
  "settings.global.hotkeyRecording": "Presioná una tecla…",
  "settings.global.enableLecturas": "Lecturas",
  "settings.global.enableLecturasToggle": "Mostrar Lecturas en cada token medido",
  "settings.global.enableLecturasTooltip":
    "Si lo apagás, la herramienta de Medición sigue funcionando igual (los anillos y el degradado alrededor del Origen se siguen viendo), pero deja de mostrar una Lectura (ícono/anillo/círculo + etiqueta) en cada token medido — queda el comportamiento básico de Ranges, sin lecturas por token. Se aplica en la próxima Medición, sin recargar la sala.",
  "settings.global.enableAltitude": "Altura",
  "settings.global.enableAltitudeToggle": "Habilitar la función de altura",
  "settings.global.enableAltitudeTooltip":
    "Si lo apagás, desaparece toda la función de altura — hotkeys, etiqueta de altura durante la Medición, menú contextual, y se borran los marcadores de altura ya colocados. Queda el comportamiento básico de Bandas, sin altura. El menú contextual requiere recargar la sala; el resto se aplica en la próxima Medición.",
  "settings.global.altitudeMenu": "Menú de Altura",
  "settings.global.altitudeMenuToggle": "Mostrar la opción \"Altura\" en el menú contextual",
  "settings.global.altitudeMenuTooltip":
    "Si lo apagás, la única forma de cambiar la altura de un token es con las hotkeys (Medición o, si están activas, las globales). Requiere recargar la sala.",

  "tokenHeight.selectToken": "Seleccioná un token.",
  "tokenHeight.up": "Arriba",
  "tokenHeight.down": "Abajo",

  "onMap.ground": "Suelo",
  "onMap.outOfRange": "Fuera de rango",

  "theme.storageUnavailable": "El almacenamiento no está disponible",
  "theme.storageUnavailableBody":
    "La extensión no puede cambiar el tema. Por favor habilitá las cookies de terceros.",

  "presets.melee": "Cuerpo a cuerpo",
  "presets.dagger.veryClose": "Muy cerca",
  "presets.dagger.close": "Cerca",
  "presets.dagger.far": "Lejos",
  "presets.dagger.veryFar": "Muy lejos",
  "presets.steel.shift": "Desplazamiento",
  "presets.steel.ranged": "A distancia",
} as const;

export default es;
export type TranslationKey = keyof typeof es;
