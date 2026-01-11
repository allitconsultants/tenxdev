import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Rocket,
  Cloud,
  Shield,
  Database,
  Cpu,
  Wrench,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Services | TenxDev - Enterprise App Development',
  description:
    'End-to-end application development with enterprise SSO, regional databases, AI components, and managed cloud hosting.',
};

const whatWeDeliver = [
  {
    title: 'Custom Web & Mobile Apps',
    description: 'Full-stack applications built with modern technologies, deployed to the cloud.',
  },
  {
    title: 'Enterprise Integrations',
    description: 'SSO with Okta, Azure AD, Google. API integrations with your existing systems.',
  },
  {
    title: 'AI-Powered Features',
    description: 'Document processing, intelligent search, chatbots, and custom LLM integrations.',
  },
  {
    title: 'Managed Hosting',
    description: 'Cloud infrastructure with 99.9% uptime, auto-scaling, and 24/7 monitoring.',
  },
];

const enterpriseFeatures = [
  {
    icon: Shield,
    title: 'Enterprise SSO',
    description: 'Okta, Azure AD, Google Workspace, SAML, OIDC',
  },
  {
    icon: Database,
    title: 'Regional Databases',
    description: 'Data residency compliance with multi-region sync',
  },
  {
    icon: Cpu,
    title: 'AI Components',
    description: 'OpenAI, Anthropic, or custom model integrations',
  },
  {
    icon: Cloud,
    title: 'Cloud Native',
    description: 'Kubernetes, auto-scaling, edge deployment',
  },
];

const engagement = [
  {
    icon: Rocket,
    title: 'Full Build',
    description:
      'We take your idea and deliver a complete, production-ready application with all enterprise features.',
    features: [
      'Requirements & planning',
      'UI/UX design',
      'Full-stack development',
      'Enterprise integrations',
      'Cloud deployment',
      'Launch support',
    ],
    cta: 'Most Popular',
  },
  {
    icon: Wrench,
    title: 'Managed Hosting',
    description:
      'We host, monitor, and maintain your application. You focus on your business.',
    features: [
      '99.9% uptime SLA',
      '24/7 monitoring',
      'Security updates',
      'Daily backups',
      'Performance optimization',
      'Technical support',
    ],
    cta: 'Add-on',
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
              What We Do
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              We Build Enterprise Apps
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              From idea to fully hosted application. SSO, regional databases,
              AI components, and 24/7 managed infrastructure—all included.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  Get a Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What We Deliver */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            What We Deliver
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {whatWeDeliver.map((item) => (
              <div key={item.title} className="text-center">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              Enterprise Features, Built In
            </h2>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Every application includes the features your enterprise customers expect.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {enterpriseFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} variant="bordered">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Engagement Models */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              How We Work With You
            </h2>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Choose the engagement model that fits your needs.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {engagement.map((model) => {
              const Icon = model.icon;
              return (
                <Card key={model.title} variant="bordered" className="relative overflow-hidden">
                  {model.cta === 'Most Popular' && (
                    <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                      {model.cta}
                    </div>
                  )}
                  <CardContent className="p-8">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                      {model.title}
                    </h3>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                      {model.description}
                    </p>
                    <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                      {model.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
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
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              Let's Build Your App
            </h2>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Get a free consultation and project estimate within 48 hours.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button size="lg">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="secondary" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
