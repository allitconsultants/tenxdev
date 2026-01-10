import {
  Users,
  Cpu,
  ClipboardList,
  FileSignature,
  Rocket,
  CheckCircle2,
} from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Discovery Call',
    description:
      'Meet with our team to discuss your vision, goals, and requirements.',
    icon: Users,
  },
  {
    number: '02',
    title: 'Tech Strategy',
    description:
      'We design the optimal technology stack tailored to your needs.',
    icon: Cpu,
  },
  {
    number: '03',
    title: 'Project Planning',
    description:
      'Define milestones, timelines, and deliverables with full transparency.',
    icon: ClipboardList,
  },
  {
    number: '04',
    title: 'Agreement',
    description:
      'Review and sign the contract with clear terms and expectations.',
    icon: FileSignature,
  },
  {
    number: '05',
    title: 'Development',
    description:
      'Our 10x team builds your solution with AI-powered efficiency.',
    icon: Rocket,
  },
  {
    number: '06',
    title: 'Delivery',
    description:
      'Launch your project with documentation, training, and support.',
    icon: CheckCircle2,
  },
];

export function Process() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            How We Work
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            A streamlined process designed to get you from idea to launch as
            quickly as possible.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16">
          {/* Connection Line - Desktop */}
          <div className="absolute left-0 right-0 top-[60px] hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative text-center">
                  {/* Step Number Badge */}
                  <div className="relative mx-auto mb-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/25 transition-transform duration-300 hover:scale-110">
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-cyan text-xs font-bold text-neutral-900">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {step.description}
                  </p>

                  {/* Arrow - Mobile/Tablet */}
                  {index < steps.length - 1 && (
                    <div className="mx-auto mt-6 h-8 w-0.5 bg-primary/30 lg:hidden" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            Ready to start your project?{' '}
            <a
              href="/contact"
              className="font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              Schedule a discovery call →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
