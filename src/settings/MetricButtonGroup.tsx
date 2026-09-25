import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DistanceMetric } from "../engine/types";
import { FieldLabel } from "./FieldLabel";
import { MetricDiagram } from "./MetricDiagram";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translate";

const METRIC_LABEL_KEYS: Record<DistanceMetric, TranslationKey> = {
  spherical: "settings.metric.spherical",
  cubic: "settings.metric.cubic",
  cylindrical: "settings.metric.cylindrical",
};

const METRIC_DESCRIPTION_KEYS: Record<DistanceMetric, TranslationKey> = {
  spherical: "settings.metric.sphericalDesc",
  cubic: "settings.metric.cubicDesc",
  cylindrical: "settings.metric.cylindricalDesc",
};

export function MetricButtonGroup({
  value,
  onChange,
  disabled,
}: {
  value: DistanceMetric;
  onChange: (value: DistanceMetric) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  return (
    <Stack>
      <FieldLabel id="metric-label" tooltip={t("settings.metric.tooltip")}>
        {t("settings.metric.label")}
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
        aria-labelledby="metric-label"
        size="small"
        fullWidth
        sx={{
          my: 0.5,
        }}
      >
        {(Object.keys(METRIC_LABEL_KEYS) as DistanceMetric[]).map((metric) => (
          <Tooltip
            key={metric}
            title={
              <Stack alignItems="center" gap={0.5} sx={{ p: 0.5 }}>
                <MetricDiagram metric={metric} />
                <Typography variant="caption" sx={{ textAlign: "center" }}>
                  {t(METRIC_DESCRIPTION_KEYS[metric])}
                </Typography>
              </Stack>
            }
          >
            <ToggleButton value={metric}>{t(METRIC_LABEL_KEYS[metric])}</ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
