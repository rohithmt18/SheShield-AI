import { useSyncExternalStore, useCallback } from 'react';
import { instagram } from '@/platforms/instagram';
import { PostCard } from '@/components/PostCard';
import { ShieldNotice } from '@/components/ShieldNotice';

export default function Feed() {
  const posts = useSyncExternalStore(
    useCallback((fn) => instagram.subscribe(fn), []),
    () => instagram.listPosts(),
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <ShieldNotice />
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          platform={instagram}
          onLike={(postId) => instagram.toggleLike(postId)}
          onComment={(postId, text) => instagram.addComment(postId, { text })}
        />
      ))}
    </div>
  );
}
