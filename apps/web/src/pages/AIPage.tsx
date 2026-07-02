import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function AIPage() {
  const { t } = useTranslation();
  const placeholders = [
    { icon: '📊', title: 'Spending Spike Detected', body: 'Your dining expenses jumped 35% last week compared to your 3-month average.', meta: 'Insight based on transaction analysis' },
    { icon: '🏷️', title: 'Category Suggestion', body: 'Several transactions in "Miscellaneous" might belong to "Health & Wellness."', meta: 'Suggestion from intelligent categorization' },
    { icon: '📈', title: 'Monthly Trend', body: 'Your net worth grew 8% this month—strongest growth in your income category.', meta: 'Summary of your financial trends' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent-soft text-accent">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <h1 className="font-display text-4xl text-ink">{t('ai.title')}</h1>
        <div className="mt-3 flex justify-center gap-2">
          <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            {t('assets.beta', { defaultValue: 'Beta' })}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="mb-8">
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-display text-2xl text-ink">{t('ai.subtitle')}</h2>
            <p className="leading-relaxed text-ink-muted">{t('ai.description')}</p>
          </div>
          <div className="border-t border-line pt-4">
            <Button disabled className="w-full md:w-auto">
              {t('ai.cta')}
            </Button>
            <p className="mt-3 text-sm text-ink-muted">{t('dashboard.aiInsightsDescription')}</p>
          </div>
        </div>
      </Card>

      {/* Placeholder Cards */}
      <div className="mb-12">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="inline-block rounded bg-app-elevated px-2 py-1 text-xs font-medium text-ink-muted">
            {t('ai.placeholderTitle')}
          </span>
          {t('ai.exampleInsights')}
        </h3>
        <div className="space-y-4">
          {placeholders.map((p) => (
            <Card key={p.title} className="opacity-70">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-ink">{p.title}</h4>
                    <p className="mt-1 text-sm text-ink-muted">{p.body}</p>
                  </div>
                  <div className="text-3xl">{p.icon}</div>
                </div>
                <div className="border-t border-line pt-2">
                  <p className="text-xs text-ink-faint">{p.meta}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Privacy & Data Section */}
      <Card>
        <div className="space-y-4">
          <h3 className="font-semibold text-ink">{t('ai.privacyTitle')}</h3>
          <div className="space-y-3 text-sm text-ink-muted">
            <p>
              <strong className="text-ink">Scope:</strong> {t('ai.scope')}
            </p>
            <p>
              <strong className="text-ink">No cross-user data:</strong> {t('ai.noCrossUser')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
