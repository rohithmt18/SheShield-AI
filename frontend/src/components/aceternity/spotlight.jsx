import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Aceternity-style cursor spotlight — a soft radial glow that follows the
 * pointer across the container. Disabled on touch and for reduced-motion.
 */
export function Spotlight({ className, children, size = 420 }) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(fine && !still);
  }, []);

  if (!enabled) return <div className={cn('relative', className)}>{children}</div>;

  return (
    <div
      ref={ref}
      className={cn('group relative', className)}
      onPointerMove={(event) => {
        const rect = ref.current.getBoundingClientRect();
        setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      onPointerLeave={() => setPosition(null)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: position
            ? `radial-gradient(${size}px circle at ${position.x}px ${position.y}px,`
              + ' color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)'
            : undefined,
        }}
      />
      {children}
    </div>
  );
}
