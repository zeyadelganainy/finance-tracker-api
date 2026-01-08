import { useSettings } from '../../settings/SettingsProvider';
import { Select } from '../ui/Select';

export function CurrencySelector() {
  const { settings, setCurrency } = useSettings();
  return (
    <Select
      value={settings.currency}
      onChange={(e) => setCurrency(e.target.value as typeof settings.currency)}
      options={[
        { value: 'CAD', label: 'CAD' },
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
      ]}
    />
  );
}
