import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { NativeSelect };
