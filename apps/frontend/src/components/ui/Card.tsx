import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'gradient';
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  hover = false,
}: CardProps) {
  const baseStyles = 'rounded-xl p-6';

  const variants = {
    default: 'bg-surface-light dark:bg-surface-dark',
    bordered:
      'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark',
    gradient:
      'bg-gradient-to-br from-surface-light to-neutral-100 dark:from-surface-dark dark:to-neutral-900 border border-border-light dark:border-border-dark',
  };

  const hoverStyles = hover ? 'card-hover cursor-pointer' : '';

  return (
    <div className={cn(baseStyles, variants[variant], hoverStyles, className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h2' | 'h3' | 'h4';
}

export function CardTitle({
  children,
  className,
  as: Component = 'h3',
}: CardTitleProps) {
  return (
    <Component
      className={cn('text-xl font-semibold text-neutral-900 dark:text-neutral-100', className)}
    >
      {children}
    </Component>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-neutral-600 dark:text-neutral-400', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return <div className={cn('mt-4 pt-4 border-t', className)}>{children}</div>;
}
