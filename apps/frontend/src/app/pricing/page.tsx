import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Flexible pricing for AI-powered software development services.',
};

const tiers = [
  {
    name: 'Discovery',
    description: 'Validate your idea and plan the roadmap',
    price: '$2,500',
    priceNote: 'one-time',
    features: [
      ' 2-hour strategy session',
      'Technical feasibility review',
      'Technology stack recommendation',
      'High-level architecture',
      'Development roadmap',
      'Cost & timeline estimate',
    ],
    cta: 'Book Discovery',
    highlighted: false,
  },
  {
    name: 'MVP Sprint',
    description: 'Go from idea to working product in 4 weeks',
    price: 'From $15k',
    priceNote: '4-week sprint',
    features: [
      'Everything in Discovery',
      'Full MVP development',
      'AI-powered 10x team',
      'Weekly demos & feedback',
      'Cloud infrastructure setup',
      'CI/CD pipeline',
      'Launch support',
      '30-day warranty',
    ],
    cta: 'Start Your MVP',
    highlighted: true,
  },
  {
    name: 'Growth',
    description: 'Scale your product with ongoing support',
    price: 'From $8k',
    priceNote: 'per month',
    features: [
      'Dedicated dev hours',
      'Feature development',
      'Bug fixes & maintenance',
      'Performance optimization',
      'Infrastructure scaling',
      'Priority support',
      'Monthly strategy calls',
      'Flexible commitment',
    ],
    cta: 'Let\'s Talk',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'What can you build in a 4-week MVP sprint?',
    answer:
      'We can build a fully functional web or mobile app with user authentication, core features, database, API, and cloud deployment. Past MVPs include SaaS dashboards, marketplaces, booking platforms, and internal tools.',
  },
  {
    question: 'Do you offer payment plans for startups?',
    answer:
      'Yes! We offer milestone-based payments so you\'re not paying everything upfront. For funded startups, we can also discuss deferred payment options tied to your funding milestones.',
  },
  {
    question: 'What happens after the MVP is launched?',
    answer:
      'Every MVP includes a 30-day warranty for bug fixes. After that, you can continue with our Growth retainer for ongoing development, or we hand off the codebase with full documentation so your team can take over.',
  },
  {
    question: 'Can you work with our existing team?',
    answer:
      'Absolutely. We can augment your team, pair program with your developers, or work independently. We adapt to whatever makes your startup move fastest.',
  },
  {
    question: 'What if I just need a few hours of consulting?',
    answer:
      'Our Discovery package is designed exactly for this. Get expert advice on your tech stack, architecture, or development approach without committing to a full project.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Startup-Friendly Pricing
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              Get your MVP to market fast without burning through your runway.
              Flexible packages designed for early-stage startups.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="pb-20 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                variant="bordered"
                className={`relative flex flex-col ${
                  tier.highlighted
                    ? 'border-primary ring-2 ring-primary'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <Badge
                    variant="primary"
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    Best for Startups
                  </Badge>
                )}
                <div className="p-8">
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    {tier.description}
                  </p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {tier.price}
                    </span>
                    <span className="ml-2 text-neutral-500">
                      {tier.priceNote}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-4">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/contact" className="w-full">
                      <Button
                        variant={tier.highlighted ? 'primary' : 'secondary'}
                        className="w-full"
                      >
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-neutral-50 py-20 dark:bg-neutral-900/50 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 space-y-8">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark"
              >
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {faq.question}
                </h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              Ready to Build Your MVP?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
              Book a free 30-minute call to discuss your startup idea. No
              commitment, just honest advice.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  Book Free Call
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
