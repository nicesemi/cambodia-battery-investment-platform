import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import bn from './locales/bn.json';
import km from './locales/km.json';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
    bn: { translation: bn },
    km: { translation: km },
  },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
