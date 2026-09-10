import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-xs file:font-semibold file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
