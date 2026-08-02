import { instagram } from './instagram';

/**
 * Platform registry.
 *
 * A platform adapter owns *content*: where posts, comments, and messages come
 * from and how they are created. It owns nothing about screening — everything
 * it returns is normalised into the same shape, and the moderation pipeline
 * consumes that shape without knowing which network produced it.
 *
 * Adding X, YouTube, or Facebook means writing one module that satisfies the
 * contract below and adding it to this list. No change to the SheShield
 * backend, to `moderation.js`, or to any component is required — which is the
 * whole point of the split.
 *
 * ── Adapter contract ────────────────────────────────────────────────────────
 *   id        string                     stable key, e.g. 'instagram'
 *   label     string                     display name
 *   handle    string                     the signed-in account on that platform
 *   icon      LucideIcon
 *   accent    string                     tailwind gradient classes for chrome
 *   connected boolean                    false renders it as available-not-linked
 *
 *   listPosts()                       -> Post[]
 *   createPost({ caption, image })    -> Post
 *   addComment(postId, { text })      -> Comment
 *   toggleLike(postId)                -> Post
 *   listThreads()                     -> Thread[]
 *   sendMessage(threadId, { text })   -> Message
 *
 * ── Normalised shapes ───────────────────────────────────────────────────────
 *   Post    { id, platform, author, avatar, image, caption, createdAt,
 *             likes, likedByMe, comments: Comment[] }
 *   Comment { id, platform, postId, author, avatar, text, createdAt }
 *   Thread  { id, platform, author, avatar, messages: Message[] }
 *   Message { id, platform, threadId, author, avatar, text, createdAt, mine }
 *
 * Every id must be globally unique across platforms — prefix with the platform
 * id — because verdicts are cached by content id alone.
 */

export const platforms = [instagram];

export const platformById = (id) => platforms.find((p) => p.id === id) ?? instagram;

/** Placeholders shown in the UI so the extension path is visible, not implied. */
export const upcomingPlatforms = [
  { id: 'x', label: 'X', note: 'Adapter not written yet' },
  { id: 'youtube', label: 'YouTube', note: 'Adapter not written yet' },
  { id: 'facebook', label: 'Facebook', note: 'Adapter not written yet' },
];
