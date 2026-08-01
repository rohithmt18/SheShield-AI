import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        none: 'border-level-none/30 bg-level-none/12 text-level-none',
        low: 'border-level-low/30 bg-level-low/12 text-level-low',
        medium: 'border-level-medium/30 bg-level-medium/12 text-level-medium',
        high: 'border-level-high/30 bg-level-high/12 text-level-high',
        critical: 'border-level-critical/40 bg-level-critical/15 text-level-critical',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
