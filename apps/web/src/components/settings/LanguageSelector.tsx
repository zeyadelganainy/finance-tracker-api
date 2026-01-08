import { useTranslation } from 'react-i18next';
import { useSettings } from '../../settings/SettingsProvider';
import { Select } from '../ui/Select';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { settings, setLanguage } = useSettings();
  return (
    <Select
      value={settings.language}
      onChange={(e) => {
        const lang = e.target.value as 'en' | 'fr-CA';
        i18n.changeLanguage(lang);
        setLanguage(lang);
      }}
      options={[
        { value: 'en', label: 'English' },
        { value: 'fr-CA', label: 'Français (Canada)' },
      ]}
    />
  );
}
