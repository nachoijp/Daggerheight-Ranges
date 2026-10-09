import Box from "@mui/material/Box";
import { IconShape } from "../engine/types";
import { iconStackPreviewSvg } from "../render/iconStack";
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
  // The preview svg is sized to its stack (a 3-icon column is tall), so
  // it's fitted into a fixed square box: every preview stays the same size.
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
