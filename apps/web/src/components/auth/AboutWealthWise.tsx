interface AboutWealthWiseProps {
  variant?: 'desktop' | 'mobile';
}

const bulletItems = [
  'Clear spending insights',
  'Secure, privacy-first design',
  'Built to scale with financial goals',
];

export function AboutWealthWise({ variant = 'desktop' }: AboutWealthWiseProps) {
  const isMobile = variant === 'mobile';

  return (
    <div
      className={`rounded-3xl border border-gray-200 shadow-sm ${
        isMobile
          ? 'bg-white/70 backdrop-blur p-6'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 p-10'
      }`}
    >
      <div className="space-y-4">

        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-gray-900">WealthWise</h2>
          <p className="text-lg font-medium text-gray-700">Your personal finance, simplified.</p>
          <p className="text-gray-600 leading-relaxed">
            WealthWise is your personal finance tracker for everyday expenses, recurring subscriptions,
            and long-term net worth insights. Designed to keep you informed without the noise.
          </p>
        </div>

        <ul className="space-y-3">
          {bulletItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-gray-800">
              <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-blue-500/80" />
              <span className="text-base font-medium">{item}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2 text-sm text-gray-500">React · .NET · PostgreSQL · AWS</div>
      </div>
    </div>
  );
}
