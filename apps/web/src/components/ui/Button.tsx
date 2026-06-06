import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30',
    secondary: 'glass text-[rgb(var(--color-text))] hover:bg-brand-500/10 hover:border-brand-500/30',
    ghost: 'text-secondary hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-text)_/_0.05)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2
                 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]
                 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin mr-2" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
