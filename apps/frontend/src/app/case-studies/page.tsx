import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, DollarSign, Users } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Case Studies',
  description: 'See how we helped startups build and launch their products with AI-powered development.',
};

const caseStudies = [
  {
    slug: 'surveyweb',
    title: 'SurveyWeb',
    subtitle: 'Market Research Survey Platform',
    description:
      'Helped a startup build an MVP for a professional survey platform designed specifically for market research companies.',
    image: '/images/case-studies/surveyweb.png',
    industry: 'MarTech / Research',
    results: [
      { label: 'Time to MVP', value: '4 weeks' },
      { label: 'Cost Savings', value: '60%' },
      { label: 'Features Shipped', value: '12' },
    ],
    tags: ['MVP', 'SaaS', 'React', 'Node.js'],
    featured: true,
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Case Studies
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              Real results from real startups. See how we help founders go from
              idea to launched product in weeks, not months.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Case Study */}
      {caseStudies.filter(cs => cs.featured).map((study) => (
        <section key={study.slug} className="pb-20 sm:pb-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5 border border-border-light dark:border-border-dark">
              <div className="grid lg:grid-cols-2">
                {/* Content */}
                <div className="p-8 sm:p-12 lg:p-16">
                  <div className="flex flex-wrap gap-2 mb-6">
                    {study.tags.map((tag) => (
                      <Badge key={tag} variant="primary">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-primary mb-2">
                    {study.industry}
                  </p>
                  <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
                    {study.title}
                  </h2>
                  <p className="mt-2 text-xl text-neutral-600 dark:text-neutral-400">
                    {study.subtitle}
                  </p>
                  <p className="mt-6 text-neutral-600 dark:text-neutral-400">
                    {study.description}
                  </p>

                  {/* Results */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {study.results.map((result) => (
                      <div key={result.label}>
                        <div className="text-2xl font-bold text-primary">
                          {result.value}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {result.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link href={`/case-studies/${study.slug}`}>
                      <Button>
                        Read Full Case Study
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Image/Visual */}
                <div className="relative bg-gradient-to-br from-primary to-accent-purple p-8 sm:p-12 lg:p-16 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl font-bold mb-4">📊</div>
                    <div className="text-2xl font-bold">dev.surveyweb.io</div>
                    <div className="mt-2 text-white/80">Market Research Platform</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* More Case Studies Coming */}
      <section className="pb-20 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-dashed border-border-light dark:border-border-dark p-12 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              More Case Studies Coming Soon
            </h3>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              We're documenting more success stories from our startup clients.
            </p>
            <p className="mt-4">
              <Link
                href="/contact"
                className="text-primary font-medium hover:text-primary-dark"
              >
                Want to be our next success story? Let's talk →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              Ready to Build Your Success Story?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
              Join the startups that launched faster with our 10x development approach.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  Start Your Project
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
