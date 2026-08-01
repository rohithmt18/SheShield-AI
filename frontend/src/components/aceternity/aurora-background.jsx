import { cn } from '@/lib/utils';

/**
 * Aceternity-style aurora backdrop — layered, blurred colour blobs drifting
 * behind the content. Purely decorative, so it is hidden from assistive tech
 * and stops moving under prefers-reduced-motion (handled globally in index.css).
 */
export function AuroraBackground({ className, children, ...props }) {
  return (
    <div className={cn('relative isolate overflow-hidden', className)} {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-1/4 top-[-20%] size-[38rem] rounded-full bg-primary/25 blur-[120px] animate-aurora" />
        <div
          className="absolute right-[-15%] top-[10%] size-[32rem] rounded-full bg-fuchsia-500/20 blur-[120px] animate-aurora"
          style={{ animationDelay: '-7s' }}
        />
        <div
          className="absolute bottom-[-25%] left-1/3 size-[34rem] rounded-full bg-violet-500/20 blur-[130px] animate-aurora"
          style={{ animationDelay: '-14s' }}
        />
        {/* Grid overlay, faded out toward the edges. */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border) 1px, transparent 1px),'
              + 'linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
          }}
        />
      </div>
      {children}
    </div>
  );
}
