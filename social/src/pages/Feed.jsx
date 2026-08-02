import { useSyncExternalStore, useCallback } from 'react';
import { activePlatform as platform } from '@/platforms';
import { PostCard } from '@/components/PostCard';
import { ShieldNotice } from '@/components/ShieldNotice';

export default function Feed() {
  const posts = useSyncExternalStore(
    useCallback((fn) => platform.subscribe(fn), []),
    () => platform.listPosts(),
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <ShieldNotice />
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          platform={platform}
          onLike={(postId) => platform.toggleLike(postId)}
          onComment={(postId, text) => platform.addComment(postId, { text })}
        />
      ))}
    </div>
  );
}
