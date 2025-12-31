import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function AIPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-4xl font-bold text-gray-900">AI Insights</h1>
          <div className="mt-3 flex justify-center gap-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              Beta
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <div className="space-y-6">
            {/* Purpose Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Intelligent Financial Summaries, Coming Soon
              </h2>
              <p className="text-gray-700 leading-relaxed">
                AI Insights will help you understand your money better. The system detects unusual spending patterns, suggests smarter category organization, and summarizes your financial trends weekly and monthly—all powered by analysis of your data.
              </p>
            </div>

            {/* Call-to-Action */}
            <div className="pt-4 border-t border-indigo-200">
              <Button 
                disabled
                className="w-full md:w-auto"
              >
                Generate Insights
              </Button>
              <p className="text-sm text-gray-600 mt-3">
                Model-powered insights are shipping next. The data pipeline and UI scaffolding are already in place.
              </p>
            </div>
          </div>
        </Card>

        {/* Placeholder Cards */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
              Preview
            </span>
            Example Insights
          </h3>
          <div className="space-y-4">
            {/* Placeholder 1: Spending Anomaly */}
            <Card className="bg-white border-gray-200 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Spending Spike Detected</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your dining expenses jumped 35% last week compared to your 3-month average.
                    </p>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Insight based on transaction analysis
                  </p>
                </div>
              </div>
            </Card>

            {/* Placeholder 2: Category Suggestion */}
            <Card className="bg-white border-gray-200 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Category Suggestion</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Several transactions in "Miscellaneous" might belong to "Health & Wellness."
                    </p>
                  </div>
                  <div className="text-3xl">🏷️</div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Suggestion from intelligent categorization
                  </p>
                </div>
              </div>
            </Card>

            {/* Placeholder 3: Trend Summary */}
            <Card className="bg-white border-gray-200 opacity-60">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Monthly Trend</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your net worth grew 8% this month—strongest growth in your income category.
                    </p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Summary of your financial trends
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Privacy & Data Section */}
        <Card className="bg-gray-50 border-gray-200">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Your Data, Your Privacy</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>Scope:</strong> AI Insights are generated only from your account's data. Your financial information remains private and is never shared with other users.
              </p>
              <p>
                <strong>No cross-user data:</strong> All analysis is personal to you. We don't use aggregate data from other accounts to influence your insights.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
