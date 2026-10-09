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
  // MUI fires onChange on every pixel of a drag; each call of the prop is
  // a scene write. The value is kept here while dragging and only passed
  // on once, when the slider is let go (onChangeCommitted).
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
          // The first and last mark labels are aligned to the track's
          // edges instead of centered, so they don't stick out past it.
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
