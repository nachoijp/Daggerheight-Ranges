import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ArrowUpward from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownward from "@mui/icons-material/ArrowDownwardRounded";
import ArrowBack from "@mui/icons-material/ArrowBackRounded";
import ArrowForward from "@mui/icons-material/ArrowForwardRounded";
import { IconPosition } from "../engine/types";
import { FieldLabel } from "./FieldLabel";
import Stack from "@mui/material/Stack";
import { useTranslation } from "../i18n/useTranslation";

export function IconPositionButtonGroup({
  value,
  onChange,
  disabled,
}: {
  value: IconPosition;
  onChange: (value: IconPosition) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  return (
    <Stack>
      <FieldLabel id="icon-position-label" tooltip={t("settings.iconPosition.tooltip")}>
        {t("settings.iconPosition.label")}
      </FieldLabel>
      <ToggleButtonGroup
        value={value}
        onChange={(_, value) => {
          if (value) {
            onChange(value);
          }
        }}
        exclusive
        disabled={disabled}
        aria-labelledby="icon-position-label"
        size="small"
        fullWidth
        sx={{ my: 0.5 }}
      >
        <ToggleButton value="left" aria-label={t("settings.iconPosition.left")}>
          <ArrowBack fontSize="small" />
        </ToggleButton>
        <ToggleButton value="top" aria-label={t("settings.iconPosition.top")}>
          <ArrowUpward fontSize="small" />
        </ToggleButton>
        <ToggleButton value="bottom" aria-label={t("settings.iconPosition.bottom")}>
          <ArrowDownward fontSize="small" />
        </ToggleButton>
        <ToggleButton value="right" aria-label={t("settings.iconPosition.right")}>
          <ArrowForward fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
