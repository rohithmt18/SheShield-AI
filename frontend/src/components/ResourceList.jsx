import { Phone, ExternalLink, ShieldCheck, HeartPulse, Landmark, Scale, Users, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ICONS = {
  helpline: Phone,
  portal: ExternalLink,
  authority: Landmark,
  ngo: Users,
  takedown: ShieldCheck,
  'mental-health': HeartPulse,
  legal: Scale,
};

/**
 * `tel:` wants digits, not the spacing that makes a number readable.
 * The `+` is kept — dropping it breaks international dialling.
 */
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/**
 * One row of actions per entry.
 *
 * Phone and website are separate targets because they are separate decisions:
 * calling and reading are different acts, and one of them is what someone does
 * at 2am. They previously shared a single link built by guessing which half of
 * a "number · domain" string was meant, so an entry listing its site first was
 * unreachable by phone.
 */
function Actions({ item }) {
  if (!item.phone && !item.url) {
    return <span className="text-xs text-muted-foreground">{item.hours}</span>;
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {item.phone ? (
        <a
          href={telHref(item.phone)}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5
                     text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <Phone className="size-3.5" />
          {item.phone}
        </a>
      ) : null}

      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5
                     text-xs font-medium transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          {hostOf(item.url)}
        </a>
      ) : null}

      <span className="text-xs text-muted-foreground">{item.hours}</span>
    </div>
  );
}

export function ResourceList({ resources, className }) {
  if (!resources) return null;
  const { emergency = [], directory = [], region } = resources;

  return (
    <div className={cn('space-y-6', className)}>
      {emergency.length ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Phone className="size-4" /> Call now
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {emergency.map((item) => (
              <a
                key={item.id}
                href={telHref(item.phone)}
                className={cn(
                  'group rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                  resources.urgent
                    ? 'border-destructive/40 bg-destructive/8 animate-pulse-ring'
                    : 'border-border bg-card',
                )}
              >
                <div className="text-2xl font-bold tracking-tight">{item.phone}</div>
                <div className="mt-0.5 text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.hours}</div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {directory.length ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Where to report and get help
            {region ? <span className="ml-2 normal-case text-primary">· {region.name}</span> : null}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {directory.map((item) => {
              const Icon = ICONS[item.kind] ?? ShieldCheck;
              return (
                <Card
                  key={item.id}
                  className={cn(
                    'transition-colors hover:border-primary/40',
                    // Someone who works in her city is a different kind of help
                    // from a national number, so it is marked rather than left
                    // to be spotted in a list of eight.
                    item.local && 'border-primary/35 bg-primary/[0.04]',
                  )}
                >
                  <CardContent className="flex gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">{item.kind}</Badge>
                        {item.local ? (
                          <Badge variant="secondary" className="gap-1 text-[10px] uppercase text-primary">
                            <MapPin className="size-2.5" />
                            In your state
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.blurb}</p>
                      <Actions item={item} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
