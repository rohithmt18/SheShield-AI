import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm',
      'placeholder:text-muted-foreground focus-visible:border-ring scrollbar-thin',
      'disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
