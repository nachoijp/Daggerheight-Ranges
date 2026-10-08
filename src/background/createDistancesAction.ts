import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import distancesIcon from "../assets/distances.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { type DistancePanelAccess } from "../settings/globalSettings";
import { toggleDistancesPanel, watchDistancesPanel } from "../distances/panelPopover";

// Registered once at load, like the Altura menu: the SDK can't change an
// action's role filter later, so who gets the button only changes on a
// reload. The panel itself re-checks the setting live (see DistancePanel).
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
