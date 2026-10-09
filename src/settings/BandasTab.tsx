import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { BandSet, IconShape } from "../engine/types";
import { DEFAULT_TOLERANCE } from "../engine/distance";
import { BandSetEditor } from "./BandSetEditor";
import { MetricButtonGroup } from "./MetricButtonGroup";
import { LabeledSlider } from "./LabeledSlider";
import { SECTION_GAP } from "./controls";
import { useTranslation } from "../i18n/useTranslation";

const PERCENT_MARKS = [
  { value: 0, label: "0%" },
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
];

/** Which distances exist and how they're measured — the BandSet itself. */
export function BandasTab({
  bandSet,
  defaultIconShape,
  isPreset,
  editing,
  onChange,
  onDelete,
  onDuplicate,
}: {
  bandSet: BandSet;
  defaultIconShape: IconShape;
  /** Built-in presets are re-read from their definition every time, so edits to one would never stick. */
  isPreset: boolean;
  /** A custom set's Bandas list is only editable after its edit button is pressed. */
  editing: boolean;
  onChange: (bandSet: BandSet) => void;
  onDelete: (bandSet: BandSet) => void;
  onDuplicate: () => void;
}) {
  const t = useTranslation();
  return (
    <Stack gap={SECTION_GAP} sx={{ pt: 1 }}>
      {isPreset && (
        <Alert
          severity="info"
          icon={false}
          action={
            <Button color="inherit" size="small" onClick={onDuplicate}>
              {t("settings.bandas.duplicate")}
            </Button>
          }
        >
          {t("settings.bandas.presetNotice", { name: bandSet.name })}
        </Alert>
      )}
      <BandSetEditor
        bandSet={bandSet}
        defaultIconShape={defaultIconShape}
        onChange={editing ? onChange : undefined}
        onDelete={editing ? onDelete : undefined}
      />
      <MetricButtonGroup
        value={bandSet.metric}
        onChange={(metric) => onChange({ ...bandSet, metric })}
        disabled={isPreset}
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
        disabled={isPreset}
      />
    </Stack>
  );
}
