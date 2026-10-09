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
  "toolbar.distancias": "Distancias",

  "settings.tab.bandas": "Bandas",

  "settings.bandSet.new": "Nuevas Bandas",
  "settings.bandSet.newName": "Bandas {n}",
  "settings.bandSet.notFound": '"{name}" no encontrado. Elegí uno nuevo.',
  "settings.bandSet.outOfSync":
    '"{name}" desactualizado respecto a las Bandas guardadas. Elegí uno nuevo para actualizar.',

  "settings.band.radiusAriaLabel": "Radio",
  "settings.band.newName": "Banda {n}",

  "settings.bandSetEditor.addBanda": "Agregar Banda",

  "settings.bandShape.tooltip":
    "La forma con la que se dibujan los anillos de esta Banda en el mapa.",
  "settings.bandShape.circleAria": "Círculo",
  "settings.bandShape.squareAria": "Cuadrado",

  "settings.iconPosition.label": "Posición",
  "settings.iconPosition.tooltip": "De qué lado del token aparece el marcador de altura. La Lectura en modo ícono va del lado opuesto.",
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

  "settings.visualization.icon": "Ícono",
  "settings.visualization.ring": "Anillo",
  "settings.visualization.circle": "Círculo",

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
  "settings.global.hotkeyActivate": "Activar Medición",
  "settings.global.hotkeyRaise": "Subir altura",
  "settings.global.hotkeyLower": "Bajar altura",
  "settings.global.hotkeyRecording": "Presioná una tecla…",
  "settings.global.enableAltitude": "Altura",
  "settings.global.enableAltitudeToggle": "Habilitar la función de altura",
  "settings.global.enableAltitudeTooltip":
    "Si lo apagás, desaparece toda la función de altura — hotkeys, etiqueta de altura durante la Medición, menú contextual, y se borran los marcadores de altura ya colocados. Queda el comportamiento básico de Bandas, sin altura. El menú contextual cambia al instante; el resto se aplica en la próxima Medición.",
  "settings.global.altitudeMenuToggle": "Mostrar la opción \"Altura\" en el menú contextual",
  "settings.global.markerStyle": "Estilo del marcador",
  "settings.global.markerStyleTooltip":
    "Cómo se ve la altura de cada token, para todos: con los íconos apilados, con una etiqueta con la altura exacta (por ejemplo \"⬆️ 30ft\") o con ambos. Se aplica al instante, sin recargar la sala.",
  "settings.global.markerStyleIcons": "Íconos",
  "settings.global.markerStyleLabel": "Etiqueta",
  "settings.global.markerStyleBoth": "Ambos",
  "settings.global.distancePanel": "Panel de distancias",
  "settings.global.distancePanelTooltip":
    "Un botón en la barra de Medición que abre una lista con la distancia, la Banda y la diferencia de altura desde un token hacia todos los demás. Los jugadores nunca ven tokens ocultos.",
  "settings.global.distancePanelOff": "Apagado",
  "settings.global.distancePanelGm": "Solo GM",
  "settings.global.distancePanelEveryone": "Todos",

  "settings.tab.mapa": "Mapa",
  "settings.tab.altura": "Altura",
  "settings.tab.general": "General",
  "settings.advanced": "Avanzado",
  "settings.opacity": "Opacidad",
  "settings.bandas.presetNotice": "{name} es un set predefinido: sus Bandas, el modo de cálculo y la Tolerancia no se pueden editar.",
  "settings.bandas.duplicate": "Duplicar",
  "settings.bandas.copyName": "{name} (copia)",
  "settings.mapa.lectura": "Lectura en cada token",
  "settings.mapa.lecturaTooltip": "Cómo se marca cada token medido: un ícono apilado al lado, un anillo alrededor o un círculo semitransparente encima. Con «Ninguna» no se dibuja nada sobre el token (la etiqueta, si está activa, se sigue mostrando).",
  "settings.mapa.none": "Ninguna",
  "settings.mapa.iconSize": "Tamaño del ícono",
  "settings.mapa.iconSizeTooltip": "Escala de los íconos de la Lectura. Es independiente del tamaño de los marcadores de altura.",
  "settings.mapa.ringWidth": "Grosor del anillo",
  "settings.mapa.ringWidthTooltip": "Grosor del trazo del anillo alrededor del token.",
  "settings.mapa.circleSize": "Tamaño del círculo",
  "settings.mapa.circleSizeTooltip": "Diámetro del círculo respecto del tamaño del token.",
  "settings.mapa.opacityTooltip": "Qué tan opaca se dibuja la Lectura. Cada estilo recuerda la suya.",
  "settings.mapa.lecturaLabel": "Etiqueta de la Lectura",
  "settings.mapa.lecturaLabelTooltip": "El texto junto a cada token medido: el nombre de su Banda, su distancia exacta (redondeada a casilleros enteros, contando la altura y el tamaño de los tokens), o ambos.",
  "settings.mapa.ringLabel": "Etiqueta de los anillos",
  "settings.mapa.ringLabelTooltip": "El texto junto a cada anillo de Banda alrededor del Origen: su nombre, su distancia, o ambos.",
  "settings.mapa.labelBand": "Banda",
  "settings.mapa.labelName": "Nombre",
  "settings.mapa.labelDistance": "Distancia",
  "settings.mapa.labelBoth": "Ambas",
  "settings.mapa.labelBothRing": "Ambos",
  "settings.altura.iconShape": "Forma del ícono",
  "settings.altura.iconShapeTooltip": "La forma de los íconos apilados, compartida por los marcadores de altura y las Lecturas en modo ícono. Cada Banda puede tener la suya propia (Bandas → editar).",
  "settings.altura.marker": "marcador",
  "settings.altura.size": "Tamaño",
  "settings.altura.sizeTooltip": "Escala de los íconos del marcador de altura.",
  "settings.altura.opacityTooltip": "Qué tan opaco se dibuja el marcador de altura (o su etiqueta).",
  "settings.altura.distance": "Distancia al token",
  "settings.altura.distanceTooltip": "Qué tan lejos del token aparece el marcador de altura.",
  "settings.altura.hotkeys": "Atajos durante la Medición",
  "settings.altura.hotkeysTooltip": "Suben o bajan la altura del Origen mientras medís. Hacé clic en una tecla y presioná la nueva. Se aplican en la próxima Medición.",
  "settings.general.activateTooltip": "La tecla que activa la herramienta de Medición. Hacé clic y presioná la nueva.",

  "tokenHeight.selectToken": "Seleccioná un token.",
  "tokenHeight.up": "Arriba",
  "tokenHeight.down": "Abajo",

  "onMap.ground": "Suelo",
  "onMap.outOfRange": "Fuera de rango",

  "distances.disabled": "El GM desactivó el panel de distancias.",
  "distances.origin": "Medir desde",
  "distances.pickToken": "Elegí o seleccioná un token",
  "distances.noOtherTokens": "No hay otros tokens en la escena.",
  "distances.tableLabel": "Distancias desde {name}",
  "distances.token": "Token",
  "distances.band": "Banda",
  "distances.distance": "Distancia",
  "distances.horizontal": "Horiz.",
  "distances.horizontalTooltip":
    "Distancia sobre el suelo, sin contar la altura, medida según el modo de cálculo (cúbico cuenta las diagonales como rectas). Descuenta el tamaño extra de los tokens grandes.",
  "distances.vertical": "Vert.",
  "distances.verticalTooltip":
    "Diferencia de altura: ↑ si el token está más arriba que el origen, ↓ si está más abajo.",
  "distances.total": "Total",
  "distances.totalTooltip":
    "La distancia completa, combinando horizontal y vertical según el modo de cálculo. Es la que decide la Banda y la misma que muestra la Lectura.",
  "distances.sameHeight": "Misma altura",
  "distances.close": "Cerrar",
  "distances.above": "{distance} más arriba",
  "distances.below": "{distance} más abajo",

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
