import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import type { Image } from "@owlbear-rodeo/sdk";

import { useOBRContext } from "../settings/OBRContext";
import { iconStackPreviewSvg, Direction } from "../render/iconStack";
import { getStoredTheme } from "../theme/themes";
import { getColorString } from "../util/color";
import {
  clearTokenHeightMarker,
  getAllTokenHeightMarkers,
  getTokenHeightState,
  setTokenHeightMarker,
} from "./markers";
import { watchTheme } from "./theme";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translate";

import "./tokenHeight.css";

// This table is plain browser-rendered HTML (unlike the on-map Lectura
// label, which goes through Owlbear's own limited map-text font and can't
// show ↑/↓), so the arrow glyphs are safe to use here.
const DIRECTIONS: { id: Direction; arrow: string }[] = [
  { id: "up", arrow: "↑" },
  { id: "down", arrow: "↓" },
];

const DIRECTION_LABEL_KEYS: Record<Direction, TranslationKey> = {
  up: "tokenHeight.up",
  down: "tokenHeight.down",
};

// A minimum width for the table's equal columns, so it only scrolls
// sideways when there really isn't room.
const ICON_MIN_COLUMN_WIDTH = 44;
const DIRECTION_COL_WIDTH = 20;
const TABLE_BORDER_SPACING = 3;

export function TokenHeightPicker() {
  const { bandSet, display } = useOBRContext();
  const t = useTranslation();
  const [selection, setSelection] = useState<string[]>([]);
  const [current, setCurrent] = useState<{ bandId: string; direction: Direction } | undefined>();

  // Safe here (unlike at module load): this component only mounts once
  // OBRContextProvider above it has already made successful OBR calls of
  // its own, so the SDK's ready handshake is guaranteed to be done.
  useEffect(() => {
    watchTheme();
  }, []);

  useEffect(() => {
    OBR.player.getSelection().then((selection) => setSelection(selection ?? []));
    return OBR.player.onChange((player) => setSelection(player.selection ?? []));
  }, []);

  useEffect(() => {
    if (selection.length === 0) {
      setCurrent(undefined);
      return;
    }
    getAllTokenHeightMarkers().then((markers) => {
      const states = selection.map((id) => {
        const marker = markers.find((m) => m.attachedTo === id);
        return marker ? getTokenHeightState(marker) : undefined;
      });
      const [first] = states;
      const allSame =
        first && states.every((s) => s?.bandId === first.bandId && s?.direction === first.direction);
      setCurrent(allSame ? first : undefined);
    });
  }, [selection]);

  // No separate "remove marker" control — clicking the already-active
  // cell again clears it, same toggle convention as the rest of this
  // extension's own controls.
  async function onPick(bandId: string, direction: Direction) {
    if (selection.length === 0) {
      return;
    }
    if (current?.bandId === bandId && current?.direction === direction) {
      await clearTokenHeightMarker(selection);
      setCurrent(undefined);
      return;
    }
    const tokens = await OBR.scene.items.getItems<Image>(selection);
    await setTokenHeightMarker(tokens, bandId, direction);
    setCurrent({ bandId, direction });
  }

  if (selection.length === 0) {
    return (
      <div style={{ fontSize: 13, opacity: 0.7 }}>{t("tokenHeight.selectToken")}</div>
    );
  }

  const theme = getStoredTheme();

  // The closest Banda (e.g. Melee) means "right next to it", which makes no
  // sense as a height, so it's left out. Each Banda keeps its index in
  // bandSet.bands, as markers.ts uses it, so the preview matches the marker.
  const closestBand = bandSet.bands.reduce(
    (min, band) => (band.radius < min.radius ? band : min),
    bandSet.bands[0]
  );
  const markableBands = bandSet.bands
    .map((band, index) => ({ band, index }))
    .filter(({ band }) => band.id !== closestBand?.id);

  const minTableWidth =
    markableBands.length * ICON_MIN_COLUMN_WIDTH +
    DIRECTION_COL_WIDTH +
    (markableBands.length + 2) * TABLE_BORDER_SPACING;

  return (
    <div className="picker-scroll">
      <table className="altitude-table" style={{ minWidth: minTableWidth }}>
        <colgroup>
          <col className="direction-col" />
          {markableBands.map(({ band }) => (
            <col key={band.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th></th>
            {markableBands.map(({ band }) => (
              <th key={band.id}>{band.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIRECTIONS.map((direction) => (
            <tr key={direction.id}>
              <th className="direction-header" title={t(DIRECTION_LABEL_KEYS[direction.id])}>
                {direction.arrow}
              </th>
              {markableBands.map(({ band, index }) => {
                const active =
                  current?.bandId === band.id && current?.direction === direction.id;
                const shape = band.iconShape ?? display.iconShape;
                const color = getColorString(theme.colors[index % theme.colors.length]);
                const svg = iconStackPreviewSvg(shape, index + 1, color, direction.id);
                return (
                  <td key={band.id}>
                    <button
                      className={active ? "rank-button active" : "rank-button"}
                      title={`${band.name} · ${t(DIRECTION_LABEL_KEYS[direction.id])}`}
                      onClick={() => onPick(band.id, direction.id)}
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
