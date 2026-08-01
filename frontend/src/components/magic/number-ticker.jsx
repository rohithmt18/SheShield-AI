import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Magic UI-style number ticker — counts up to `value` when scrolled into view.
 * `aria-live` is off deliberately; the final value is what matters, and an
 * announcement per frame would flood a screen reader.
 */
export function NumberTicker({ value = 0, duration = 1.1, decimals = 0, className, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}
