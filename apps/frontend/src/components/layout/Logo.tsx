import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          10x
        </span>
        <span className="ml-2 text-xl font-bold text-neutral-900 dark:text-white">
          tenxdev
        </span>
      </div>
    </Link>
  );
}
