import type { Metadata } from 'next';
import { ContactForm } from '@/components/forms/ContactForm';
import { Mail, Phone, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with tenxdev.ai to discuss your project needs.',
};

export default function ContactPage() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            Let's Build Something Great
          </h1>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            Ready to accelerate your development? Get in touch and we'll respond
            within 24 hours.
          </p>
        </div>

        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          {/* Contact Form */}
          <div className="rounded-2xl border border-border-light bg-surface-light p-8 dark:border-border-dark dark:bg-surface-dark">
            <ContactForm />
          </div>

          {/* Contact Info */}
          <div className="flex flex-col justify-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Get in Touch
                </h2>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                  We'd love to hear about your project. Fill out the form or
                  reach out directly.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Email
                    </h3>
                    <a
                      href="mailto:hello@tenxdev.ai"
                      className="text-neutral-600 transition-colors hover:text-primary dark:text-neutral-400"
                    >
                      hello@tenxdev.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Phone
                    </h3>
                    <a
                      href="tel:+1-555-123-4567"
                      className="text-neutral-600 transition-colors hover:text-primary dark:text-neutral-400"
                    >
                      +1 (555) 123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Location
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Remote-first, Global Team
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 p-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Typical Response Time
                </h3>
                <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                  We respond to all inquiries within 24 hours during business
                  days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
