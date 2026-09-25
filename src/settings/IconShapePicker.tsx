import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Box from "@mui/material/Box";
import { IconShape } from "../engine/types";
import { ICON_SHAPES, iconStackPreviewSvg } from "../render/iconStack";
import { FieldLabel } from "./FieldLabel";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translate";

export const SHAPE_LABEL_KEYS: Record<IconShape, TranslationKey> = {
  triangle: "settings.iconShape.triangle",
  triangleStepped: "settings.iconShape.triangleStepped",
  bar: "settings.iconShape.bar",
  circle: "settings.iconShape.circle",
  diamond: "settings.iconShape.diamond",
  square: "settings.iconShape.square",
  star: "settings.iconShape.star",
  wingDrill: "settings.iconShape.wingDrill",
};

export function ShapePreview({ shape }: { shape: IconShape }) {
  // iconStackPreviewSvg's own <svg> has real width/height attributes sized
  // to the stack's actual bounding box — for a 3-icon vertical stack that's
  // much taller than wide, so left at its natural size it made whichever
  // button hosted it (e.g. BandIconShapeMenu's trigger) balloon to match,
  // looking oversized next to the same row's other, normally-sized
  // controls. Forcing a fixed square box and letting the svg's own
  // viewBox-driven scaling (preserveAspectRatio defaults to "meet") shrink
  // to fit keeps every usage the same compact size regardless of shape.
  const svg = iconStackPreviewSvg(shape, 3, "currentColor");
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        color: "text.primary",
        "& svg": { width: "100%", height: "100%" },
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function IconShapePicker({
  value,
  onChange,
  disabled,
}: {
  value: IconShape;
  onChange: (value: IconShape) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  return (
    <Box>
      <FieldLabel id="icon-shape-label" tooltip={t("settings.iconShape.tooltip")}>
        {t("settings.iconShape.label")}
      </FieldLabel>
      <Select
        labelId="icon-shape-label"
        value={value}
        onChange={(e) => onChange(e.target.value as IconShape)}
        disabled={disabled}
        size="small"
        fullWidth
      >
        {ICON_SHAPES.map((shape) => (
          <MenuItem key={shape} value={shape}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <ShapePreview shape={shape} />
            </ListItemIcon>
            {t(SHAPE_LABEL_KEYS[shape])}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
