import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Industries We Serve',
  description: 'Custom web and mobile applications for businesses across 20+ industries. From pool companies to healthcare, we build software that transforms how you work.',
};

const industries = [
  {
    id: 'pool-services',
    name: 'Pool Services',
    icon: '🏊',
    description: 'Route optimization, water testing logs, chemical tracking, customer portals, and recurring service scheduling.',
    solutions: ['Service scheduling app', 'Customer portal', 'Chemical tracking', 'Route optimization'],
  },
  {
    id: 'hvac',
    name: 'HVAC & Heating',
    icon: '❄️',
    description: 'Dispatch management, maintenance contracts, equipment tracking, and seasonal scheduling.',
    solutions: ['Technician dispatch', 'Maintenance scheduling', 'Equipment inventory', 'Customer estimates'],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Services',
    icon: '🔧',
    description: 'Job dispatch, invoicing, parts inventory, and emergency call management.',
    solutions: ['Emergency dispatch', 'Mobile invoicing', 'Parts tracking', 'Customer history'],
  },
  {
    id: 'landscaping',
    name: 'Landscaping & Lawn Care',
    icon: '🌳',
    description: 'Project management, crew scheduling, property tracking, and seasonal service plans.',
    solutions: ['Crew scheduling', 'Property management', 'Before/after photos', 'Seasonal contracts'],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: '🏠',
    description: 'Property listings, CRM, showing scheduling, document management, and client portals.',
    solutions: ['Listing management', 'Showing scheduler', 'Document e-signing', 'Lead tracking'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Clinics',
    icon: '🏥',
    description: 'Patient portals, appointment scheduling, telehealth, and HIPAA-compliant record management.',
    solutions: ['Patient portal', 'Appointment booking', 'Telehealth platform', 'Secure messaging'],
  },
  {
    id: 'fitness',
    name: 'Fitness & Gyms',
    icon: '💪',
    description: 'Membership management, class booking, trainer scheduling, and workout tracking.',
    solutions: ['Member app', 'Class booking', 'Trainer matching', 'Progress tracking'],
  },
  {
    id: 'restaurants',
    name: 'Restaurants & Food',
    icon: '🍽️',
    description: 'Online ordering, table reservations, kitchen displays, and delivery management.',
    solutions: ['Online ordering', 'Reservation system', 'Kitchen display', 'Loyalty program'],
  },
  {
    id: 'legal',
    name: 'Legal Services',
    icon: '⚖️',
    description: 'Case management, client portals, document management, and billing automation.',
    solutions: ['Case management', 'Client portal', 'Time tracking', 'Document automation'],
  },
  {
    id: 'construction',
    name: 'Construction',
    icon: '🏗️',
    description: 'Project tracking, contractor management, bid management, and safety compliance.',
    solutions: ['Project management', 'Subcontractor portal', 'Bid tracking', 'Safety checklists'],
  },
  {
    id: 'automotive',
    name: 'Automotive & Dealerships',
    icon: '🚗',
    description: 'Inventory management, service scheduling, customer CRM, and sales tracking.',
    solutions: ['Inventory system', 'Service booking', 'Sales CRM', 'Vehicle history'],
  },
  {
    id: 'education',
    name: 'Education & Tutoring',
    icon: '📚',
    description: 'Learning management, student tracking, scheduling, and progress reporting.',
    solutions: ['Learning platform', 'Tutor matching', 'Progress tracking', 'Parent portal'],
  },
  {
    id: 'pet-services',
    name: 'Pet Services',
    icon: '🐕',
    description: 'Grooming appointments, boarding reservations, pet profiles, and vet record tracking.',
    solutions: ['Booking system', 'Pet profiles', 'Vaccination tracking', 'Daycare management'],
  },
  {
    id: 'cleaning',
    name: 'Cleaning Services',
    icon: '🧹',
    description: 'Staff scheduling, job tracking, quality checklists, and customer feedback.',
    solutions: ['Staff scheduling', 'Job checklists', 'Quality tracking', 'Customer app'],
  },
  {
    id: 'moving',
    name: 'Moving Companies',
    icon: '📦',
    description: 'Quote calculators, scheduling, inventory tracking, and real-time move tracking.',
    solutions: ['Online quotes', 'Move scheduler', 'Inventory app', 'GPS tracking'],
  },
  {
    id: 'events',
    name: 'Event Planning',
    icon: '🎉',
    description: 'Venue booking, vendor management, guest lists, and event timelines.',
    solutions: ['Venue marketplace', 'Vendor management', 'Guest RSVP', 'Event timeline'],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    icon: '🛡️',
    description: 'Claims processing, agent portals, policy management, and customer self-service.',
    solutions: ['Claims portal', 'Agent dashboard', 'Policy management', 'Quote engine'],
  },
  {
    id: 'logistics',
    name: 'Logistics & Delivery',
    icon: '🚚',
    description: 'Fleet management, route optimization, package tracking, and driver apps.',
    solutions: ['Fleet tracking', 'Route optimization', 'Driver app', 'Customer tracking'],
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    icon: '🌾',
    description: 'Crop management, equipment tracking, weather integration, and yield analysis.',
    solutions: ['Crop tracking', 'Equipment management', 'Weather alerts', 'Harvest planning'],
  },
  {
    id: 'nonprofit',
    name: 'Nonprofits & Charities',
    icon: '❤️',
    description: 'Donor management, volunteer coordination, event registration, and impact reporting.',
    solutions: ['Donor CRM', 'Volunteer portal', 'Donation platform', 'Impact dashboard'],
  },
];

export default function IndustriesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="primary" className="mb-6">20+ Industries</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Software for Every Industry
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              We build custom web and mobile applications that transform how
              businesses operate. From service companies to healthcare, we
              understand your industry's unique challenges.
            </p>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="pb-20 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {industries.map((industry) => (
              <Card
                key={industry.id}
                variant="bordered"
                hover
                className="flex flex-col h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="text-4xl mb-4">{industry.icon}</div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {industry.name}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 flex-grow">
                    {industry.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {industry.solutions.slice(0, 2).map((solution) => (
                      <span
                        key={solution}
                        className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {solution}
                      </span>
                    ))}
                    {industry.solutions.length > 2 && (
                      <span className="inline-block rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
                        +{industry.solutions.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              How We Build for Your Industry
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              We take time to understand your specific workflows, pain points,
              and goals before writing a single line of code.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Understand Your Business
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                We learn your industry, talk to your team, and map out your
                current workflows and pain points.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Design the Solution
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                We design software that fits how you work — not the other way
                around. You'll see mockups before we build.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Build & Launch Fast
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Our 10x development approach means you get a working product in
                weeks, not months.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Don't See Your Industry */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border-light dark:border-border-dark p-8 sm:p-12 text-center">
            <div className="text-4xl mb-4">🤔</div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              Don't See Your Industry?
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              These are just examples. We've built software for dozens of
              industries and can adapt to any business. If you have a workflow
              that needs to be digitized, we can help.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  Tell Us About Your Business
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary to-accent-purple">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to Transform Your Business?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
              Book a free call to discuss how custom software can streamline
              your operations and delight your customers.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-neutral-100"
                >
                  Book Free Consultation
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
