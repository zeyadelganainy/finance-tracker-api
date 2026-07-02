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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-3xl text-ink">{t('settings.title')}</h1>
      <div className="space-y-6">
        <SettingsSection title={t('settings.languageRegion')}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-2">{t('settings.language')}</div>
              <LanguageSelector />
            </div>
            <div>
              <div className="eyebrow mb-2">{t('settings.currency')}</div>
              <CurrencySelector />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance')}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-2">{t('settings.themeMode')}</div>
              <ThemeToggle />
            </div>
            <div>
              <div className="eyebrow mb-2">{t('settings.accentColor')}</div>
              <AccentColorPicker />
            </div>
          </div>
          <div className="mt-6">
            <div className="eyebrow mb-2">{t('settings.preview')}</div>
            <div className="flex items-center gap-4">
              <Button variant="primary">{t('settingsPage.primaryAction')}</Button>
              <a className="text-accent hover:text-accent-hover" href="#">{t('settingsPage.link')}</a>
            </div>
          </div>
        </SettingsSection>

        {/* Future sections */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title={t('settings.notifications')}>
            <div className="text-sm text-ink-muted">{t('common.comingSoon')}</div>
          </Card>
          <Card title={t('settings.privacy')}>
            <div className="text-sm text-ink-muted">{t('common.comingSoon')}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
