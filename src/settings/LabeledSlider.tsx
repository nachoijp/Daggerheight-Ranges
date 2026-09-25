import { useEffect, useState } from "react";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import { FieldLabel } from "./FieldLabel";

export function LabeledSlider({
  id,
  label,
  tooltip,
  value,
  onChange,
  disabled,
  min,
  max,
  step,
  marks,
  valueLabelFormat,
}: {
  id: string;
  label: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min: number;
  max: number;
  step: number;
  marks?: { value: number; label: string }[];
  valueLabelFormat?: (value: number) => string;
}) {
  // Dragging fires MUI's onChange continuously (every pixel of movement) —
  // wiring that straight to the onChange prop meant every tick of a drag
  // called OBR.scene.setMetadata, a real network round trip, dozens of
  // times per second. Buffer locally for a smooth-looking drag (matches
  // NumberField's own local-value-until-commit pattern elsewhere in this
  // tab) and only call the prop once, on release/keyup, via
  // onChangeCommitted.
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Stack sx={{ px: 1 }}>
      <FieldLabel id={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <Slider
        aria-labelledby={id}
        value={localValue}
        onChange={(_, value) => {
          if (typeof value === "number") {
            setLocalValue(value);
          }
        }}
        onChangeCommitted={(_, value) => {
          if (typeof value === "number") {
            onChange(value);
          }
        }}
        step={step}
        min={min}
        max={max}
        marks={marks}
        valueLabelDisplay="auto"
        valueLabelFormat={valueLabelFormat}
        size="small"
        disabled={disabled}
        sx={{
          // Mark labels are centered on their point by default, so the
          // first ("0%") and last ("100%") ones hang half their width past
          // the track's own edges — with nothing after them to clip against,
          // that pushed the whole popover wider and forced a horizontal
          // scrollbar. Edge-align just those two instead of centering them.
          "& .MuiSlider-markLabel[data-index='0']": {
            transform: "translateX(0%)",
          },
          ...(marks && {
            [`& .MuiSlider-markLabel[data-index='${marks.length - 1}']`]: {
              transform: "translateX(-100%)",
            },
          }),
        }}
      />
    </Stack>
  );
}
