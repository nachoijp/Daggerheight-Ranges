import { useOBRContext } from "../settings/OBRContext";
import { translate, type TranslationKey } from "./translate";

export function useTranslation() {
  const { language } = useOBRContext();
  return (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(language, key, vars);
}
