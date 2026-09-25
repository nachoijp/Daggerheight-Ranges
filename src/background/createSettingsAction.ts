import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import settingsIcon from "../assets/settings.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";

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
        id: getPluginId("popover/settings"),
        url: "/settings.html",
        width: 350,
        // Grew to fit the preset selector + tab strip + tallest tab's
        // content (Medición: calc mode, tolerance, and now the icon-stack
        // Visualización controls). The tab body scrolls internally past
        // this, so it's not a hard limit — just an estimate pending
        // empirical tuning live in a room, since popover height is fixed
        // at open time and can't be measured from code.
        height: 480,
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
