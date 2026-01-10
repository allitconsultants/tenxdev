import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5" />
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-accent-cyan/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Development</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl lg:text-7xl">
            <span className="gradient-text">10x Development.</span>
            <br />
            <span className="text-neutral-900 dark:text-white">
              1/4 Time. 1/4 Cost.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400 sm:text-xl">
            With AI-augmented 10x developers and infrastructure engineers, we
            deliver enterprise-grade software faster and more cost-effectively
            than traditional development teams.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/contact">
              <Button size="lg" className="w-full sm:w-auto">
                Start Your Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/case-studies">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                View Case Studies
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                4x
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Faster Delivery
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                75%
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Cost Reduction
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                10x
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Developer Productivity
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                99.9%
              </div>
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
