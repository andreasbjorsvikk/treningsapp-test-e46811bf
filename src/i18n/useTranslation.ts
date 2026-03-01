import { useSettings } from '@/contexts/SettingsContext';
import { translations, Language } from './translations';

export function useTranslation() {
  const { settings } = useSettings();
  const lang: Language = settings.language || 'no';

  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = translations[lang]?.[key] || translations['no'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  return { t, language: lang, locale };
}
