import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { FieldLabel } from "./FieldLabel";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { useOBRContext } from "./OBRContext";
import { useTranslation } from "../i18n/useTranslation";
import type { Language } from "../i18n/language";
import {
  DEFAULT_GLOBAL_SETTINGS,
  getGlobalSettings,
  setGlobalSettings,
  type DistancePanelAccess,
  type GlobalSettings,
  type MarkerStyle,
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
        {(settings.enableLecturas ?? true) && (
          <Stack direction="row" alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  sx={{ overflow: "visible" }}
                  checked={settings.showLecturaDistance ?? false}
                  onChange={(_, checked) =>
                    updateSettings({ ...settings, showLecturaDistance: checked })
                  }
                />
              }
              label={t("settings.global.lecturaDistanceToggle")}
            />
            <Tooltip title={t("settings.global.lecturaDistanceTooltip")}>
              <InfoOutlined sx={{ fontSize: 14, opacity: 0.6 }} />
            </Tooltip>
          </Stack>
        )}
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

          <Divider />
          <Stack sx={{ px: 1 }}>
            <FieldLabel id="marker-style-label" tooltip={t("settings.global.markerStyleTooltip")}>
              {t("settings.global.markerStyle")}
            </FieldLabel>
            <ToggleButtonGroup
              value={settings.markerStyle ?? "icons"}
              onChange={(_, value: MarkerStyle | null) => {
                if (value) {
                  updateSettings({ ...settings, markerStyle: value });
                }
              }}
              exclusive
              aria-labelledby="marker-style-label"
              size="small"
              fullWidth
              sx={{ my: 0.5 }}
            >
              <ToggleButton value="icons">{t("settings.global.markerStyleIcons")}</ToggleButton>
              <ToggleButton value="label">{t("settings.global.markerStyleLabel")}</ToggleButton>
              <ToggleButton value="both">{t("settings.global.markerStyleBoth")}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </>
      )}

      <Divider />
      <Stack sx={{ px: 1, pb: 1 }}>
        <FieldLabel id="distance-panel-label" tooltip={t("settings.global.distancePanelTooltip")}>
          {t("settings.global.distancePanel")}
        </FieldLabel>
        <ToggleButtonGroup
          value={settings.distancePanel ?? "off"}
          onChange={(_, value: DistancePanelAccess | null) => {
            if (value) {
              updateSettings({ ...settings, distancePanel: value });
            }
          }}
          exclusive
          aria-labelledby="distance-panel-label"
          size="small"
          fullWidth
          sx={{ my: 0.5 }}
        >
          <ToggleButton value="off">{t("settings.global.distancePanelOff")}</ToggleButton>
          <ToggleButton value="gm">{t("settings.global.distancePanelGm")}</ToggleButton>
          <ToggleButton value="everyone">{t("settings.global.distancePanelEveryone")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );
}
