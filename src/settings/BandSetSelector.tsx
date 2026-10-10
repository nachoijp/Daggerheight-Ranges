import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import AddRounded from "@mui/icons-material/AddRounded";

import { BandSet } from "../engine/types";
import IconButton from "@mui/material/IconButton";
import CheckRounded from "@mui/icons-material/CheckRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import { useTranslation } from "../i18n/useTranslation";
import { useFittedMenu } from "../util/menuRoom";

export function BandSetSelector({
  selectedBandSet,
  customBandSets,
  defaultBandSets,
  onSelect,
  onAdd,
  onEdit,
  isEditing,
  isCustom,
  outdatedBandSet,
  showEditButton,
}: {
  selectedBandSet: BandSet;
  customBandSets: BandSet[];
  defaultBandSets: BandSet[];
  onSelect: (bandSet: BandSet) => void;
  onAdd: (bandSet: BandSet) => void;
  onEdit: () => void;
  isEditing: boolean;
  isCustom: boolean;
  outdatedBandSet: boolean;
  /** The edit button only does something on the Bandas tab, so it's only shown there. */
  showEditButton: boolean;
}) {
  const t = useTranslation();
  const bandSets = [...defaultBandSets, ...customBandSets];
  // Opens downward, scrolling if the sets don't fit below it.
  const menu = useFittedMenu("down");

  function onAddBandSet() {
    const newBandSet = {
      ...selectedBandSet,
      id: crypto.randomUUID(),
      name: t("settings.bandSet.newName", { n: customBandSets.length + 1 }),
      bands: selectedBandSet.bands.map((band) => ({
        ...band,
        id: crypto.randomUUID(),
      })),
    };
    onAdd(newBandSet);
  }

  return (
    <Stack
      direction="row"
      gap={1}
      alignItems="center"
      sx={{ position: "relative" }}
    >
      <Select
        value={outdatedBandSet ? undefined : selectedBandSet.id}
        onChange={(event) => {
          const bandSet = bandSets.find(
            (bandSet) => bandSet.id === event.target.value
          );
          if (bandSet) {
            onSelect(bandSet);
          }
        }}
        renderValue={(value) =>
          bandSets.find((bandSet) => bandSet.id === value)?.name
        }
        {...menu.selectProps}
        MenuProps={{ ...menu.selectProps.MenuProps, elevation: 20 }}
        size="small"
        fullWidth
      >
        {defaultBandSets.map((bandSet) => (
          <MenuItem
            key={bandSet.id}
            value={bandSet.id}
            sx={{ minHeight: "auto" }}
          >
            {bandSet.name}
          </MenuItem>
        ))}
        {customBandSets.length > 0 && <Divider />}
        {customBandSets.map((bandSet) => (
          <MenuItem
            key={bandSet.id}
            value={bandSet.id}
            sx={{ minHeight: "auto" }}
          >
            {bandSet.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={onAddBandSet}
          sx={{ justifyContent: "space-between", minHeight: "auto" }}
        >
          {t("settings.bandSet.new")}
          <AddRounded />
        </MenuItem>
      </Select>
      {isCustom && !outdatedBandSet && showEditButton && (
        <IconButton onClick={onEdit} size="small">
          {isEditing ? <CheckRounded /> : <EditRounded />}
        </IconButton>
      )}
    </Stack>
  );
}
