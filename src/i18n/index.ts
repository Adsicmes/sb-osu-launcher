import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.ts";
import zh_kawaii from "./zh_kawaii.ts";
import zh from "./zh.ts";


const resources = {
    en: en,
    zh_kawaii: zh_kawaii,
    zh: zh,
};

i18n.use(initReactI18next)
    .init({
        resources: resources,
        lng: "zh",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;