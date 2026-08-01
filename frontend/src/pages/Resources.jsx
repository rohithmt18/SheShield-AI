import { useEffect, useState } from 'react';
import { LifeBuoy, ClipboardCheck, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ResourceList } from '@/components/ResourceList';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { cn } from '@/lib/utils';

export default function Resources() {
  const { categories, regions, latestAnalysis } = useApp();
  const [selected, setSelected] = useState(
    () => latestAnalysis?.categories?.filter((c) => c !== 'none') ?? [],
  );
  const [region, setRegion] = useState('');
  const [level, setLevel] = useState(latestAnalysis?.level ?? 'medium');
  const [resources, setResources] = useState(null);
  const [busy, setBusy] = useState(true);
  const [checked, setChecked] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    api.resources({ categories: selected, level, region })
      .then((data) => { if (!cancelled) setResources(data); })
      .catch(() => { if (!cancelled) setResources(null); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [selected, level, region]);

  const toggle = (key) => setSelected((prev) => (
    prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
  ));

  const keys = Object.keys(categories).filter((c) => c !== 'none');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <LifeBuoy className="size-7 text-primary" />
          Get help
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Helplines, reporting portals, and organisations that handle this — filtered by what
          happened and where you are. You do not need an analysis to use any of them.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Narrow it down</CardTitle>
          <CardDescription>Pick what applies. Leave it blank to see everything.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={selected.includes(key)}
                title={categories[key].blurb}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  selected.includes(key)
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border hover:border-primary/40 hover:bg-accent',
                )}
              >
                {categories[key].label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="res-region">Your state</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="res-region"><SelectValue placeholder="All India" /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-level">How urgent is it?</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="res-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Not urgent</SelectItem>
                  <SelectItem value="medium">Concerning</SelectItem>
                  <SelectItem value="high">Serious</SelectItem>
                  <SelectItem value="critical">Happening now</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {busy && !resources ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading resources…
        </div>
      ) : (
        <ResourceList resources={resources} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4 text-primary" />
            Evidence checklist
          </CardTitle>
          <CardDescription>
            Do this before you block or delete anything. Tick items off as you go — this list is
            not saved anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {(resources?.evidenceSteps ?? []).map((step, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => setChecked((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  return next;
                })}
                className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
              />
              <span className={cn('text-sm leading-relaxed', checked.has(i) && 'text-muted-foreground line-through')}>
                {step}
              </span>
            </label>
          ))}

          <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Keep the originals untouched. If you need to share a version with parts hidden, redact a
            copy and keep the unedited file — an investigator may need to see the whole thing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">What each category means</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {keys.map((key) => (
            <div key={key} className="rounded-lg border border-border p-3.5">
              <Badge variant="secondary" className="mb-1.5">{categories[key].label}</Badge>
              <p className="text-xs leading-relaxed text-muted-foreground">{categories[key].blurb}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
