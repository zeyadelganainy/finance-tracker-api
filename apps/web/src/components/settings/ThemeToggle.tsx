import { useTranslation } from 'react-i18next';
import { useSettings } from '../../settings/SettingsProvider';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { settings, setThemeMode } = useSettings();
  return (
    <div className="flex items-center gap-3">
      {(['light','dark','system'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => setThemeMode(mode)}
          className={`rounded-md border px-3 py-2 text-sm transition-colors ${settings.themeMode===mode ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-ink-muted hover:bg-app-elevated hover:text-ink'}`}
        >
          {t(`settings.${mode}`)}
        </button>
      ))}
    </div>
  );
}
