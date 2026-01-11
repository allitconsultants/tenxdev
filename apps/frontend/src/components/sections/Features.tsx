import {
  Shield,
  Database,
  Cpu,
  Globe,
  Lock,
  Zap,
} from 'lucide-react';

const features = [
  {
    name: 'Enterprise SSO',
    description:
      'Integrate with Okta, Azure AD, Google Workspace, or any SAML/OIDC provider. Your users get seamless authentication from day one.',
    icon: Shield,
  },
  {
    name: 'Regional Databases',
    description:
      'Data residency compliance built-in. Deploy databases in any region with automatic sync and failover for global availability.',
    icon: Database,
  },
  {
    name: 'AI Components',
    description:
      'Pre-built AI features: document processing, intelligent search, chatbots, and custom LLM integrations using OpenAI, Anthropic, or your choice.',
    icon: Cpu,
  },
  {
    name: 'Global CDN',
    description:
      'Your app is fast everywhere. We deploy to edge locations worldwide for sub-100ms response times.',
    icon: Globe,
  },
  {
    name: 'Security First',
    description:
      'SOC 2 ready architecture, encrypted at rest and in transit, automated vulnerability scanning, and audit logs.',
    icon: Lock,
  },
  {
    name: 'Managed Infrastructure',
    description:
      'We handle servers, scaling, updates, and monitoring. You focus on your business, we keep it running.',
    icon: Zap,
  },
];

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Enterprise Features, Built In
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            Every app we build comes with the features enterprise customers expect.
            No add-ons, no extra costs.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.name}
                className="relative rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {feature.name}
                </h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
