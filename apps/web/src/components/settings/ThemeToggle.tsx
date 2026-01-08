import { useSettings } from '../../settings/SettingsProvider';

export function ThemeToggle() {
  const { settings, setThemeMode } = useSettings();
  return (
    <div className="flex items-center gap-3">
      {(['light','dark','system'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => setThemeMode(mode)}
          className={`px-3 py-2 rounded-lg border text-sm ${settings.themeMode===mode ? 'bg-[color:rgba(59,130,246,0.1)] text-[var(--accent-color)] border-[var(--accent-color)]' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          {mode.charAt(0).toUpperCase()+mode.slice(1)}
        </button>
      ))}
    </div>
  );
}
