import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { BandSet } from "../engine/types";
import { DEFAULT_TOLERANCE } from "../engine/distance";
import { MetricButtonGroup } from "./MetricButtonGroup";
import { LabeledSlider } from "./LabeledSlider";
import { IconShapePicker } from "./IconShapePicker";
import { IconPositionButtonGroup } from "./IconPositionButtonGroup";
import { VisualizationButtonGroup } from "./VisualizationButtonGroup";
import { FieldLabel } from "./FieldLabel";
import { useTranslation } from "../i18n/useTranslation";

const PERCENT_MARKS = [
  { value: 0, label: "0%" },
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
];

export function MedicionTab({
  bandSet,
  onChange,
  disabled,
}: {
  bandSet: BandSet;
  onChange: (bandSet: BandSet) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  const visualization = bandSet.visualization ?? "icon";
  const filterEnabled = bandSet.filterEnabled ?? false;
  return (
    <Stack gap={2} sx={{ pt: 1 }}>
      <MetricButtonGroup
        value={bandSet.metric}
        onChange={(metric) => onChange({ ...bandSet, metric })}
        disabled={disabled}
      />
      <LabeledSlider
        id="tolerance-label"
        label={t("settings.medicion.tolerance")}
        tooltip={t("settings.medicion.toleranceTooltip")}
        value={bandSet.tolerance ?? DEFAULT_TOLERANCE}
        onChange={(tolerance) => onChange({ ...bandSet, tolerance })}
        min={0}
        max={100}
        step={1}
        marks={PERCENT_MARKS}
        valueLabelFormat={(value) => `${value}%`}
        disabled={disabled}
      />

      <Divider />
      <Stack sx={{ px: 1 }} gap={1}>
        <FieldLabel id="filter-label" tooltip={t("settings.medicion.filterTooltip")}>
          {t("settings.medicion.filter")}
        </FieldLabel>
        <FormControlLabel
          control={
            <Switch
              sx={{ overflow: "visible" }}
              checked={filterEnabled}
              onChange={(_, checked) => onChange({ ...bandSet, filterEnabled: checked })}
              disabled={disabled}
            />
          }
          label={t("settings.medicion.filterToggle")}
        />
        {filterEnabled && (
          <Select
            aria-label={t("settings.medicion.filterPlaceholder")}
            value={
              bandSet.bands.some((band) => band.id === bandSet.filterBandId)
                ? bandSet.filterBandId
                : ""
            }
            onChange={(e) =>
              onChange({ ...bandSet, filterBandId: e.target.value || undefined })
            }
            size="small"
            displayEmpty
            disabled={disabled}
            sx={{ width: "50%" }}
          >
            <MenuItem value="">
              <em>{t("settings.medicion.filterPlaceholder")}</em>
            </MenuItem>
            {bandSet.bands.map((band) => (
              <MenuItem key={band.id} value={band.id}>
                {band.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </Stack>

      <Divider />
      <Typography variant="overline" sx={{ lineHeight: 1 }}>
        {t("settings.medicion.visualization")}
      </Typography>

      <VisualizationButtonGroup
        value={visualization}
        onChange={(visualization) => onChange({ ...bandSet, visualization })}
        disabled={disabled}
      />
      <FormControlLabel
        sx={{ px: 1 }}
        control={
          <Switch
            sx={{ overflow: "visible" }}
            checked={bandSet.showLabel ?? false}
            onChange={(_, checked) => onChange({ ...bandSet, showLabel: checked })}
            disabled={disabled}
          />
        }
        label={t("settings.medicion.showLabel")}
      />

      {visualization === "icon" && (
        <>
          <IconShapePicker
            value={bandSet.iconShape ?? "circle"}
            onChange={(iconShape) => onChange({ ...bandSet, iconShape })}
            disabled={disabled}
          />
          <IconPositionButtonGroup
            value={bandSet.iconPosition ?? "top"}
            onChange={(iconPosition) => onChange({ ...bandSet, iconPosition })}
            disabled={disabled}
          />
          <LabeledSlider
            id="icon-size-label"
            label={t("settings.medicion.iconSize")}
            tooltip={t("settings.medicion.iconSizeTooltip")}
            value={bandSet.iconSize ?? 1}
            onChange={(iconSize) => onChange({ ...bandSet, iconSize })}
            min={0.5}
            max={2}
            step={0.1}
            valueLabelFormat={(value) => `${value.toFixed(1)}x`}
            disabled={disabled}
          />
          <LabeledSlider
            id="icon-distance-label"
            label={t("settings.medicion.iconDistance")}
            tooltip={t("settings.medicion.iconDistanceTooltip")}
            value={Math.round((bandSet.iconDistance ?? 0.15) * 100)}
            onChange={(percent) => onChange({ ...bandSet, iconDistance: percent / 100 })}
            min={0}
            max={40}
            step={1}
            valueLabelFormat={(value) => `${value}%`}
            disabled={disabled}
          />
        </>
      )}

      {visualization === "ring" && (
        <LabeledSlider
          id="ring-width-label"
          label={t("settings.medicion.ringWidth")}
          tooltip={t("settings.medicion.ringWidthTooltip")}
          value={Math.round((bandSet.ringWidth ?? 0.05) * 100)}
          onChange={(percent) => onChange({ ...bandSet, ringWidth: percent / 100 })}
          min={1}
          max={20}
          step={1}
          valueLabelFormat={(value) => `${value}%`}
          disabled={disabled}
        />
      )}

      {visualization === "circle" && (
        <LabeledSlider
          id="circle-opacity-label"
          label={t("settings.medicion.circleOpacity")}
          tooltip={t("settings.medicion.circleOpacityTooltip")}
          value={Math.round((bandSet.circleOpacity ?? 0.35) * 100)}
          onChange={(percent) => onChange({ ...bandSet, circleOpacity: percent / 100 })}
          min={0}
          max={100}
          step={5}
          valueLabelFormat={(value) => `${value}%`}
          disabled={disabled}
        />
      )}
    </Stack>
  );
}
