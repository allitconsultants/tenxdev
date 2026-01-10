import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Server,
  GitBranch,
  Cloud,
  Layers,
  GraduationCap,
  ArrowRight,
  Check,
  Container,
  Boxes,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

const openSourceTools = [
  // Container & Orchestration
  { name: 'Kubernetes', icon: '/icons/kubernetes.svg' },
  { name: 'Docker', icon: '/icons/docker.svg' },
  { name: 'Helm', icon: '/icons/helm.svg' },
  { name: 'Rancher', icon: '/icons/rancher.svg' },
  // Infrastructure & IaC
  { name: 'Terraform', icon: '/icons/terraform.svg' },
  { name: 'Ansible', icon: '/icons/ansible.svg' },
  { name: 'Vault', icon: '/icons/vault.svg' },
  { name: 'Linux', icon: '/icons/linux.svg' },
  // Databases
  { name: 'PostgreSQL', icon: '/icons/postgresql.svg' },
  { name: 'MySQL', icon: '/icons/mysql.svg' },
  { name: 'MongoDB', icon: '/icons/mongodb.svg' },
  { name: 'Redis', icon: '/icons/redis.svg' },
  // Messaging & Streaming
  { name: 'Kafka', icon: '/icons/kafka.svg' },
  { name: 'RabbitMQ', icon: '/icons/rabbitmq.svg' },
  // Observability
  { name: 'Prometheus', icon: '/icons/prometheus.svg' },
  { name: 'Grafana', icon: '/icons/grafana.svg' },
  { name: 'Jaeger', icon: '/icons/jaeger.svg' },
  { name: 'OpenTelemetry', icon: '/icons/opentelemetry.svg' },
  // Networking & Proxy
  { name: 'Nginx', icon: '/icons/nginx.svg' },
  { name: 'Traefik', icon: '/icons/traefik.svg' },
  { name: 'Istio', icon: '/icons/istio.svg' },
  { name: 'Envoy', icon: '/icons/envoy.svg' },
  // CI/CD & DevOps
  { name: 'GitLab', icon: '/icons/gitlab.svg' },
  { name: 'Jenkins', icon: '/icons/jenkins.svg' },
  { name: 'ArgoCD', icon: '/icons/argocd.svg' },
  { name: 'GitHub Actions', icon: '/icons/githubactions.svg' },
  // Languages & Runtimes
  { name: 'Node.js', icon: '/icons/nodejs.svg' },
  { name: 'Python', icon: '/icons/python.svg' },
  { name: 'Go', icon: '/icons/go.svg' },
  { name: 'TypeScript', icon: '/icons/typescript.svg' },
  // Frameworks
  { name: 'React', icon: '/icons/react.svg' },
  { name: 'Next.js', icon: '/icons/nextjs.svg' },
];

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

      {/* Open Source & Containers */}
      <section className="pb-20 sm:pb-32 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="mb-6 inline-flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Container className="h-6 w-6" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
                <Boxes className="h-6 w-6" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Built on Open Source & Cloud-Native
            </h2>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              We prioritize battle-tested open source solutions, running everything in
              <span className="font-semibold text-primary"> containers </span>
              with a
              <span className="font-semibold text-primary"> microservices architecture</span>.
              This means no vendor lock-in, maximum flexibility, and access to the world&apos;s
              largest developer ecosystem.
            </p>
          </div>

          {/* Tech Icons Grid */}
          <div className="grid grid-cols-4 gap-6 sm:grid-cols-8 md:gap-8">
            {openSourceTools.map((tool) => (
              <div
                key={tool.name}
                className="group flex flex-col items-center gap-2"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100 p-3 transition-all duration-200 group-hover:bg-primary/10 group-hover:scale-110 dark:bg-neutral-800">
                  <Image
                    src={tool.icon}
                    alt={tool.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain dark:brightness-110"
                  />
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  {tool.name}
                </span>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <Card variant="bordered">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">No Vendor Lock-in</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Open source means you own your stack. Migrate anywhere, anytime.
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                  <Container className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Container-First</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Everything runs in containers for consistency from dev to production.
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Microservices</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Scalable, maintainable architecture that grows with your business.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 sm:py-32">
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
