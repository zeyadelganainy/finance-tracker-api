import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function AIPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50">{t('ai.title')}</h1>
          <div className="mt-3 flex justify-center gap-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              {t('assets.beta', { defaultValue: 'Beta' })}
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-indigo-200 dark:border-gray-700">
          <div className="space-y-6">
            {/* Purpose Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3">
                {t('ai.subtitle')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('ai.description')}
              </p>
            </div>

            {/* Call-to-Action */}
            <div className="pt-4 border-t border-indigo-200">
              <Button 
                disabled
                className="w-full md:w-auto"
              >
                {t('ai.cta')}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                {t('dashboard.aiInsightsDescription')}
              </p>
            </div>
          </div>
        </Card>

        {/* Placeholder Cards */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
              {t('ai.placeholderTitle')}
            </span>
            {t('ai.exampleInsights')}
          </h3>
          <div className="space-y-4">
            {/* Placeholder 1: Spending Anomaly */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-50">Spending Spike Detected</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Your dining expenses jumped 35% last week compared to your 3-month average.
                    </p>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Insight based on transaction analysis
                  </p>
                </div>
              </div>
            </Card>

            {/* Placeholder 2: Category Suggestion */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-50">Category Suggestion</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Several transactions in "Miscellaneous" might belong to "Health & Wellness."
                    </p>
                  </div>
                  <div className="text-3xl">🏷️</div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Suggestion from intelligent categorization
                  </p>
                </div>
              </div>
            </Card>

            {/* Placeholder 3: Trend Summary */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-50">Monthly Trend</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Your net worth grew 8% this month—strongest growth in your income category.
                    </p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Summary of your financial trends
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Privacy & Data Section */}
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t('ai.privacyTitle')}</h3>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong>Scope:</strong> {t('ai.scope')}
              </p>
              <p>
                <strong>No cross-user data:</strong> {t('ai.noCrossUser')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
