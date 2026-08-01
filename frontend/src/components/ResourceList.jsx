import { Phone, ExternalLink, ShieldCheck, HeartPulse, Landmark, Scale, Users } from 'lucide-react';
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

/** A contact is dialable if it starts with digits; otherwise link it as a URL. */
function contactHref(contact = '') {
  const first = contact.split('·')[0].trim();
  if (/^[\d\s+-]{3,}$/.test(first)) return `tel:${first.replace(/\s/g, '')}`;
  const domain = contact.match(/[\w-]+\.(?:gov\.in|org|in|com)[\w/-]*/i);
  return domain ? `https://${domain[0]}` : null;
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
                href={contactHref(item.contact) ?? '#'}
                className={cn(
                  'group rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                  resources.urgent
                    ? 'border-destructive/40 bg-destructive/8 animate-pulse-ring'
                    : 'border-border bg-card',
                )}
              >
                <div className="text-2xl font-bold tracking-tight">{item.contact}</div>
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
              const href = contactHref(item.contact);
              return (
                <Card key={item.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="flex gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">{item.kind}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.blurb}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {href ? (
                          <a
                            href={href}
                            target={href.startsWith('http') ? '_blank' : undefined}
                            rel="noreferrer noopener"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {item.contact}
                          </a>
                        ) : (
                          <span className="text-xs font-medium">{item.contact}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{item.hours}</span>
                      </div>
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
