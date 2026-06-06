import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', size = 'sm', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium ${className} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      } ${variant === 'green' ? 'badge-green' : ''}
         ${variant === 'blue' ? 'badge-blue' : ''}
         ${variant === 'yellow' ? 'badge-yellow' : ''}
         ${variant === 'red' ? 'badge-red' : ''}
         ${variant === 'purple' ? 'badge-purple' : ''}
         ${variant === 'gray' ? 'bg-[rgb(var(--color-surface-alt))] text-secondary' : ''}`}
    >
      {children}
    </span>
  );
}
