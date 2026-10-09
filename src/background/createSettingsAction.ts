import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import settingsIcon from "../assets/settings.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { GLASS_FRAME } from "../util/glass";
import { SETTINGS_INITIAL_HEIGHT, SETTINGS_POPOVER_ID, SETTINGS_WIDTH } from "../settings/settingsPopover";

export function createSettingsAction(language: Language) {
  OBR.tool.createAction({
    id: getPluginId("action/settings"),
    icons: [
      {
        icon: settingsIcon,
        label: translate(language, "toolbar.opciones"),
        filter: {
          activeTools: ["rodeo.owlbear.tool/measure"],
          permissions: ["RULER_CREATE"],
          roles: ["GM"],
        },
      },
    ],
    onClick(_, elementId) {
      OBR.popover.open({
        id: SETTINGS_POPOVER_ID,
        url: "/settings.html",
        // The page draws its own translucent panel (GlassFrame), with a
        // margin and border around it, and then resizes its height to fit
        // whichever tab is showing (see Settings.tsx).
        width: SETTINGS_WIDTH + GLASS_FRAME,
        height: SETTINGS_INITIAL_HEIGHT + GLASS_FRAME,
        hidePaper: true,
        anchorElementId: elementId,
        anchorOrigin: {
          horizontal: "CENTER",
          vertical: "BOTTOM",
        },
        transformOrigin: {
          horizontal: "CENTER",
          vertical: "TOP",
        },
      });
    },
  });
}
