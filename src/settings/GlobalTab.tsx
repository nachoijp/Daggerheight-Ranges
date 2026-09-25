import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { FieldLabel } from "./FieldLabel";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { useOBRContext } from "./OBRContext";
import { useTranslation } from "../i18n/useTranslation";
import type { Language } from "../i18n/language";
import {
  DEFAULT_GLOBAL_SETTINGS,
  getGlobalSettings,
  setGlobalSettings,
  type GlobalSettings,
} from "./globalSettings";
import { clearAllTokenHeightMarkers } from "../tokenHeight/markers";

export function GlobalTab() {
  const { language, onChangeLanguage } = useOBRContext();
  const t = useTranslation();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

  useEffect(() => {
    let mounted = true;
    getGlobalSettings().then((stored) => {
      if (mounted) {
        setSettings(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  function updateSettings(next: GlobalSettings) {
    setSettings(next);
    setGlobalSettings(next);
  }

  function onToggleAltitude(enabled: boolean) {
    updateSettings({ ...settings, enableAltitude: enabled });
    // Turning altitude off is meant to fully erase the concept (plain
    // Ranges behavior) — leaving old markers sitting on tokens with no way
    // left to see/edit them would be confusing, so they go with it.
    if (!enabled) {
      clearAllTokenHeightMarkers();
    }
  }

  return (
    <Stack gap={2} sx={{ pt: 1 }}>
      <Stack sx={{ px: 1 }}>
        <FieldLabel id="language-label" tooltip={t("settings.global.languageTooltip")}>
          {t("settings.global.language")}
        </FieldLabel>
        <ToggleButtonGroup
          value={language}
          onChange={(_, value: Language | null) => {
            if (value) {
              onChangeLanguage(value);
            }
          }}
          exclusive
          aria-labelledby="language-label"
          size="small"
          fullWidth
          sx={{ my: 0.5 }}
        >
          <ToggleButton value="es">{t("settings.global.languageEs")}</ToggleButton>
          <ToggleButton value="en">{t("settings.global.languageEn")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider />
      <Stack sx={{ px: 1 }} gap={1}>
        <FieldLabel id="enable-lecturas-label" tooltip={t("settings.global.enableLecturasTooltip")}>
          {t("settings.global.enableLecturas")}
        </FieldLabel>
        <FormControlLabel
          control={
            <Switch
              sx={{ overflow: "visible" }}
              checked={settings.enableLecturas ?? true}
              onChange={(_, checked) =>
                updateSettings({ ...settings, enableLecturas: checked })
              }
            />
          }
          label={t("settings.global.enableLecturasToggle")}
        />
      </Stack>

      <Divider />
      <Stack sx={{ px: 1 }} gap={1}>
        <FieldLabel id="hotkeys-label" tooltip={t("settings.global.hotkeysTooltip")}>
          {t("settings.global.hotkeys")}
        </FieldLabel>
        <Stack direction="row" gap={2} justifyContent="space-around" flexWrap="wrap">
          <HotkeyRecorder
            label={t("settings.global.hotkeyActivate")}
            value={settings.hotkeyActivate}
            reservedLetters={[settings.hotkeyRaise, settings.hotkeyLower]}
            onChange={(hotkeyActivate) => updateSettings({ ...settings, hotkeyActivate })}
          />
          <HotkeyRecorder
            label={t("settings.global.hotkeyRaise")}
            value={settings.hotkeyRaise}
            reservedLetters={[settings.hotkeyActivate, settings.hotkeyLower]}
            onChange={(hotkeyRaise) => updateSettings({ ...settings, hotkeyRaise })}
          />
          <HotkeyRecorder
            label={t("settings.global.hotkeyLower")}
            value={settings.hotkeyLower}
            reservedLetters={[settings.hotkeyActivate, settings.hotkeyRaise]}
            onChange={(hotkeyLower) => updateSettings({ ...settings, hotkeyLower })}
          />
        </Stack>
      </Stack>

      <Divider />
      <Stack sx={{ px: 1 }} gap={1}>
        <FieldLabel id="enable-altitude-label" tooltip={t("settings.global.enableAltitudeTooltip")}>
          {t("settings.global.enableAltitude")}
        </FieldLabel>
        <FormControlLabel
          control={
            <Switch
              sx={{ overflow: "visible" }}
              checked={settings.enableAltitude ?? true}
              onChange={(_, checked) => onToggleAltitude(checked)}
            />
          }
          label={t("settings.global.enableAltitudeToggle")}
        />
      </Stack>

      {(settings.enableAltitude ?? true) && (
        <>
          <Divider />
          <Stack sx={{ px: 1 }} gap={1}>
            <FieldLabel id="altitude-menu-label" tooltip={t("settings.global.altitudeMenuTooltip")}>
              {t("settings.global.altitudeMenu")}
            </FieldLabel>
            <FormControlLabel
              control={
                <Switch
                  sx={{ overflow: "visible" }}
                  checked={settings.showAltitudeMenu}
                  onChange={(_, checked) =>
                    updateSettings({ ...settings, showAltitudeMenu: checked })
                  }
                />
              }
              label={t("settings.global.altitudeMenuToggle")}
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}
