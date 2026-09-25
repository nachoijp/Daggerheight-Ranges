import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { Visualization } from "../engine/types";
import { FieldLabel } from "./FieldLabel";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translate";

const VISUALIZATION_LABEL_KEYS: Record<Visualization, TranslationKey> = {
  icon: "settings.visualization.icon",
  ring: "settings.visualization.ring",
  circle: "settings.visualization.circle",
};

export function VisualizationButtonGroup({
  value,
  onChange,
  disabled,
}: {
  value: Visualization;
  onChange: (value: Visualization) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  return (
    <div>
      <FieldLabel id="visualization-label" tooltip={t("settings.medicion.visualizationTooltip")}>
        {t("settings.medicion.visualization")}
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
        aria-labelledby="visualization-label"
        size="small"
        fullWidth
        sx={{ my: 0.5 }}
      >
        {(Object.keys(VISUALIZATION_LABEL_KEYS) as Visualization[]).map((visualization) => (
          <ToggleButton key={visualization} value={visualization}>
            {t(VISUALIZATION_LABEL_KEYS[visualization])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
