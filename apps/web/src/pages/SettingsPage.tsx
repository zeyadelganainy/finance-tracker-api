import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../components/settings/SettingsSection';
import { LanguageSelector } from '../components/settings/LanguageSelector';
import { CurrencySelector } from '../components/settings/CurrencySelector';
import { ThemeToggle } from '../components/settings/ThemeToggle';
import { AccentColorPicker } from '../components/settings/AccentColorPicker';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-6">{t('settings.title')}</h1>
      <div className="space-y-6">
        <SettingsSection title={t('settings.languageRegion')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t('settings.language')}</div>
              <LanguageSelector />
            </div>
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t('settings.currency')}</div>
              <CurrencySelector />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t('settings.themeMode')}</div>
              <ThemeToggle />
            </div>
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t('settings.accentColor')}</div>
              <AccentColorPicker />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t('settings.preview')}</div>
            <div className="flex items-center gap-4">
              <Button variant="primary">{t('settingsPage.primaryAction')}</Button>
              <a className="text-[var(--accent-color)] hover:text-[var(--accent-color-hover)]" href="#">{t('settingsPage.link')}</a>
            </div>
          </div>
        </SettingsSection>

        {/* Future sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title={t('settings.notifications')}>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('common.comingSoon')}</div>
          </Card>
          <Card title={t('settings.privacy')}>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('common.comingSoon')}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
