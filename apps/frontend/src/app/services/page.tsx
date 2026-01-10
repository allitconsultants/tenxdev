import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Server,
  GitBranch,
  Cloud,
  Layers,
  GraduationCap,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Services',
  description: 'AI-powered development services including infrastructure engineering, DevOps automation, and cloud architecture.',
};

const services = [
  {
    id: 'ai-development',
    name: 'AI-Powered Development',
    description:
      'Leverage AI to accelerate development cycles, improve code quality, and reduce time to market. Our AI-augmented developers deliver 10x faster than traditional teams.',
    icon: Sparkles,
    features: [
      'AI-assisted code generation and review',
      'Automated testing and quality assurance',
      'Intelligent refactoring and optimization',
      'Documentation automation',
      'Code security analysis',
      'Performance optimization',
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Engineering',
    description:
      'Build robust, scalable infrastructure using Infrastructure as Code. We design and implement cloud-native solutions that scale with your business.',
    icon: Server,
    features: [
      'Terraform & Pulumi expertise',
      'Kubernetes orchestration',
      'Multi-cloud architecture',
      'Cost optimization strategies',
      'Disaster recovery planning',
      'Infrastructure monitoring',
    ],
  },
  {
    id: 'devops',
    name: 'DevOps Automation',
    description:
      'Streamline your development workflow with modern CI/CD pipelines. We automate everything from build to deployment for faster, more reliable releases.',
    icon: GitBranch,
    features: [
      'CI/CD pipeline design',
      'GitOps workflows',
      'Release automation',
      'Monitoring & observability',
      'Incident response automation',
      'Configuration management',
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud Architecture',
    description:
      'Design and implement cloud solutions across AWS, Azure, and GCP. We help you choose the right services and architect for scalability and cost-efficiency.',
    icon: Cloud,
    features: [
      'AWS, Azure, GCP expertise',
      'Serverless architectures',
      'Microservices design',
      'Security best practices',
      'Compliance frameworks',
      'Cost management',
    ],
  },
  {
    id: 'platform',
    name: 'Platform Engineering',
    description:
      'Build internal developer platforms that boost productivity and standardize workflows. Enable self-service infrastructure for your development teams.',
    icon: Layers,
    features: [
      'Developer portals',
      'Self-service platforms',
      'Golden paths',
      'Developer experience optimization',
      'Service catalogs',
      'Internal tooling',
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting & Training',
    description:
      'Expert guidance and hands-on training to upskill your team. We share our knowledge to help you build internal capabilities.',
    icon: GraduationCap,
    features: [
      'Architecture reviews',
      'Team training workshops',
      'Best practices implementation',
      'Technology roadmaps',
      'Code reviews and mentoring',
      'Process improvement',
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Complete Development Services
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              From AI-powered development to infrastructure engineering, we cover
              the full spectrum of modern software delivery. All with the 10x
              advantage.
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="pb-20 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {services.map((service, index) => {
              const Icon = service.icon;
              const isEven = index % 2 === 0;
              return (
                <div
                  key={service.id}
                  className={`grid items-center gap-12 lg:grid-cols-2 ${
                    isEven ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={isEven ? '' : 'lg:order-2'}>
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                      {service.name}
                    </h2>
                    <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
                      {service.description}
                    </p>
                    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <Link href="/contact">
                        <Button>
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div
                    className={`rounded-2xl bg-gradient-to-br from-primary/5 to-accent-purple/5 p-8 ${
                      isEven ? 'lg:order-2' : ''
                    }`}
                  >
                    <Card variant="bordered">
                      <CardHeader>
                        <CardTitle as="h3">Why Choose Us</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-4">
                          <li className="flex items-start gap-3">
                            <span className="font-semibold text-primary">4x</span>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Faster delivery than traditional teams
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="font-semibold text-primary">75%</span>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Cost reduction through AI efficiency
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="font-semibold text-primary">10x</span>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Developer productivity with AI tools
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
