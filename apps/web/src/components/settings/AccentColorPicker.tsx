import { useSettings } from '../../settings/SettingsProvider';
import type { AccentColor } from '../../settings/registry';

const SWATCHES: { key: AccentColor; label: string; swatch: string }[] = [
  // Gold renders the theme-aware default; show its dark-mode champagne tone in the chip.
  { key: 'gold', label: 'Gold', swatch: '#c9a96e' },
  { key: 'sage', label: 'Sage', swatch: '#5b8a72' },
  { key: 'slate', label: 'Slate', swatch: '#6b7fa3' },
  { key: 'rose', label: 'Rose', swatch: '#a67c8a' },
  { key: 'stone', label: 'Stone', swatch: '#8b8569' },
];

export function AccentColorPicker() {
  const { settings, setAccentColor } = useSettings();
  return (
    <div className="flex items-center gap-3">
      {SWATCHES.map((sw) => {
        const selected = settings.accentColor === sw.key;
        return (
          <button
            key={sw.key}
            aria-label={`Accent ${sw.label}`}
            title={sw.label}
            onClick={() => setAccentColor(sw.key)}
            className={`relative h-8 w-8 rounded-full transition-transform duration-150 hover:scale-105 ${
              selected ? 'ring-2 ring-offset-2 ring-ink ring-offset-app-surface' : 'ring-1 ring-line-strong'
            }`}
            style={{ backgroundColor: sw.swatch }}
          />
        );
      })}
    </div>
  );
}
