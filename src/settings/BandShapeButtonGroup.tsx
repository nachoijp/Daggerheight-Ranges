import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { BandShape } from "../engine/types";
import Stack from "@mui/material/Stack";
import Circle from "@mui/icons-material/CircleRounded";
import Square from "@mui/icons-material/SquareRounded";
import { FieldLabel } from "./FieldLabel";
import { useTranslation } from "../i18n/useTranslation";

export function BandShapeButtonGroup({
  value,
  onChange,
}: {
  value: BandShape;
  onChange: (value: BandShape) => void;
}) {
  const t = useTranslation();
  return (
    <Stack>
      <FieldLabel id="band-shape-label" tooltip={t("settings.bandShape.tooltip")}>
        {t("common.shape")}
      </FieldLabel>
      <ToggleButtonGroup
        value={value}
        onChange={(_, value) => {
          if (value) {
            onChange(value);
          }
        }}
        exclusive
        aria-labelledby="band-shape-label"
        size="small"
        sx={{
          my: 0.5,
        }}
      >
        <ToggleButton value="circle" aria-label={t("settings.bandShape.circleAria")}>
          <Circle fontSize="small" />
        </ToggleButton>
        <ToggleButton value="square" aria-label={t("settings.bandShape.squareAria")}>
          <Square fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
