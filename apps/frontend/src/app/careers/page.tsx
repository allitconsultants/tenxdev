import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  Code,
  TestTube,
  Server,
  ArrowRight,
  Check,
  Shield,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { JobApplicationForm } from '@/components/forms/JobApplicationForm';

export const metadata: Metadata = {
  title: 'Careers | TenxDev - Join Our Team',
  description:
    'Join TenxDev and help build enterprise applications with AI, SSO, and cloud infrastructure. Remote positions for US-based developers, QA engineers, and DevOps specialists.',
};

const benefits = [
  'Competitive salary + equity',
  '100% remote work',
  'Unlimited PTO',
  'Health, dental, vision insurance',
  '401(k) with company match',
  'Home office stipend',
  'Professional development budget',
  'Flexible working hours',
];

const values = [
  {
    title: 'Build with AI',
    description: 'We use AI to 10x our productivity. You\'ll work with cutting-edge tools daily.',
  },
  {
    title: 'Ship Fast',
    description: 'We believe in rapid iteration. Deploy to production multiple times per day.',
  },
  {
    title: 'Own Your Work',
    description: 'High autonomy, high accountability. Make decisions and see impact immediately.',
  },
  {
    title: 'Remote-First',
    description: 'Work from anywhere in the US. We communicate async-first with deep work blocks.',
  },
];

interface Job {
  id: string;
  title: string;
  department: 'Engineering' | 'QA' | 'DevOps';
  type: 'Full-time';
  location: 'Remote (US)';
  salary: string;
  icon: typeof Code;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

const jobs: Job[] = [
  // Senior Developers
  {
    id: 'senior-fullstack-engineer',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$150,000 - $200,000',
    icon: Code,
    description:
      'Build enterprise applications from database to UI. You\'ll work on complex SaaS products with SSO integration, AI features, and multi-region deployments.',
    responsibilities: [
      'Design and implement full-stack features using TypeScript, React, and Node.js',
      'Integrate enterprise SSO providers (Okta, Azure AD, SAML)',
      'Build and optimize PostgreSQL databases with Drizzle ORM',
      'Implement AI-powered features using OpenAI and Anthropic APIs',
      'Deploy applications to Kubernetes on GCP/AWS',
      'Mentor junior developers and conduct code reviews',
    ],
    requirements: [
      '5+ years of professional software development experience',
      'Expert-level TypeScript and React/Next.js skills',
      'Strong backend experience with Node.js and PostgreSQL',
      'Experience with cloud platforms (AWS, GCP, or Azure)',
      'Understanding of authentication/authorization patterns',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with Kubernetes and container orchestration',
      'Background in enterprise SaaS or B2B products',
      'Familiarity with AI/ML integrations',
      'Open source contributions',
    ],
  },
  {
    id: 'frontend-engineer',
    title: 'Frontend Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$120,000 - $160,000',
    icon: Code,
    description:
      'Create beautiful, performant user interfaces for enterprise applications. You\'ll focus on React/Next.js with an emphasis on accessibility and design systems.',
    responsibilities: [
      'Build responsive, accessible UIs with React and Tailwind CSS',
      'Implement complex form workflows and data visualizations',
      'Optimize Core Web Vitals and application performance',
      'Collaborate with design on component library development',
      'Write comprehensive unit and integration tests',
      'Contribute to technical documentation',
    ],
    requirements: [
      '3+ years of professional frontend development experience',
      'Expert-level React and TypeScript skills',
      'Strong CSS skills including Tailwind CSS',
      'Experience with Next.js App Router and Server Components',
      'Understanding of web accessibility (WCAG)',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with design systems and Storybook',
      'Background in data visualization (D3, Chart.js)',
      'Familiarity with Figma and design tools',
      'Animation experience (Framer Motion)',
    ],
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$130,000 - $180,000',
    icon: Code,
    description:
      'Design and build scalable APIs and services. You\'ll work on authentication systems, data pipelines, and integrations with enterprise systems.',
    responsibilities: [
      'Design and implement RESTful APIs with Hono/Express',
      'Build secure authentication flows with OAuth2/OIDC',
      'Optimize database queries and design schemas',
      'Implement message queues and background job processing',
      'Integrate with third-party APIs and enterprise systems',
      'Ensure API security and implement rate limiting',
    ],
    requirements: [
      '4+ years of backend development experience',
      'Expert-level Node.js and TypeScript skills',
      'Strong PostgreSQL and database design experience',
      'Understanding of OAuth2, OIDC, and SAML protocols',
      'Experience with Redis, message queues, and caching',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with GraphQL',
      'Background in enterprise integrations',
      'Familiarity with event-driven architectures',
      'Security certifications or security-focused background',
    ],
  },
  // QA Automation
  {
    id: 'senior-qa-automation-engineer',
    title: 'Senior QA Automation Engineer',
    department: 'QA',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$130,000 - $170,000',
    icon: TestTube,
    description:
      'Lead our test automation efforts. You\'ll build and maintain comprehensive test suites that ensure our enterprise applications meet the highest quality standards.',
    responsibilities: [
      'Design and implement end-to-end test automation frameworks',
      'Build API test suites using TypeScript and Playwright',
      'Create CI/CD integration for automated test execution',
      'Develop performance and load testing strategies',
      'Establish QA best practices and testing standards',
      'Mentor QA team members on automation techniques',
    ],
    requirements: [
      '5+ years of QA experience with 3+ years in automation',
      'Expert-level Playwright or Cypress skills',
      'Strong TypeScript/JavaScript programming abilities',
      'Experience with API testing (REST, GraphQL)',
      'Understanding of CI/CD pipelines (GitHub Actions)',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with performance testing (k6, Artillery)',
      'Background in accessibility testing',
      'Security testing experience (OWASP)',
      'ISTQB or similar QA certifications',
    ],
  },
  {
    id: 'qa-automation-engineer',
    title: 'QA Automation Engineer',
    department: 'QA',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$100,000 - $140,000',
    icon: TestTube,
    description:
      'Build automated tests that catch bugs before they reach production. You\'ll work closely with developers to ensure high-quality releases.',
    responsibilities: [
      'Write and maintain automated E2E tests with Playwright',
      'Create comprehensive API test coverage',
      'Participate in test planning and requirements review',
      'Investigate and document bug reports',
      'Maintain test data and test environments',
      'Report on test metrics and quality trends',
    ],
    requirements: [
      '2+ years of QA automation experience',
      'Proficient with Playwright, Cypress, or Selenium',
      'JavaScript/TypeScript programming skills',
      'Experience with Git and version control workflows',
      'Strong analytical and problem-solving skills',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with mobile app testing',
      'Background in Agile/Scrum environments',
      'Familiarity with Docker and containers',
      'Database testing experience',
    ],
  },
  {
    id: 'qa-engineer-api',
    title: 'QA Engineer - API Testing',
    department: 'QA',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$110,000 - $150,000',
    icon: TestTube,
    description:
      'Specialize in API testing and integration validation. You\'ll ensure our backend services and third-party integrations work flawlessly.',
    responsibilities: [
      'Design and execute API test strategies',
      'Build automated API test suites with Postman/Newman',
      'Validate SSO and authentication flows',
      'Test webhook integrations and event handling',
      'Perform contract testing for microservices',
      'Document API behaviors and edge cases',
    ],
    requirements: [
      '3+ years of API testing experience',
      'Strong understanding of REST APIs and HTTP protocols',
      'Experience with Postman, Newman, or similar tools',
      'Ability to write test scripts in JavaScript/TypeScript',
      'Understanding of OAuth2 and authentication flows',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with GraphQL testing',
      'Background in microservices architecture',
      'Familiarity with OpenAPI/Swagger specifications',
      'Performance testing experience',
    ],
  },
  // DevOps
  {
    id: 'senior-devops-engineer',
    title: 'Senior DevOps Engineer',
    department: 'DevOps',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$160,000 - $200,000',
    icon: Server,
    description:
      'Lead our infrastructure and deployment automation. You\'ll architect and maintain the platforms that power our enterprise applications.',
    responsibilities: [
      'Design and implement Kubernetes infrastructure on GCP/AWS',
      'Build and optimize CI/CD pipelines with GitHub Actions',
      'Implement Infrastructure as Code with Terraform/Pulumi',
      'Set up monitoring, alerting, and observability (Prometheus, Grafana)',
      'Manage secrets and security across environments',
      'Lead incident response and post-mortems',
    ],
    requirements: [
      '5+ years of DevOps/SRE experience',
      'Expert-level Kubernetes and container orchestration',
      'Strong Terraform or Pulumi skills',
      'Experience with GCP or AWS (certified preferred)',
      'Proficiency in scripting (Bash, Python)',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Kubernetes certifications (CKA, CKAD)',
      'Experience with service mesh (Istio, Linkerd)',
      'Background in multi-tenant SaaS platforms',
      'Security certifications (AWS Security, GCP Security)',
    ],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    department: 'DevOps',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$120,000 - $160,000',
    icon: Server,
    description:
      'Build and maintain the infrastructure that powers our applications. You\'ll work on automation, deployments, and reliability.',
    responsibilities: [
      'Manage Kubernetes clusters and deployments',
      'Build and maintain CI/CD pipelines',
      'Implement monitoring and alerting solutions',
      'Automate infrastructure provisioning with Terraform',
      'Troubleshoot production issues and incidents',
      'Document infrastructure and runbooks',
    ],
    requirements: [
      '3+ years of DevOps or infrastructure experience',
      'Experience with Kubernetes and Docker',
      'Familiarity with Terraform or similar IaC tools',
      'Understanding of networking and Linux systems',
      'Experience with CI/CD tools (GitHub Actions, Jenkins)',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Cloud certifications (AWS, GCP, Azure)',
      'Experience with GitOps (ArgoCD, Flux)',
      'Background in database administration',
      'Scripting skills (Python, Bash)',
    ],
  },
  {
    id: 'platform-engineer',
    title: 'Platform Engineer',
    department: 'DevOps',
    type: 'Full-time',
    location: 'Remote (US)',
    salary: '$140,000 - $180,000',
    icon: Server,
    description:
      'Build internal developer platforms that accelerate our engineering team. You\'ll create tools and abstractions that make developers more productive.',
    responsibilities: [
      'Design and build internal developer portals',
      'Create self-service infrastructure provisioning',
      'Build reusable Helm charts and Terraform modules',
      'Implement developer experience improvements',
      'Create documentation and developer guides',
      'Evaluate and integrate new platform tools',
    ],
    requirements: [
      '4+ years of platform or infrastructure engineering',
      'Strong Kubernetes and cloud platform experience',
      'Experience building developer tools and CLIs',
      'Proficiency in Go, Python, or TypeScript',
      'Understanding of GitOps and platform engineering principles',
      'US citizen residing in the United States',
    ],
    niceToHave: [
      'Experience with Backstage or similar portals',
      'Background in service catalogs and golden paths',
      'Familiarity with FinOps and cost optimization',
      'Open source project maintenance experience',
    ],
  },
];

const departmentIcons = {
  Engineering: Code,
  QA: TestTube,
  DevOps: Server,
};

const departmentColors = {
  Engineering: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  QA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DevOps: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function CareersPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Build the Future with Us
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              Join a team of exceptional engineers building enterprise applications
              with AI, modern infrastructure, and world-class developer experience.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <MapPin className="h-4 w-4" />
                Remote (US Only)
              </div>
              <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <Shield className="h-4 w-4" />
                US Citizens Only
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            Why Join TenxDev?
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="mx-auto mt-16 max-w-3xl">
            <h3 className="text-center text-xl font-semibold text-neutral-900 dark:text-white">
              Benefits & Perks
            </h3>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 sm:py-24" id="positions">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            Open Positions
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600 dark:text-neutral-400">
            All positions are remote within the United States. US citizenship required.
          </p>

          {/* Department Filter Tabs */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {(['All', 'Engineering', 'QA', 'DevOps'] as const).map((dept) => {
              const count =
                dept === 'All'
                  ? jobs.length
                  : jobs.filter((j) => j.department === dept).length;
              return (
                <a
                  key={dept}
                  href={dept === 'All' ? '#positions' : `#${dept.toLowerCase()}`}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-primary hover:text-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {dept} ({count})
                </a>
              );
            })}
          </div>

          {/* Job Listings by Department */}
          {(['Engineering', 'QA', 'DevOps'] as const).map((department) => {
            const departmentJobs = jobs.filter((j) => j.department === department);
            const DeptIcon = departmentIcons[department];
            return (
              <div key={department} id={department.toLowerCase()} className="mt-16">
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${departmentColors[department]}`}
                  >
                    <DeptIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {department}
                  </h3>
                </div>

                <div className="grid gap-6">
                  {departmentJobs.map((job) => (
                    <Card key={job.id} variant="bordered" className="overflow-hidden">
                      <div className="p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">
                              {job.title}
                            </h4>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {job.type}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {job.salary}
                              </span>
                            </div>
                          </div>
                          <a href={`#apply-${job.id}`}>
                            <Button size="sm">
                              Apply Now
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                        </div>

                        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
                          {job.description}
                        </p>

                        <details className="mt-4 group">
                          <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                            View full job description
                          </summary>
                          <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                            <div>
                              <h5 className="font-medium text-neutral-900 dark:text-white">
                                Responsibilities
                              </h5>
                              <ul className="mt-2 space-y-1">
                                {job.responsibilities.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-medium text-neutral-900 dark:text-white">
                                Requirements
                              </h5>
                              <ul className="mt-2 space-y-1">
                                {job.requirements.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                                  >
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-medium text-neutral-900 dark:text-white">
                                Nice to Have
                              </h5>
                              <ul className="mt-2 space-y-1">
                                {job.niceToHave.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </details>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Application Form */}
      <section
        className="border-t border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/50 sm:py-24"
        id="apply"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            Apply Now
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-600 dark:text-neutral-400">
            Submit your application and we'll get back to you within 5 business days.
            US citizenship and US residency required for all positions.
          </p>

          <div className="mt-12 rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <JobApplicationForm jobs={jobs.map((j) => ({ id: j.id, title: j.title }))} />
          </div>
        </div>
      </section>

      {/* Job-specific apply anchors */}
      {jobs.map((job) => (
        <div key={job.id} id={`apply-${job.id}`} className="hidden" />
      ))}
    </>
  );
}
