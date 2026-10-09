import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import themeIcon from "../assets/theme.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { GLASS_FRAME } from "../util/glass";

export function createThemeAction(language: Language) {
  OBR.tool.createAction({
    id: getPluginId("action/theme"),
    icons: [
      {
        icon: themeIcon,
        label: translate(language, "toolbar.colorTheme"),
        filter: {
          activeTools: ["rodeo.owlbear.tool/measure"],
          permissions: ["RULER_CREATE"],
        },
      },
    ],
    onClick(_, elementId) {
      OBR.popover.open({
        id: getPluginId("popover/theme"),
        url: "/theme.html",
        // The page draws its own translucent frames (GlassFrame) around
        // the theme list.
        width: 240 + GLASS_FRAME,
        height: 240 + GLASS_FRAME,
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
