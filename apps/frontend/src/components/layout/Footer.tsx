import Link from 'next/link';
import { Github, Linkedin, Twitter } from 'lucide-react';
import { Logo } from './Logo';
import { navigation, siteConfig } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-neutral-600 dark:text-neutral-400">
              AI-powered software development. 10x developers delivering
              projects in 1/4 the time at 1/4 the cost.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href={siteConfig.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {navigation.footer.services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {navigation.footer.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {navigation.footer.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border-light pt-8 dark:border-border-dark">
          <p className="text-center text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} tenxdev.ai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
