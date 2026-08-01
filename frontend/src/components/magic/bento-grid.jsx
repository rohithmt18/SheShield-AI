import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Magic UI-style bento grid with a hover lift and an entrance stagger. */
export function BentoGrid({ className, children }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export function BentoCard({ title, description, icon: Icon, className, index = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card p-6',
        'transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative">
        {Icon ? (
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Icon className="size-5" />
          </div>
        ) : null}
        <h3 className="mb-1.5 font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </div>
    </motion.div>
  );
}
