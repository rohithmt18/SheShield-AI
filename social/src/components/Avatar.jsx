import { cn } from '@/lib/utils';

export function Avatar({ handle, gradient, size = 'md', className }) {
  const sizes = { sm: 'size-7 text-[10px]', md: 'size-9 text-xs', lg: 'size-12 text-sm' };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white/90',
        sizes[size], className,
      )}
      style={{ backgroundImage: gradient }}
      aria-hidden
    >
      {handle?.slice(0, 2).toUpperCase()}
    </span>
  );
}
