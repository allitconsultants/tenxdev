import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui';

const trustedBy = [
  'Startups',
  'Scale-ups',
  'Enterprise',
];

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-primary">
            AI-Powered Development Agency
          </p>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl">
            From Idea to{' '}
            <span className="gradient-text">Enterprise-Ready App</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400 sm:text-xl">
            We build, deploy, and host your application with enterprise features
            built-in: SSO integration, regional databases, AI components, and
            24/7 managed infrastructure.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/contact">
              <Button size="lg" className="w-full sm:w-auto">
                Start Your Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact?type=demo">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Play className="mr-2 h-4 w-4" />
                Book a Demo
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Trusted by teams at
            </p>
            <div className="mt-4 flex items-center gap-8">
              {trustedBy.map((company) => (
                <span
                  key={company}
                  className="text-sm font-medium text-neutral-400 dark:text-neutral-500"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Key Features Strip */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white/50 p-4 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="text-2xl font-bold text-primary">SSO</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Okta, Azure AD, SAML
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white/50 p-4 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="text-2xl font-bold text-primary">AI</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Built-in Components
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white/50 p-4 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="text-2xl font-bold text-primary">Global</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Regional Databases
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white/50 p-4 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="text-2xl font-bold text-primary">99.9%</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Uptime SLA
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
