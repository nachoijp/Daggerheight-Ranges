import Stack from "@mui/material/Stack";
import { FieldLabel } from "./FieldLabel";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { ChoiceGroup, SECTION_GAP } from "./controls";
import { useOBRContext } from "./OBRContext";
import { useTranslation } from "../i18n/useTranslation";
import type { Language } from "../i18n/language";
import { groundHotkey, type DistancePanelAccess, type GlobalSettings } from "./globalSettings";

/** Room-wide basics: language, the tool's own shortcut, and who gets the Distancias panel. */
export function GeneralTab({
  settings,
  onChangeSettings,
}: {
  settings: GlobalSettings;
  onChangeSettings: (patch: Partial<GlobalSettings>) => void;
}) {
  const { language, onChangeLanguage } = useOBRContext();
  const t = useTranslation();
  return (
    <Stack gap={SECTION_GAP} sx={{ pt: 1 }}>
      <ChoiceGroup<Language>
        id="language-label"
        label={t("settings.global.language")}
        tooltip={t("settings.global.languageTooltip")}
        value={language}
        onChange={onChangeLanguage}
        options={[
          { value: "es", label: t("settings.global.languageEs") },
          { value: "en", label: t("settings.global.languageEn") },
        ]}
      />

      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1 }}>
        <Stack sx={{ flexGrow: 1 }}>
          <FieldLabel id="activate-hotkey-label" tooltip={t("settings.general.activateTooltip")}>
            {t("settings.global.hotkeyActivate")}
          </FieldLabel>
        </Stack>
        <HotkeyRecorder
          label=""
          ariaLabel={t("settings.global.hotkeyActivate")}
          value={settings.hotkeyActivate}
          reservedLetters={[settings.hotkeyRaise, settings.hotkeyLower, groundHotkey(settings)]}
          onChange={(hotkeyActivate) => onChangeSettings({ hotkeyActivate })}
        />
      </Stack>

      <ChoiceGroup<DistancePanelAccess>
        id="distance-panel-label"
        label={t("settings.global.distancePanel")}
        tooltip={t("settings.global.distancePanelTooltip")}
        value={settings.distancePanel ?? "off"}
        onChange={(distancePanel) => onChangeSettings({ distancePanel })}
        options={[
          { value: "off", label: t("settings.global.distancePanelOff") },
          { value: "gm", label: t("settings.global.distancePanelGm") },
          { value: "everyone", label: t("settings.global.distancePanelEveryone") },
        ]}
      />
    </Stack>
  );
}
