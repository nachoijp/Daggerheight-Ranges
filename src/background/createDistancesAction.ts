import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import distancesIcon from "../assets/distances.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { type DistancePanelAccess } from "../settings/globalSettings";
import { toggleDistancesPanel, watchDistancesPanel } from "../distances/panelPopover";

// Registered again whenever who gets it changes (see toolbar.ts), and
// removed when it's turned off. The panel itself also re-checks the setting
// live (see DistancePanel), for anyone who still has it open.
export function createDistancesAction(language: Language, access: DistancePanelAccess) {
  if (access === "off") {
    return;
  }
  watchDistancesPanel();
  OBR.tool.createAction({
    id: getPluginId("action/distances"),
    icons: [
      {
        icon: distancesIcon,
        label: translate(language, "toolbar.distancias"),
        filter: {
          activeTools: ["rodeo.owlbear.tool/measure"],
          permissions: ["RULER_CREATE"],
          ...(access === "gm" ? { roles: ["GM" as const] } : {}),
        },
      },
    ],
    onClick() {
      toggleDistancesPanel();
    },
  });
}
