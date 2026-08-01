import { motion } from 'framer-motion';
import { levelStyle, cn } from '@/lib/utils';
import { NumberTicker } from '@/components/magic/number-ticker';

const LABELS = { none: 'Safe', low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

/** Radial severity dial. `size` is the outer diameter in px. */
export function SeverityGauge({ score = 0, level = 'none', size = 168, className }) {
  const style = levelStyle(level);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Severity ${clamped} out of 100, assessed as ${LABELS[level] ?? level}`}
      >
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--secondary)" strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={style.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tabular-nums', style.text)}>
          <NumberTicker value={clamped} />
        </span>
        <span className={cn('mt-0.5 text-xs font-semibold uppercase tracking-widest', style.text)}>
          {LABELS[level] ?? level}
        </span>
      </div>
    </div>
  );
}
