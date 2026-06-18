import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import hi from "./translations/hi.json";

export const LANGUAGE_KEY = "globalchef-user-language";
const supportedLanguages = ["en", "es", "fr", "hi"];

// Get initial language synchronously from device locale (safeguarded against missing native module crashes)
let initialLang = "en";
try {
  if (Localization && typeof Localization.getLocales === "function") {
    const locales = Localization.getLocales();
    const deviceLang = locales?.[0]?.languageCode ?? "en";
    if (supportedLanguages.includes(deviceLang)) {
      initialLang = deviceLang;
    }
  }
} catch (e) {
  console.warn("[i18n] Failed to get device locale statically, falling back to 'en':", e);
}

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4",
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      hi: { translation: hi }
    },
    lng: initialLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

// Asynchronously load the saved language from storage
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((savedLanguage) => {
    if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    }
  })
  .catch(() => {
    // Ignore error
  });

export default i18n;
