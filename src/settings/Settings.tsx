import { useEffect, useMemo, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";

import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import {
  getDefaultBandSets,
  resolveBandSet,
  setCustomBandSets as storeCustomBandSets,
} from "../bandSets/bandSets";
import { BandSet } from "../engine/types";
import { BandSetEditor } from "./BandSetEditor";
import { BandSetSelector } from "./BandSetSelector";
import { MedicionTab } from "./MedicionTab";
import { GlobalTab } from "./GlobalTab";
import { getPluginId } from "../util/getPluginId";
import { useOBRContext } from "./OBRContext";
import { useTranslation } from "../i18n/useTranslation";
import { deepEqual } from "../util/deepEqual";

export function Settings() {
  const {
    bandSet: initialBandSet,
    customBandSets: initialCustomBandSets,
    language,
  } = useOBRContext();
  const t = useTranslation();
  const [selectedBandSet, setSelectedBandSet] =
    useState<BandSet>(initialBandSet);
  const [editing, setEditing] = useState(false);
  const [customBandSets, setCustomBandSets] = useState<BandSet[]>(
    initialCustomBandSets
  );
  const [tab, setTab] = useState(0);
  const defaultBandSets = useMemo(() => getDefaultBandSets(language), [language]);

  useEffect(() => {
    storeCustomBandSets(customBandSets);
  }, [customBandSets]);

  // selectedBandSet is this component's own local copy (seeded once from
  // context) — it doesn't pick up OBRContext's already-relocalized bandSet
  // on a language change by itself, so a default preset's Bandas names are
  // re-resolved here too whenever the language actually changes.
  useEffect(() => {
    setSelectedBandSet((current) => resolveBandSet(current, language));
  }, [language]);

  function onSelectBandSet(bandSet: BandSet, edit: boolean = false) {
    setSelectedBandSet(bandSet);
    OBR.scene.setMetadata({ [getPluginId("bandSet")]: bandSet });
    if (edit) {
      setEditing(true);
    }
  }

  function onDeleteBandSet(bandSet: BandSet) {
    setCustomBandSets(customBandSets.filter((b) => b.id !== bandSet.id));
    if (bandSet.id === selectedBandSet.id) {
      onSelectBandSet(defaultBandSets[0]);
    }
    setEditing(false);
  }

  function onAddBandSet(bandSet: BandSet) {
    setCustomBandSets([...customBandSets, bandSet]);
    onSelectBandSet(bandSet, true);
  }

  function onChangeBandSet(bandSet: BandSet) {
    setCustomBandSets(
      customBandSets.map((b) => (b.id === bandSet.id ? bandSet : b))
    );
    if (bandSet.id === selectedBandSet.id) {
      setSelectedBandSet(bandSet);
      OBR.scene.setMetadata({ [getPluginId("bandSet")]: bandSet });
    }
  }

  const unavailableBandSet = useMemo(() => {
    const bandSets = [...customBandSets, ...defaultBandSets];
    return !bandSets.find((b) => b.id === selectedBandSet.id);
  }, [customBandSets, selectedBandSet, defaultBandSets]);

  const outdatedBandSet = useMemo(() => {
    const customBandSet = customBandSets.find(
      (b) => b.id === selectedBandSet.id
    );
    if (!customBandSet) {
      return false;
    }
    return !deepEqual(customBandSet, selectedBandSet);
  }, [customBandSets, selectedBandSet]);

  // Editing a preset's Medición options silently does nothing long-term —
  // resolveBandSet() always re-resolves a stored default-preset id back to
  // its canonical, un-edited definition (that's what keeps presets
  // correctly re-localized on a language change), so any edit here would
  // just get discarded the next time the BandSet is read. Disable the tab
  // instead of letting the user edit something that won't stick.
  const isPreset = defaultBandSets.some((b) => b.id === selectedBandSet.id);

  return (
    <Stack sx={{ height: "460px", p: 1, pb: 0, gap: 1 }}>
      <BandSetSelector
        selectedBandSet={selectedBandSet}
        onSelect={onSelectBandSet}
        customBandSets={customBandSets}
        defaultBandSets={defaultBandSets}
        onAdd={onAddBandSet}
        onEdit={() => {
          setEditing((prev) => !prev);
        }}
        isEditing={editing}
        isCustom={
          !outdatedBandSet &&
          customBandSets.some((b) => b.id === selectedBandSet.id)
        }
        outdatedBandSet={outdatedBandSet}
        showEditButton={tab === 0}
      />
      {unavailableBandSet && (
        <Alert severity="warning">
          {t("settings.bandSet.notFound", { name: selectedBandSet.name })}
        </Alert>
      )}
      {outdatedBandSet && (
        <Alert severity="warning">
          {t("settings.bandSet.outOfSync", { name: selectedBandSet.name })}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="fullWidth"
      >
        <Tab label={t("settings.tab.bandas")} />
        <Tab label={t("settings.tab.medicion")} />
        <Tab label={t("settings.tab.global")} />
      </Tabs>
      <Stack sx={{ overflowY: "auto", flexGrow: 1 }}>
        {tab === 0 && (
          <BandSetEditor
            bandSet={selectedBandSet}
            onChange={editing ? onChangeBandSet : undefined}
            onDelete={editing ? onDeleteBandSet : undefined}
          />
        )}
        {tab === 1 && (
          <MedicionTab
            bandSet={selectedBandSet}
            onChange={onChangeBandSet}
            disabled={isPreset}
          />
        )}
        {tab === 2 && <GlobalTab />}
      </Stack>
    </Stack>
  );
}
