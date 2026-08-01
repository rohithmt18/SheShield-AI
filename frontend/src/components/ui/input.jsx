import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm',
      'placeholder:text-muted-foreground focus-visible:border-ring',
      'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
