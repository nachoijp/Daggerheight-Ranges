import { useState } from "react";

import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";

import DeleteRounded from "@mui/icons-material/DeleteRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import Tooltip from "@mui/material/Tooltip";

import { FieldLabel } from "./FieldLabel";
import { BandItem } from "./BandItem";
import { BandShapeButtonGroup } from "./BandShapeButtonGroup";
import { getStoredTheme } from "../theme/themes";
import { BandSet } from "../engine/types";
import { useTranslation } from "../i18n/useTranslation";

export function BandSetEditor({
  bandSet,
  onChange,
  onDelete,
}: {
  bandSet: BandSet;
  onChange?: (bandSet: BandSet) => void;
  onDelete?: (bandSet: BandSet) => void;
}) {
  const [theme] = useState(() => getStoredTheme());
  const t = useTranslation();

  function addBand() {
    const maxRadius = Math.max(...bandSet.bands.map((b) => b.radius));
    onChange?.({
      ...bandSet,
      bands: [
        ...bandSet.bands,
        {
          name: t("settings.band.newName", { n: bandSet.bands.length + 1 }),
          radius: maxRadius + 1,
          id: crypto.randomUUID(),
        },
      ],
    });
  }

  const maxRadius = Math.max(...bandSet.bands.map((b) => b.radius));
  // Fudge the numbers a bit so the graph looks better.
  // We add 1 so the min radius is 2 as log(1) is 0 and we want to start at 1
  const logMaxRadius = Math.log(maxRadius + 1);

  return (
    <Stack gap={1} sx={{ overflowY: "auto", pb: 1 }}>
      <Box sx={{ flexGrow: 1 }}>
        <List disablePadding>
          {bandSet.bands.map((band, i, bands) => {
            const color = theme.colors[i % theme.colors.length];
            const logRadius = Math.log(band.radius + 1);
            const logComplete = logRadius / logMaxRadius;
            return (
              <BandItem
                key={band.id}
                band={band}
                color={color}
                complete={logComplete}
                iconRadius={i + 1}
                bandIndex={i}
                onChange={
                  onChange
                    ? (band) => {
                        const newBands = [...bands];
                        newBands[i] = band;
                        onChange?.({ ...bandSet, bands: newBands });
                      }
                    : undefined
                }
                onDelete={
                  onChange
                    ? () => {
                        const newBands = [...bands];
                        newBands.splice(i, 1);
                        onChange?.({ ...bandSet, bands: newBands });
                      }
                    : undefined
                }
                hideLabel={bandSet.hideLabel}
                hideSize={bandSet.hideSize}
                bandShape={bandSet.shape}
                defaultIconShape={bandSet.iconShape ?? "circle"}
              />
            );
          })}
        </List>
      </Box>
      {onChange && (
        <Button
          variant="outlined"
          fullWidth
          size="small"
          onClick={addBand}
          disabled={bandSet.bands.length >= 10}
          startIcon={<AddRounded />}
        >
          {t("settings.bandSetEditor.addBanda")}
        </Button>
      )}
      {onChange && onDelete && (
        <Controls bandSet={bandSet} onChange={onChange} onDelete={onDelete} />
      )}
    </Stack>
  );
}

function Controls({
  bandSet,
  onChange,
  onDelete,
}: {
  bandSet: BandSet;
  onChange: (bandSet: BandSet) => void;
  onDelete: (bandSet: BandSet) => void;
}) {
  const [localName, setLocalName] = useState(bandSet.name);
  const t = useTranslation();
  return (
    <>
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" gap={1} alignItems="center">
        <TextField
          label={t("common.name")}
          aria-labelledby="name-label"
          value={localName}
          onChange={(e) =>
            e.target.value.length < 50 && setLocalName(e.target.value)
          }
          onBlur={() => onChange({ ...bandSet, name: localName })}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <Tooltip title={t("common.delete")}>
          <IconButton onClick={() => onDelete(bandSet)} color="error">
            <DeleteRounded />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack
        direction="row"
        gap={1.5}
        rowGap={1}
        sx={{ mt: 0.5 }}
        width="100%"
        alignItems="start"
        justifyContent="space-around"
        flexWrap="wrap"
      >
        <FormControl sx={{ minWidth: 100, alignItems: "center" }}>
          <FieldLabel tooltip={t("settings.bandSetEditor.showNameTooltip")}>
            {t("settings.bandSetEditor.showName")}
          </FieldLabel>
          <Switch
            sx={{ overflow: "visible" }}
            checked={!bandSet.hideLabel}
            onChange={(_, checked) =>
              onChange({ ...bandSet, hideLabel: !checked })
            }
          />
        </FormControl>
        <FormControl sx={{ minWidth: 100, alignItems: "center" }}>
          <FieldLabel tooltip={t("settings.bandSetEditor.showDistanceTooltip")}>
            {t("settings.bandSetEditor.showDistance")}
          </FieldLabel>
          <Switch
            sx={{ overflow: "visible" }}
            checked={!bandSet.hideSize}
            onChange={(_, checked) =>
              onChange({ ...bandSet, hideSize: !checked })
            }
          />
        </FormControl>
        <BandShapeButtonGroup
          value={bandSet.shape}
          onChange={(shape) => {
            onChange({ ...bandSet, shape });
          }}
        />
      </Stack>
    </>
  );
}
