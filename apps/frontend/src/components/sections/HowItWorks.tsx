import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

const steps = [
  {
    number: '01',
    title: 'Discovery Call',
    description:
      'Tell us about your idea. We\'ll discuss requirements, timeline, and give you a clear proposal within 48 hours.',
  },
  {
    number: '02',
    title: 'We Build & Deploy',
    description:
      'Our AI-powered team develops your application with enterprise features, deploys to the cloud, and sets up CI/CD.',
  },
  {
    number: '03',
    title: 'Launch & Support',
    description:
      'Go live with confidence. We provide managed hosting or hand off the code—your choice. Ongoing support available.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-neutral-50 py-20 dark:bg-neutral-900/50 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            From first call to production in weeks, not months.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/50 to-transparent lg:block" />
              )}

              <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.number}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link href="/contact">
            <Button size="lg">
              Schedule Your Discovery Call
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
