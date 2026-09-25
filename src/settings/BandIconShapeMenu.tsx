import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { IconShape } from "../engine/types";
import { ICON_SHAPES } from "../render/iconStack";
import { SHAPE_LABEL_KEYS, ShapePreview } from "./IconShapePicker";
import { useTranslation } from "../i18n/useTranslation";

/** Per-Banda icon shape override — a compact trigger since BandItem's row has no room for a full Select. */
export function BandIconShapeMenu({
  value,
  defaultShape,
  onChange,
  disabled,
}: {
  /** This Banda's own override, or undefined to use the BandSet's default. */
  value: IconShape | undefined;
  /** The BandSet's default shape, shown when this Banda has no override. */
  defaultShape: IconShape;
  onChange: (value: IconShape | undefined) => void;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const effectiveShape = value ?? defaultShape;
  const t = useTranslation();

  return (
    <>
      <Tooltip title={t("settings.bandIconShape.tooltip")}>
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            <ShapePreview shape={effectiveShape} />
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          selected={value === undefined}
          onClick={() => {
            onChange(undefined);
            setAnchor(null);
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ShapePreview shape={defaultShape} />
          </ListItemIcon>
          <ListItemText>{t("common.default")}</ListItemText>
        </MenuItem>
        {ICON_SHAPES.map((shape) => (
          <MenuItem
            key={shape}
            selected={value === shape}
            onClick={() => {
              onChange(shape);
              setAnchor(null);
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <ShapePreview shape={shape} />
            </ListItemIcon>
            <ListItemText>{t(SHAPE_LABEL_KEYS[shape])}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
