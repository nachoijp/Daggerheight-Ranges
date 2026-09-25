import OBR, { type GridScale } from "@owlbear-rodeo/sdk";
import { createContext, useContext, useState, useEffect } from "react";
import { getPluginId } from "../util/getPluginId";
import { getDefaultBandSets, customBandSetsFromMetadata, resolveBandSet } from "../bandSets/bandSets";
import { BandSet } from "../engine/types";
import { Language, languageFromMetadata, setLanguage as persistLanguage } from "../i18n/language";

type OBRContextValue = {
  gridScale: GridScale;
  bandSet: BandSet;
  customBandSets: BandSet[];
  // Live (not just the initial fetch) and shared via context — most of the
  // settings tree needs to read the current language for useTranslation(),
  // far more call sites than bandSet's own "fetch once, prop-drill from
  // Settings.tsx" pattern would be worth threading through.
  language: Language;
  onChangeLanguage: (language: Language) => void;
};

const OBRContext = createContext<OBRContextValue | null>(null);

export function OBRContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gridScale, setGridScale] = useState<GridScale | null>(null);
  useEffect(() => {
    let mounted = true;
    OBR.scene.grid.getScale().then((scale) => {
      if (mounted) {
        setGridScale(scale);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [bandSet, setBandSet] = useState<BandSet | null>(null);
  const [customBandSets, setCustomBandSets] = useState<BandSet[] | null>(
    null
  );
  const [language, setLanguageState] = useState<Language | null>(null);
  useEffect(() => {
    let mounted = true;
    OBR.scene.getMetadata().then((metadata) => {
      if (mounted) {
        const language = languageFromMetadata(metadata);
        const rawBandSet = (metadata[getPluginId("bandSet")] ??
          getDefaultBandSets(language)[0]) as BandSet;
        setBandSet(resolveBandSet(rawBandSet, language));
        setCustomBandSets(customBandSetsFromMetadata(metadata));
        setLanguageState(language);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  function onChangeLanguage(next: Language) {
    setLanguageState(next);
    // A default preset's Bandas need to switch names right away too, not
    // just on the next reload — a custom BandSet (no matching default id)
    // passes through resolveBandSet unchanged.
    setBandSet((current) => (current ? resolveBandSet(current, next) : current));
    persistLanguage(next);
  }

  if (!gridScale || !bandSet || !customBandSets || !language) {
    return null;
  }

  return (
    <OBRContext.Provider
      value={{ gridScale, bandSet, customBandSets, language, onChangeLanguage }}
    >
      {children}
    </OBRContext.Provider>
  );
}

export function useOBRContext() {
  const context = useContext(OBRContext);
  if (!context) {
    throw new Error("useOBRContext must be used within an OBRContextProvider");
  }
  return context;
}
