import { useRef } from "react";
import OBR from "@owlbear-rodeo/sdk";
import Box from "@mui/material/Box";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import {
  clampPanelPosition,
  DEFAULT_PANEL_POSITION,
  moveDistancesPanel,
  savePanelPosition,
  type PanelPosition,
} from "./panelPopover";
import { useTranslation } from "../i18n/useTranslation";

type Drag = {
  pointerX: number;
  pointerY: number;
  from: PanelPosition;
  to: PanelPosition;
  screen: { width: number; height: number } | null;
  /** A move is on its way to Owlbear: the next one waits for it. */
  busy: boolean;
  moved: boolean;
};

/**
 * Drags the panel around the screen. The page keeps getting the pointer
 * while it's held, even once it leaves the panel (pointer capture), and
 * each move reopens the panel a little further along (see
 * moveDistancesPanel). Screen coordinates, so the panel moving under the
 * pointer doesn't throw them off. A double click sends it back to its
 * default corner.
 */
export function DragHandle({
  position,
  size,
  onMoved,
}: {
  position: PanelPosition;
  /** The panel's current popover size. */
  size: () => { width: number; height: number };
  onMoved: (position: PanelPosition) => void;
}) {
  const t = useTranslation();
  const drag = useRef<Drag | null>(null);

  function target(event: React.PointerEvent, current: Drag): PanelPosition {
    const to = {
      left: current.from.left + event.screenX - current.pointerX,
      top: current.from.top + event.screenY - current.pointerY,
    };
    return current.screen ? clampPanelPosition(to, size(), current.screen) : to;
  }

  return (
    // The browser's own tooltip (see the panel's other header buttons).
      <Box
        role="button"
        aria-label={t("distances.drag")}
        title={t("distances.drag")}
        sx={{
          display: "flex",
          alignItems: "center",
          color: "text.secondary",
          cursor: "grab",
          touchAction: "none",
          "&:active": { cursor: "grabbing" },
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const current: Drag = {
            pointerX: event.screenX,
            pointerY: event.screenY,
            from: position,
            to: position,
            screen: null,
            busy: false,
            moved: false,
          };
          drag.current = current;
          // Asked once per drag; until it answers, the panel isn't kept on screen.
          Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()])
            .then(([width, height]) => {
              current.screen = { width, height };
            })
            .catch(() => {});
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.busy) {
            return;
          }
          const to = target(event, current);
          if (to.left === current.to.left && to.top === current.to.top) {
            return;
          }
          current.to = to;
          current.moved = true;
          current.busy = true;
          const { width, height } = size();
          moveDistancesPanel(to, width, height).finally(() => {
            current.busy = false;
          });
        }}
        onPointerUp={(event) => {
          const current = drag.current;
          drag.current = null;
          if (!current?.moved) {
            return;
          }
          // Where the pointer let go, even if the last move was skipped.
          const to = target(event, current);
          const { width, height } = size();
          moveDistancesPanel(to, width, height);
          savePanelPosition(to);
          onMoved(to);
        }}
        onDoubleClick={() => {
          const { width, height } = size();
          moveDistancesPanel(DEFAULT_PANEL_POSITION, width, height);
          savePanelPosition(null);
          onMoved(DEFAULT_PANEL_POSITION);
        }}
      >
        <DragIndicatorRounded fontSize="small" />
      </Box>
  );
}
