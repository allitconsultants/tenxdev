import { Check, X, Zap, Clock, DollarSign, Shield } from 'lucide-react';
import { Card } from '@/components/ui';

const comparisons = [
  {
    feature: 'Development Speed',
    traditional: '3-6 months',
    tenxdev: '3-6 weeks',
  },
  {
    feature: 'Team Size Required',
    traditional: '8-12 developers',
    tenxdev: '2-4 developers',
  },
  {
    feature: 'Cost Efficiency',
    traditional: 'Standard rates',
    tenxdev: '75% cost savings',
  },
  {
    feature: 'Code Quality',
    traditional: 'Manual review',
    tenxdev: 'AI-enhanced + manual',
  },
  {
    feature: 'Documentation',
    traditional: 'Often neglected',
    tenxdev: 'Auto-generated',
  },
  {
    feature: 'Test Coverage',
    traditional: '40-60%',
    tenxdev: '85-95%',
  },
];

const advantages = [
  {
    icon: Zap,
    title: '10x Faster Development',
    description:
      'AI-augmented developers complete tasks 10x faster than traditional methods.',
  },
  {
    icon: Clock,
    title: '1/4 Time to Market',
    description:
      'Get to market in weeks instead of months with accelerated development cycles.',
  },
  {
    icon: DollarSign,
    title: '1/4 Development Cost',
    description:
      'Smaller, more efficient teams mean dramatically reduced project costs.',
  },
  {
    icon: Shield,
    title: 'Enterprise Quality',
    description:
      'AI-enhanced code review ensures consistent quality and security standards.',
  },
];

export function AIAdvantage() {
  return (
    <section className="bg-neutral-50 py-20 dark:bg-neutral-900/50 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            The{' '}
            <span className="gradient-text">10x Advantage</span>
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            See how AI-powered development transforms project delivery compared
            to traditional approaches.
          </p>
        </div>

        {/* Advantages Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((advantage) => {
            const Icon = advantage.icon;
            return (
              <Card key={advantage.title} variant="default" className="text-center">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {advantage.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {advantage.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-20">
          <h3 className="mb-8 text-center text-2xl font-bold text-neutral-900 dark:text-white">
            Traditional vs 10x Development
          </h3>
          <div className="overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-500">
                    Traditional
                  </th>
                  <th className="bg-primary/5 px-6 py-4 text-center text-sm font-semibold text-primary">
                    tenxdev
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={
                      idx !== comparisons.length - 1
                        ? 'border-b border-border-light dark:border-border-dark'
                        : ''
                    }
                  >
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-neutral-500">
                      {row.traditional}
                    </td>
                    <td className="bg-primary/5 px-6 py-4 text-center text-sm font-medium text-primary">
                      {row.tenxdev}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
