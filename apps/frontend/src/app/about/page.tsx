import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about tenxdev.ai - the AI-powered software development company delivering 10x results.',
};

const values = [
  {
    title: 'AI-First Approach',
    description:
      'We embrace AI as a core part of our development process, not just a buzzword. Every project benefits from AI-enhanced productivity.',
  },
  {
    title: 'Quality Over Speed',
    description:
      'While we deliver 4x faster, we never compromise on quality. AI helps us catch issues early and maintain high standards.',
  },
  {
    title: 'Transparency',
    description:
      'Clear communication, honest estimates, and regular updates. You always know where your project stands.',
  },
  {
    title: 'Continuous Learning',
    description:
      'Technology evolves rapidly. We stay ahead by continuously learning and adopting best practices.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              About tenxdev
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
              We're a team of AI-augmented developers and infrastructure engineers
              who believe software development should be faster, more efficient,
              and more accessible.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-neutral-50 py-20 dark:bg-neutral-900/50 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
                Our Mission
              </h2>
              <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
                We're on a mission to democratize high-quality software development.
                By combining expert human judgment with AI-powered tools, we deliver
                enterprise-grade solutions at a fraction of the traditional cost and
                time.
              </p>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
                The "10x developer" has always been a rare find. We believe AI
                amplifies every developer's capabilities, making 10x productivity
                achievable for any skilled engineer.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary to-accent-purple p-8 text-white">
              <h3 className="text-2xl font-bold">The 10x Promise</h3>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold">4x</span>
                  <span className="text-white/80">
                    Faster delivery through AI-accelerated development
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold">75%</span>
                  <span className="text-white/80">
                    Cost reduction with smaller, more efficient teams
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold">10x</span>
                  <span className="text-white/80">
                    Developer productivity with AI-powered tooling
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              Our Values
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              The principles that guide everything we do.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border border-border-light bg-surface-light p-8 dark:border-border-dark dark:bg-surface-dark"
              >
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {value.title}
                </h3>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Work with Us?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Let's discuss how we can help accelerate your next project.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-neutral-100"
                >
                  Get in Touch
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
