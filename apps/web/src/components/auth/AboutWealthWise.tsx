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
      className={`rounded-card border border-line bg-app-surface shadow-card ${
        isMobile ? 'p-6' : 'p-10'
      }`}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-md font-display text-lg"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
          >
            W
          </span>
          <h2 className="font-display text-3xl text-ink">WealthWise</h2>
          <p className="text-lg font-medium text-ink">Your personal finance, simplified.</p>
          <p className="leading-relaxed text-ink-muted">
            A private wealth command center for everyday expenses, recurring subscriptions,
            and long-term net worth insights. Designed to keep you informed without the noise.
          </p>
        </div>

        <ul className="space-y-3">
          {bulletItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-ink">
              <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-base">{item}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-line pt-4 font-mono text-xs uppercase tracking-wide text-ink-faint">
          React · .NET · PostgreSQL · AWS
        </div>
      </div>
    </div>
  );
}
