import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Shield, Zap, Clock, Users } from 'lucide-react';
import { Button, Card } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Pricing | TenxDev - Enterprise App Development',
  description:
    'Transparent pricing for enterprise application development. SSO, regional databases, AI components included.',
};

const included = [
  'Enterprise SSO (Okta, Azure AD, SAML)',
  'Regional database support',
  'AI component integration',
  'Cloud deployment',
  'Source code ownership',
  'Documentation & training',
];

const process = [
  {
    step: '1',
    title: 'Discovery Call',
    description: 'Free 30-min call to understand your project',
    time: 'Free',
  },
  {
    step: '2',
    title: 'Proposal',
    description: 'Detailed scope, timeline, and fixed quote',
    time: '48 hours',
  },
  {
    step: '3',
    title: 'Build',
    description: 'We develop your app with weekly updates',
    time: '6-12 weeks',
  },
  {
    step: '4',
    title: 'Launch',
    description: 'Deploy to production with support',
    time: 'Included',
  },
];

const stats = [
  { value: '$25k', label: 'Typical starting point', sublabel: 'for MVPs' },
  { value: '6-12', label: 'Weeks to launch', sublabel: 'not months' },
  { value: '99.9%', label: 'Uptime SLA', sublabel: 'managed hosting' },
];

const faqs = [
  {
    q: 'How much does a typical project cost?',
    a: 'Most projects range from $25k-$100k depending on complexity. We provide a fixed quote after understanding your requirements—no surprises.',
  },
  {
    q: 'What enterprise features are included?',
    a: 'Every project includes SSO integration (Okta, Azure AD, Google, SAML), regional database support for data residency, and AI component integration. No extra charge.',
  },
  {
    q: 'Do I own the code?',
    a: 'Yes. You get full source code, documentation, and training. Host it yourself or use our managed hosting—your choice.',
  },
  {
    q: 'What about ongoing maintenance?',
    a: 'We offer managed hosting from $500/month (includes monitoring, updates, backups) or development retainers from $8k/month for new features.',
  },
  {
    q: 'How do payments work?',
    a: 'We typically structure payments in milestones: 30% to start, 30% at midpoint, 40% at launch. We can discuss flexible arrangements for funded startups.',
  },
];

const trust = [
  { icon: Shield, label: 'SOC 2 Ready Architecture' },
  { icon: Zap, label: 'AI-Powered Development' },
  { icon: Clock, label: 'On-Time Delivery' },
  { icon: Users, label: 'Dedicated Team' },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Enterprise Features.
              <br />
              <span className="text-primary">Transparent Pricing.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              Every project includes SSO, regional databases, and AI components.
              Get a fixed quote in 48 hours.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  Get Your Free Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 font-medium text-neutral-900 dark:text-white">
                  {stat.label}
                </div>
                <div className="text-sm text-neutral-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              Included in Every Project
            </h2>
            <p className="mt-4 text-center text-neutral-600 dark:text-neutral-400">
              No add-ons. No upsells. Enterprise features from day one.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {included.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            How It Works
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
                <p className="mt-2 text-sm font-medium text-primary">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ongoing Options */}
      <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            After Launch
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600 dark:text-neutral-400">
            Take full ownership or let us handle everything.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-2">
            {/* Option 1 */}
            <Card variant="bordered" className="p-8">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Full Handoff
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                You own everything. We provide complete documentation and training.
              </p>
              <div className="mt-4 text-2xl font-bold text-neutral-900 dark:text-white">
                Included
                <span className="ml-2 text-base font-normal text-neutral-500">
                  with every project
                </span>
              </div>
              <ul className="mt-6 space-y-2">
                {['Full source code', 'Technical documentation', 'Team training', '30-day support'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  )
                )}
              </ul>
            </Card>

            {/* Option 2 */}
            <Card variant="bordered" className="relative overflow-hidden p-8">
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                Popular
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Managed Hosting
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                We run your app. You focus on your business.
              </p>
              <div className="mt-4 text-2xl font-bold text-neutral-900 dark:text-white">
                From $500
                <span className="ml-2 text-base font-normal text-neutral-500">/month</span>
              </div>
              <ul className="mt-6 space-y-2">
                {['99.9% uptime SLA', '24/7 monitoring', 'Security updates', 'Daily backups', 'Technical support'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  )
                )}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            Common Questions
          </h2>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white">{faq.q}</h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-8 py-16 text-center sm:px-16">
            <div className="absolute right-0 top-0 -z-10 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Let's Discuss Your Project
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Free 30-minute call. No commitment. Get a fixed quote in 48 hours.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  Schedule Your Call
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
