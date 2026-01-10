import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium';

  const variants = {
    default:
      'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
    primary: 'bg-primary/10 text-primary dark:bg-primary/20',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)}>
      {children}
    </span>
  );
}
