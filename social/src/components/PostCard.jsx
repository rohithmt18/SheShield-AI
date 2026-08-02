import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { Avatar } from './Avatar';
import { ScreenedText } from './ScreenedText';
import { cn, relativeTime } from '@/lib/utils';

export function PostCard({ post, platform, onLike, onComment }) {
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);

  const comments = showAll ? post.comments : post.comments.slice(-2);

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onComment(post.id, text);
    setDraft('');
    setShowAll(true);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-3 p-3">
        <Avatar handle={post.author} gradient={post.avatar} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{post.author}</div>
          <div className="text-[11px] text-muted-foreground">
            {platform.label} · {relativeTime(post.createdAt)}
          </div>
        </div>
        <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="size-5" />
        </button>
      </header>

      <div
        className="aspect-square w-full"
        style={{ backgroundImage: post.image }}
        role="img"
        aria-label="Post image"
      />

      <div className="flex items-center gap-4 px-3 pt-3">
        <button
          type="button"
          onClick={() => onLike(post.id)}
          className="transition-transform active:scale-90"
          aria-pressed={post.likedByMe}
          aria-label={post.likedByMe ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('size-6', post.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-foreground')} />
        </button>
        <MessageCircle className="size-6" />
        <Send className="size-6" />
        <Bookmark className="ml-auto size-6" />
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="text-sm font-semibold">{post.likes.toLocaleString()} likes</div>

        {/* The caption is user-authored, so it is screened like anything else. */}
        <div className="mt-1.5">
          <span className="mr-2 text-sm font-semibold">{post.author}</span>
          <ScreenedText
            item={{
              id: post.id,
              text: post.caption,
              author: post.author,
              kind: 'caption',
              platform: platform.id,
            }}
            compact
            showBadge={false}
            className="inline-block w-full"
          />
        </div>

        {post.comments.length > 2 && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground"
          >
            View all {post.comments.length} comments
          </button>
        ) : null}

        <ul className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <Avatar handle={comment.author} gradient={comment.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{comment.author}</span>
                  <span className="text-[11px] text-muted-foreground">{relativeTime(comment.createdAt)}</span>
                </div>
                <ScreenedText
                  item={{
                    id: comment.id,
                    text: comment.text,
                    author: comment.author,
                    kind: 'comment',
                    platform: platform.id,
                  }}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            maxLength={2000}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="text-sm font-semibold text-primary disabled:opacity-40"
          >
            Post
          </button>
        </form>
      </div>
    </article>
  );
}
