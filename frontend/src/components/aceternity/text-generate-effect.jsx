import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Aceternity-style staggered word reveal.
 *
 * The full string is rendered in one element for screen readers, and the
 * animated copy is hidden from them — otherwise the sentence is announced
 * word by word, which is miserable to listen to.
 */
export function TextGenerateEffect({ words, className, delay = 0, stagger = 0.055 }) {
  const list = String(words ?? '').split(' ');

  return (
    <span className={cn('inline', className)}>
      <span className="sr-only">{words}</span>
      <span aria-hidden className="inline">
        {list.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: delay + i * stagger, ease: 'easeOut' }}
          >
            {word}
            {i < list.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
