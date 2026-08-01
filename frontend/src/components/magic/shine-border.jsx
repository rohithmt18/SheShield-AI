import { cn } from '@/lib/utils';

/**
 * Magic UI-style animated gradient border. The shine is a conic gradient on a
 * masked pseudo-layer, so it never affects layout or hit-testing.
 */
export function ShineBorder({ className, children, color = 'var(--primary)', duration = 8 }) {
  return (
    <div className={cn('relative rounded-lg p-px', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70"
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, ${color} 12%, transparent 30%)`,
          animation: `shine-spin ${duration}s linear infinite`,
        }}
      />
      <div className="relative h-full w-full rounded-[inherit] bg-card">{children}</div>
    </div>
  );
}
