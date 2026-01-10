import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export function CTA() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 sm:px-16 sm:py-24">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-accent-cyan/20 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to 10x Your Development?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
              Let's discuss how our AI-powered team can deliver your next
              project faster and more cost-effectively.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="w-full bg-white text-primary hover:bg-neutral-100 sm:w-auto"
                >
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-white hover:bg-white/10 sm:w-auto"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
