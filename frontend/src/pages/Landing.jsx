import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScanSearch, MessageCircleHeart, FileText, LifeBuoy, ShieldCheck, EyeOff,
  ArrowRight, Sparkles, Lock,
} from 'lucide-react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { TextGenerateEffect } from '@/components/aceternity/text-generate-effect';
import { Spotlight } from '@/components/aceternity/spotlight';
import { BentoGrid, BentoCard } from '@/components/magic/bento-grid';
import { NumberTicker } from '@/components/magic/number-ticker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/AppContext';
import { engineLabel } from '@/lib/utils';

const FEATURES = [
  {
    icon: ScanSearch,
    title: 'Threat detection',
    description: 'Paste a conversation and get a per-message severity score across eleven categories — from harassment and stalking to sextortion and doxxing.',
  },
  {
    icon: MessageCircleHeart,
    title: 'Anonymous companion',
    description: 'Talk it through with an AI trained to believe you first and advise second. No account, no name, no judgment.',
  },
  {
    icon: FileText,
    title: 'Evidence, organised',
    description: 'Flagged excerpts, timestamps, and classifications compiled into a structured PDF you can attach to a complaint.',
  },
  {
    icon: LifeBuoy,
    title: 'The right authority',
    description: 'Routed to the portal, helpline, or cyber cell that matches your incident type and your state — not a generic list.',
  },
  {
    icon: EyeOff,
    title: 'Built to leave no trace',
    description: 'Sessions are anonymous and expire on their own. Quick-exit wipes the tab and jumps away — press Escape three times.',
  },
  {
    icon: ShieldCheck,
    title: 'Works without the AI',
    description: 'If the model is unreachable, an offline engine still scores your messages and shows you the helplines. Support never goes dark.',
  },
];

const STEPS = [
  { n: 1, title: 'Share what happened', body: 'Paste the messages or upload a chat export. Nothing is tied to your identity.' },
  { n: 2, title: 'See it assessed', body: 'Each message gets a severity score and a category, with the pattern named plainly.' },
  { n: 3, title: 'Decide what to do', body: 'Talk to the companion, generate a report, or go straight to the right helpline.' },
];

export default function Landing() {
  const { aiEnabled, aiEngine, status } = useApp();

  // Three states, not two. Until /api/meta answers we genuinely do not know
  // which engine is live, and saying "offline" on a slow first load told
  // people the AI was off when it was simply still waking up.
  const engineBadge = status === 'loading'
    ? 'Connecting to the service…'
    : status === 'error'
      ? 'Service unreachable — offline engine only'
      : aiEnabled
        ? `${engineLabel(aiEngine)}-powered analysis`
        : 'Running on the offline engine';

  return (
    <>
      <AuroraBackground className="px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/8 px-3 py-1.5 text-primary">
              <Sparkles className="size-3.5" />
              {engineBadge}
            </Badge>
          </motion.div>

          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            <TextGenerateEffect words="You are not overreacting," className="text-gradient" />
            <br />
            <TextGenerateEffect words="and you are not alone." delay={0.5} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            SheShield AI reads the messages you have been sent, tells you plainly how serious they
            are, stays with you while you decide what to do, and turns the evidence into a report
            you can actually file.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.25 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/analyze">
                Check a conversation
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/companion">
                <MessageCircleHeart />
                Just talk to someone
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Lock className="size-3.5" />
            No sign-up. No name. Session ends when you close the tab.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 text-center">
          {[
            { value: 11, label: 'harm categories detected', suffix: '' },
            { value: 5, label: 'severity levels', suffix: '' },
            { value: 7, label: 'day auto-deletion', suffix: '' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border/60 glass p-4">
              <div className="text-3xl font-bold text-primary">
                <NumberTicker value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-xs leading-tight text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </AuroraBackground>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">Everything in one place</h2>
          <p className="mt-2 text-muted-foreground">
            Most platforms give you a report button and nothing else. This is the part that comes after.
          </p>
        </div>

        <Spotlight>
          <BentoGrid>
            {FEATURES.map((feature, i) => (
              <BentoCard key={feature.title} index={i} {...feature} />
            ))}
          </BentoGrid>
        </Spotlight>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-2xl border border-border bg-card/60 p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
              >
                <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.n}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/analyze">Start now<ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/resources"><LifeBuoy />Browse helplines first</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
