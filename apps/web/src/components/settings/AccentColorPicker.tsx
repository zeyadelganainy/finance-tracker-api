import { useSettings } from '../../settings/SettingsProvider';
import type { AccentColor } from '../../settings/registry';

const SWATCHES: AccentColor[] = ['blue','emerald','purple','orange','rose'];
const COLORS: Record<AccentColor, string> = {
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  rose: '#f43f5e',
};

export function AccentColorPicker() {
  const { settings, setAccentColor } = useSettings();
  return (
    <div className="flex items-center gap-3">
      {SWATCHES.map((sw) => (
        <button
          key={sw}
          aria-label={`Accent ${sw}`}
          onClick={() => setAccentColor(sw)}
          className={`w-8 h-8 rounded-full border-2 ${settings.accentColor===sw ? 'border-gray-900' : 'border-gray-300'}`}
          style={{ backgroundColor: COLORS[sw] }}
        />
      ))}
    </div>
  );
}
