import { Phone } from 'lucide-react';

const HELPLINES = [
  { label: 'Emergency', number: '112' },
  { label: 'Women’s helpline', number: '181' },
  { label: 'Cyber crime', number: '1930' },
  { label: 'Mental health', number: '14416' },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {HELPLINES.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Phone className="size-3.5" />
              {h.label}
              <span className="font-semibold text-foreground">{h.number}</span>
            </a>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          SheShield AI gives automated assessments, not legal advice or a professional risk
          determination. Severity scores can be wrong in both directions — trust your own judgment
          first, and contact the police or a lawyer for anything urgent. Sessions are anonymous and
          are deleted automatically; closing this tab ends the session on this device.
        </p>
      </div>
    </footer>
  );
}
