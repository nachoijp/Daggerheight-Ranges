import Stack from "@mui/material/Stack";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { BandSet } from "../engine/types";
import { LabeledSlider } from "./LabeledSlider";
import { FieldLabel } from "./FieldLabel";
import { useFittedMenu } from "../util/menuRoom";
import { AdvancedSection, ChoiceGroup, SECTION_GAP, SettingSwitch } from "./controls";
import { useTranslation } from "../i18n/useTranslation";
import {
  SIZE_RANGES,
  type DisplaySettings,
  type LecturaLabel,
  type LecturaStyle,
  type RingLabel,
} from "./display";

const percent = (value: number) => `${Math.round(value * 100)}%`;

const STYLE_LABEL_KEYS = {
  icon: "settings.visualization.icon",
  ring: "settings.visualization.ring",
  circle: "settings.visualization.circle",
} as const;

/** What appears on the map during a Medición. */
export function MapaTab({
  display,
  onChange,
  bandSet,
}: {
  display: DisplaySettings;
  onChange: (patch: Partial<DisplaySettings>) => void;
  bandSet: BandSet;
}) {
  const t = useTranslation();
  const style = display.lecturaStyle;
  // At the bottom of the tab: opens upward, scrolling if the Bandas don't fit above it.
  const filterMenu = useFittedMenu("up");
  return (
    <Stack gap={SECTION_GAP} sx={{ pt: 1 }}>
      <ChoiceGroup<LecturaStyle>
        id="lectura-style-label"
        label={t("settings.mapa.lectura")}
        tooltip={t("settings.mapa.lecturaTooltip")}
        value={style}
        onChange={(lecturaStyle) => onChange({ lecturaStyle })}
        options={[
          { value: "none", label: t("settings.mapa.none") },
          { value: "icon", label: t("settings.visualization.icon") },
          { value: "ring", label: t("settings.visualization.ring") },
          { value: "circle", label: t("settings.visualization.circle") },
        ]}
      />
      {style !== "none" && (
        <AdvancedSection title={t(STYLE_LABEL_KEYS[style])}>
          {style === "icon" && (
            <LabeledSlider
              id="lectura-icon-size-label"
              label={t("settings.mapa.iconSize")}
              tooltip={t("settings.mapa.iconSizeTooltip")}
              value={display.lecturaIcon.size}
              onChange={(size) => onChange({ lecturaIcon: { ...display.lecturaIcon, size } })}
              min={SIZE_RANGES.icon[0]}
              max={SIZE_RANGES.icon[1]}
              step={0.1}
              valueLabelFormat={(value) => `${value.toFixed(1)}x`}
            />
          )}
          {style === "ring" && (
            <LabeledSlider
              id="lectura-ring-size-label"
              label={t("settings.mapa.ringWidth")}
              tooltip={t("settings.mapa.ringWidthTooltip")}
              value={Math.round(display.lecturaRing.size * 100)}
              onChange={(value) => onChange({ lecturaRing: { ...display.lecturaRing, size: value / 100 } })}
              min={SIZE_RANGES.ring[0] * 100}
              max={SIZE_RANGES.ring[1] * 100}
              step={1}
              valueLabelFormat={(value) => `${value}%`}
            />
          )}
          {style === "circle" && (
            <LabeledSlider
              id="lectura-circle-size-label"
              label={t("settings.mapa.circleSize")}
              tooltip={t("settings.mapa.circleSizeTooltip")}
              value={Math.round(display.lecturaCircle.size * 100)}
              onChange={(value) => onChange({ lecturaCircle: { ...display.lecturaCircle, size: value / 100 } })}
              min={SIZE_RANGES.circle[0] * 100}
              max={SIZE_RANGES.circle[1] * 100}
              step={5}
              valueLabelFormat={(value) => `${value}%`}
            />
          )}
          <LabeledSlider
            id="lectura-opacity-label"
            label={t("settings.opacity")}
            tooltip={t("settings.mapa.opacityTooltip")}
            value={Math.round(
              (style === "icon"
                ? display.lecturaIcon
                : style === "ring"
                  ? display.lecturaRing
                  : display.lecturaCircle
              ).opacity * 100
            )}
            onChange={(value) => {
              const opacity = value / 100;
              if (style === "icon") {
                onChange({ lecturaIcon: { ...display.lecturaIcon, opacity } });
              } else if (style === "ring") {
                onChange({ lecturaRing: { ...display.lecturaRing, opacity } });
              } else {
                onChange({ lecturaCircle: { ...display.lecturaCircle, opacity } });
              }
            }}
            min={5}
            max={100}
            step={5}
            valueLabelFormat={(value) => percent(value / 100)}
          />
        </AdvancedSection>
      )}
      <ChoiceGroup<LecturaLabel>
        id="lectura-label-label"
        label={t("settings.mapa.lecturaLabel")}
        tooltip={t("settings.mapa.lecturaLabelTooltip")}
        value={display.lecturaLabel}
        onChange={(lecturaLabel) => onChange({ lecturaLabel })}
        options={[
          { value: "none", label: t("settings.mapa.none") },
          { value: "band", label: t("settings.mapa.labelBand") },
          { value: "distance", label: t("settings.mapa.labelDistance") },
          { value: "both", label: t("settings.mapa.labelBoth") },
        ]}
      />
      <ChoiceGroup<RingLabel>
        id="ring-label-label"
        label={t("settings.mapa.ringLabel")}
        tooltip={t("settings.mapa.ringLabelTooltip")}
        value={display.ringLabel}
        onChange={(ringLabel) => onChange({ ringLabel })}
        options={[
          { value: "none", label: t("settings.mapa.none") },
          { value: "name", label: t("settings.mapa.labelName") },
          { value: "distance", label: t("settings.mapa.labelDistance") },
          { value: "both", label: t("settings.mapa.labelBothRing") },
        ]}
      />
      <Stack>
        <Stack sx={{ px: 1 }}>
          <FieldLabel id="filter-label" tooltip={t("settings.medicion.filterTooltip")}>
            {t("settings.medicion.filter")}
          </FieldLabel>
        </Stack>
        <SettingSwitch
          label={t("settings.medicion.filterToggle")}
          checked={display.filterEnabled}
          onChange={(filterEnabled) => onChange({ filterEnabled })}
        />
        {display.filterEnabled && (
          <Select
            aria-label={t("settings.medicion.filterPlaceholder")}
            value={
              bandSet.bands.some((band) => band.id === display.filterBandId) ? display.filterBandId : ""
            }
            onChange={(e) => onChange({ filterBandId: e.target.value || undefined })}
            {...filterMenu.selectProps}
            size="small"
            displayEmpty
            sx={{ width: "60%", ml: 7 }}
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
    </Stack>
  );
}
