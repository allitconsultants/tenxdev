import Link from 'next/link';
import {
  Sparkles,
  Server,
  GitBranch,
  Cloud,
  Layers,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

const iconMap = {
  Sparkles,
  Server,
  GitBranch,
  Cloud,
  Layers,
  GraduationCap,
};

const services = [
  {
    id: 'ai-development',
    name: 'AI-Powered Development',
    description:
      'Leverage AI to accelerate development cycles, improve code quality, and reduce time to market.',
    icon: 'Sparkles',
    features: [
      'AI-assisted code generation',
      'Automated testing and review',
      'Intelligent refactoring',
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Engineering',
    description:
      'Build robust, scalable infrastructure using Infrastructure as Code and cloud-native technologies.',
    icon: 'Server',
    features: [
      'Terraform & Pulumi',
      'Kubernetes orchestration',
      'Multi-cloud architecture',
    ],
  },
  {
    id: 'devops',
    name: 'DevOps Automation',
    description:
      'Streamline your development workflow with modern CI/CD pipelines and automation.',
    icon: 'GitBranch',
    features: [
      'CI/CD pipeline design',
      'GitOps workflows',
      'Release automation',
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud Architecture',
    description:
      'Design and implement cloud solutions across AWS, Azure, and GCP.',
    icon: 'Cloud',
    features: [
      'AWS, Azure, GCP expertise',
      'Serverless architectures',
      'Security best practices',
    ],
  },
  {
    id: 'platform',
    name: 'Platform Engineering',
    description:
      'Build internal developer platforms that boost productivity and standardize workflows.',
    icon: 'Layers',
    features: [
      'Developer portals',
      'Self-service platforms',
      'Golden paths',
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting & Training',
    description:
      'Expert guidance and hands-on training to upskill your team.',
    icon: 'GraduationCap',
    features: [
      'Architecture reviews',
      'Team training',
      'Technology roadmaps',
    ],
  },
];

export function Services() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Complete Development Services
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            From AI-powered development to infrastructure engineering, we cover
            the full spectrum of modern software delivery.
          </p>
        </div>

        {/* Services Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap];
            return (
              <Card key={service.id} variant="bordered" hover>
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{service.name}</CardTitle>
                </CardHeader>
                <CardDescription className="mb-4">
                  {service.description}
                </CardDescription>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/services/${service.id}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary-dark"
                  >
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
