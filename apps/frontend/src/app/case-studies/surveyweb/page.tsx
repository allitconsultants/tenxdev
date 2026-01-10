import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

export const metadata: Metadata = {
  title: 'SurveyWeb Case Study - Market Research Survey Platform',
  description: 'How we helped a startup build an MVP for a professional survey platform for market research companies in just 4 weeks.',
};

const challenge = [
  'Market research companies were using outdated, clunky survey tools',
  'Existing solutions lacked modern UX and real-time analytics',
  'No affordable option designed specifically for B2B research',
  'Needed to validate the concept quickly before raising funding',
];

const solution = [
  'Built a modern, responsive survey builder with drag-and-drop interface',
  'Implemented real-time response tracking and analytics dashboard',
  'Created a respondent management system with panel integration',
  'Set up scalable cloud infrastructure on AWS with auto-scaling',
  'Developed API for third-party integrations',
  'Implemented secure data handling compliant with GDPR',
];

const techStack = [
  { name: 'React', category: 'Frontend' },
  { name: 'TypeScript', category: 'Language' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'Docker', category: 'Containers' },
  { name: 'Terraform', category: 'IaC' },
  { name: 'GitHub Actions', category: 'CI/CD' },
];

const timeline = [
  { week: 'Week 1', title: 'Discovery & Architecture', description: 'Requirements gathering, tech stack decisions, database design, and project setup.' },
  { week: 'Week 2', title: 'Core Development', description: 'Survey builder, question types, branching logic, and user authentication.' },
  { week: 'Week 3', title: 'Analytics & Dashboard', description: 'Real-time response tracking, charts, export functionality, and admin panel.' },
  { week: 'Week 4', title: 'Polish & Launch', description: 'Testing, bug fixes, performance optimization, and production deployment.' },
];

const results = [
  { value: '4 weeks', label: 'Time to MVP', description: 'From kickoff to live product' },
  { value: '60%', label: 'Cost Savings', description: 'Compared to traditional agency' },
  { value: '12', label: 'Core Features', description: 'Shipped in first release' },
  { value: '99.9%', label: 'Uptime', description: 'Since launch' },
];

export default function SurveyWebCaseStudy() {
  return (
    <>
      {/* Back Link */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/case-studies"
          className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Case Studies
        </Link>
      </div>

      {/* Hero */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="primary">MVP</Badge>
                <Badge variant="primary">SaaS</Badge>
                <Badge variant="primary">MarTech</Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
                SurveyWeb
              </h1>
              <p className="mt-2 text-xl text-neutral-600 dark:text-neutral-400">
                Market Research Survey Platform
              </p>
              <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
                We helped a startup founder build and launch an MVP for a modern
                survey platform designed specifically for market research companies —
                in just 4 weeks.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://dev.surveyweb.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button>
                    Visit Live Site
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/contact">
                  <Button variant="secondary">
                    Build Something Similar
                  </Button>
                </Link>
              </div>
            </div>

            {/* Results Card */}
            <Card variant="bordered" className="p-8">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
                Project Results
              </h3>
              <div className="grid grid-cols-2 gap-6">
                {results.map((result) => (
                  <div key={result.label}>
                    <div className="text-3xl font-bold text-primary">
                      {result.value}
                    </div>
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {result.label}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {result.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                The Challenge
              </h2>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
                The founder identified a gap in the market research industry: existing
                survey tools were either too generic, too expensive, or lacked the
                specific features that market research companies needed.
              </p>
            </div>
            <div>
              <ul className="space-y-4">
                {challenge.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Solution */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Our Solution
              </h2>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
                Using our AI-powered 10x development approach, we built a complete
                MVP that the founder could use to validate the market and attract
                early customers.
              </p>
            </div>
            <div>
              <ul className="space-y-4">
                {solution.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white text-center">
            Tech Stack
          </h2>
          <p className="mt-4 text-center text-neutral-600 dark:text-neutral-400">
            Modern, scalable technologies chosen for speed and reliability.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="rounded-xl border border-border-light bg-surface-light px-6 py-4 text-center dark:border-border-dark dark:bg-surface-dark"
              >
                <div className="font-semibold text-neutral-900 dark:text-white">
                  {tech.name}
                </div>
                <div className="text-sm text-neutral-500">{tech.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white text-center">
            4-Week Sprint Timeline
          </h2>
          <p className="mt-4 text-center text-neutral-600 dark:text-neutral-400">
            How we went from kickoff to launch in just one month.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {timeline.map((phase, index) => (
              <div key={phase.week} className="relative">
                <div className="rounded-xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark h-full">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold mb-4">
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-primary mb-1">
                    {phase.week}
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {phase.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {phase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-gradient-to-br from-primary to-accent-purple">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-5xl mb-6">💬</div>
          <blockquote className="text-2xl font-medium text-white sm:text-3xl">
            "tenxdev delivered our MVP in 4 weeks — something I was quoted 3-4 months
            for by other agencies. The quality exceeded expectations and we were able
            to start onboarding customers immediately."
          </blockquote>
          <div className="mt-8">
            <div className="font-semibold text-white">Startup Founder</div>
            <div className="text-white/80">SurveyWeb</div>
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
              Let's discuss your startup idea and see how we can help you launch
              faster.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/contact">
                <Button size="lg">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/case-studies">
                <Button variant="secondary" size="lg">
                  View More Case Studies
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
