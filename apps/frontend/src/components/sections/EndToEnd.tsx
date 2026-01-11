import Link from 'next/link';
import {
  Paintbrush,
  Code2,
  Cloud,
  Wrench,
  ArrowRight,
  CheckCircle2,
  Handshake,
  RefreshCcw,
} from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';

const phases = [
  {
    icon: Paintbrush,
    title: 'Design & Plan',
    description: 'We work with you to define requirements, create wireframes, and plan the architecture.',
  },
  {
    icon: Code2,
    title: 'Build & Develop',
    description: 'Our 10x AI-powered team builds your application with modern technologies.',
  },
  {
    icon: Cloud,
    title: 'Deploy & Host',
    description: 'We deploy to the cloud and manage your infrastructure with 99.9% uptime.',
  },
  {
    icon: Wrench,
    title: 'Maintain & Scale',
    description: 'Ongoing support, updates, and scaling as your business grows.',
  },
];

const options = [
  {
    icon: Handshake,
    title: 'Full Handoff',
    description: 'We build it, document it, and hand it over to your team with training and support.',
    features: [
      'Complete source code ownership',
      'Technical documentation',
      'Team training sessions',
      'Knowledge transfer',
      '30-day support warranty',
    ],
  },
  {
    icon: RefreshCcw,
    title: 'Monthly Maintenance',
    description: 'We continue managing and improving your application on an ongoing basis.',
    features: [
      'Dedicated dev hours',
      '24/7 monitoring & alerts',
      'Bug fixes & updates',
      'Feature development',
      'Infrastructure management',
    ],
  },
];

export function EndToEnd() {
  return (
    <section className="py-20 sm:py-32 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            End-to-End Service
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            From initial concept to production deployment and beyond. We handle everything
            so you can focus on growing your business.
          </p>
        </div>

        {/* Phases Timeline */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            return (
              <div key={phase.title} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-8 w-8" />
                    </div>
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
                    {phase.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {phase.description}
                  </p>
                </div>
                {/* Connector Arrow */}
                {index < phases.length - 1 && (
                  <div className="absolute right-0 top-8 hidden -translate-x-1/2 lg:block">
                    <ArrowRight className="h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* After Launch Options */}
        <div className="mt-20">
          <h3 className="text-center text-2xl font-bold text-neutral-900 dark:text-white">
            After Launch, You Choose
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600 dark:text-neutral-400">
            Whether you want full ownership or ongoing partnership, we adapt to your needs.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.title} variant="bordered" className="relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/5" />
                  <CardContent className="relative p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-neutral-900 dark:text-white">
                          {option.title}
                        </h4>
                        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {option.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/pricing">
            <Button size="lg">
              View Pricing Options
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
