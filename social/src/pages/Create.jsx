import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, ShieldCheck } from 'lucide-react';
import { activePlatform as platform } from '@/platforms';
import { cn } from '@/lib/utils';

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f6d365,#fda085)',
  'linear-gradient(135deg,#a8edea,#fed6e3)',
  'linear-gradient(135deg,#c1dfc4,#deecdd)',
  'linear-gradient(135deg,#fbc2eb,#a6c1ee)',
  'linear-gradient(135deg,#84fab0,#8fd3f4)',
];

export default function Create() {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(GRADIENTS[0]);
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    if (!caption.trim()) return;
    // Screening happens when the caption renders in the feed, through the same
    // ScreenedText path every other piece of content uses — there is no
    // separate "on create" code path that could drift from it.
    platform.createPost({ caption: caption.trim(), image });
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-xl font-bold tracking-tight">New post</h1>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Your caption is screened by SheShield AI once posted.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="aspect-square w-full rounded-lg border border-border" style={{ backgroundImage: image }} />

        <div>
          <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ImagePlus className="size-3.5" />
            Pick a backdrop
          </span>
          <div className="flex flex-wrap gap-2">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setImage(g)}
                style={{ backgroundImage: g }}
                aria-label="Select backdrop"
                className={cn('size-10 rounded-md border-2', image === g ? 'border-primary' : 'border-transparent')}
              />
            ))}
          </div>
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          maxLength={2000}
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-transparent p-3 text-sm outline-none
                     placeholder:text-muted-foreground focus:border-primary"
        />

        <button
          type="submit"
          disabled={!caption.trim()}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Share
        </button>
      </form>
    </div>
  );
}
