import { useState } from 'react';
import { useAIContext } from '../hooks/useAI';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';

export function AIPage() {
  const [prompt, setPrompt] = useState('');
  const [showContext, setShowContext] = useState(false);
  
  // Fetch AI context for analysis
  const { data: aiContext, isLoading: loadingContext, error: contextError } = useAIContext();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show the context data below
    // Later: send prompt + context to LLM endpoint
    console.log('Prompt:', prompt);
    console.log('Context:', aiContext);
    setShowContext(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
              <p className="mt-1 text-sm text-gray-600">
                Ask questions about your finances
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔄</div>
            <div>
              <h3 className="font-semibold text-gray-900">Not Connected Yet</h3>
              <p className="text-sm text-gray-600 mt-1">
                The frontend is wired to fetch financial context and display insights. 
                To enable AI generation, connect to OpenAI API or similar LLM service.
              </p>
            </div>
          </div>
        </Card>

        {/* Input Section */}
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ask about your finances
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'What are my spending patterns?' or 'Should I invest more?'"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Your question will be analyzed along with your financial data
              </p>
              <Button 
                type="submit"
                disabled={!prompt.trim()}
                onClick={() => setShowContext(true)}
              >
                Analyze
              </Button>
            </div>
          </form>
        </Card>

        {/* Context Section */}
        {showContext && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Financial Context (Wired & Ready)
                </h3>
                <p className="text-sm text-gray-600">
                  This is the data being sent for analysis. Currently shows structure only.
                </p>
              </div>

              {loadingContext ? (
                <CardSkeleton />
              ) : contextError ? (
                <div className="p-4 bg-red-50 rounded border border-red-200">
                  <p className="text-sm text-red-700">
                    Error loading context: {contextError instanceof Error ? contextError.message : 'Unknown error'}
                  </p>
                </div>
              ) : aiContext ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox 
                      label="Total Accounts" 
                      value={aiContext.accounts.totalAccounts}
                      color="blue"
                    />
                    <StatBox 
                      label="Total Assets" 
                      value={aiContext.assets.totalAssets}
                      color="green"
                    />
                    <StatBox 
                      label="Total Transactions" 
                      value={aiContext.transactions.totalCount}
                      color="purple"
                    />
                    <StatBox 
                      label="Categories" 
                      value={aiContext.categories.totalCategories}
                      color="amber"
                    />
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">Total Balance</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ${aiContext.accounts.totalBalance.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">Total Assets Cost Basis</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ${aiContext.assets.totalCostBasis.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">Net Cash Flow</p>
                      <p className={`text-lg font-bold mt-1 ${
                        aiContext.transactions.netCashFlow >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        ${aiContext.transactions.netCashFlow.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Raw JSON */}
                  <details className="p-3 bg-white rounded border border-gray-200">
                    <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-indigo-600">
                      View Complete JSON Data
                    </summary>
                    <pre className="mt-3 p-3 bg-gray-50 rounded overflow-x-auto text-xs text-gray-700 max-h-96">
                      {JSON.stringify(aiContext, null, 2)}
                    </pre>
                  </details>

                  <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
                    <p className="text-xs text-gray-700">
                      <strong>Next Steps:</strong> Connect this data to an LLM API (OpenAI, Claude, etc.) 
                      to generate personalized insights based on the user's prompt.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">
                    No context data available
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Information Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✅ What's Implemented</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Fetch financial context from API</li>
                <li>• Display structured data overview</li>
                <li>• Show raw JSON for developers</li>
                <li>• Responsive UI with proper styling</li>
              </ul>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">🔧 What's Next</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Integrate OpenAI API key</li>
                <li>• Create prompt template</li>
                <li>• Display AI-generated insights</li>
                <li>• Add follow-up conversation</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper component for stat boxes
interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatBox({ label, value, color }: StatBoxProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
