import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import heightIcon from "../assets/height.svg";
import { type Language } from "../i18n/language";
import { translate } from "../i18n/translate";

export function createTokenHeightMenu(language: Language) {
  OBR.contextMenu.create({
    id: getPluginId("menu/tokenHeight"),
    icons: [
      {
        icon: heightIcon,
        label: translate(language, "toolbar.altura"),
        filter: {
          every: [
            { key: "layer", value: "CHARACTER" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
        },
      },
    ],
    embed: {
      url: "/token-height.html",
      // 160 clipped the bottom row live; 210 left too much empty space
      // below it. Splitting the difference — still an estimate.
      height: 185,
    },
  });
}
