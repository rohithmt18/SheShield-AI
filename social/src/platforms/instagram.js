import { Instagram } from 'lucide-react';

/**
 * Instagram-style adapter, backed by local storage.
 *
 * Content lives in the browser because Meta does not expose another person's
 * DMs or comment threads to third-party apps — the same limitation the
 * SheShield README is explicit about. A real adapter would swap these
 * functions for Graph API calls; nothing outside this file would change,
 * because the shapes it returns are the contract.
 */

const STORE_KEY = 'vibe.instagram.v1';
const ME = 'you';

const now = () => new Date().toISOString();
const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();
const id = (prefix) => `instagram:${prefix}:${Math.random().toString(36).slice(2, 10)}`;

/** Deterministic pastel avatar so seeded users look consistent. */
const avatarFor = (handle) => {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) hash = (hash * 31 + handle.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 70% 60%), hsl(${(hash + 60) % 360} 70% 45%))`;
};

/**
 * Seed content.
 *
 * A safety tool that only ever shows green badges demonstrates nothing, so the
 * seed deliberately includes ordinary chatter *and* the harm patterns this
 * exists to catch. The abusive lines are fictional and written to be
 * recognisable to the classifier without being gratuitous.
 */
function seed() {
  return {
    posts: [
      {
        id: 'instagram:post:seed1',
        platform: 'instagram',
        author: 'meera.reads',
        avatar: avatarFor('meera.reads'),
        image: 'linear-gradient(135deg,#f6d365,#fda085)',
        caption: 'finished my first 10k this morning 🏃‍♀️ still shaking',
        createdAt: minutesAgo(48),
        likes: 214,
        likedByMe: false,
        comments: [
          {
            id: 'instagram:comment:seed1a',
            platform: 'instagram',
            postId: 'instagram:post:seed1',
            author: 'priya_k',
            avatar: avatarFor('priya_k'),
            text: 'so proud of you!! 🎉',
            createdAt: minutesAgo(44),
          },
          {
            id: 'instagram:comment:seed1b',
            platform: 'instagram',
            postId: 'instagram:post:seed1',
            author: 'anon_4471',
            avatar: avatarFor('anon_4471'),
            text: 'nobody asked. you looked disgusting in that outfit, go kill yourself',
            createdAt: minutesAgo(40),
          },
        ],
      },
      {
        id: 'instagram:post:seed2',
        platform: 'instagram',
        author: 'you',
        avatar: avatarFor('you'),
        image: 'linear-gradient(135deg,#a8edea,#fed6e3)',
        caption: 'new studio setup, finally 🎧',
        createdAt: minutesAgo(180),
        likes: 88,
        likedByMe: true,
        comments: [
          {
            id: 'instagram:comment:seed2a',
            platform: 'instagram',
            postId: 'instagram:post:seed2',
            author: 'ravi.__99',
            avatar: avatarFor('ravi.__99'),
            text: 'i drove past your building today. nice curtains. i know where you live',
            createdAt: minutesAgo(120),
          },
          {
            id: 'instagram:comment:seed2b',
            platform: 'instagram',
            postId: 'instagram:post:seed2',
            author: 'sana.designs',
            avatar: avatarFor('sana.designs'),
            text: 'this is so clean, where did you get the desk?',
            createdAt: minutesAgo(90),
          },
        ],
      },
      {
        id: 'instagram:post:seed3',
        platform: 'instagram',
        author: 'devcafe',
        avatar: avatarFor('devcafe'),
        image: 'linear-gradient(135deg,#c1dfc4,#deecdd)',
        caption: 'saturday brew ☕ what is everyone building this weekend?',
        createdAt: minutesAgo(300),
        likes: 51,
        likedByMe: false,
        comments: [],
      },
    ],

    threads: [
      {
        id: 'instagram:thread:seed1',
        platform: 'instagram',
        author: 'ravi.__99',
        avatar: avatarFor('ravi.__99'),
        messages: [
          {
            id: 'instagram:msg:seed1a',
            platform: 'instagram',
            threadId: 'instagram:thread:seed1',
            author: 'ravi.__99',
            text: 'why arent you replying',
            createdAt: minutesAgo(58),
            mine: false,
          },
          {
            id: 'instagram:msg:seed1b',
            platform: 'instagram',
            threadId: 'instagram:thread:seed1',
            author: 'ravi.__99',
            text: 'i saw you were online. answer me',
            createdAt: minutesAgo(55),
            mine: false,
          },
          {
            id: 'instagram:msg:seed1c',
            platform: 'instagram',
            threadId: 'instagram:thread:seed1',
            author: 'ravi.__99',
            text: 'send me a pic or ill show everyone the ones i already have',
            createdAt: minutesAgo(51),
            mine: false,
          },
        ],
      },
      {
        id: 'instagram:thread:seed2',
        platform: 'instagram',
        author: 'priya_k',
        avatar: avatarFor('priya_k'),
        messages: [
          {
            id: 'instagram:msg:seed2a',
            platform: 'instagram',
            threadId: 'instagram:thread:seed2',
            author: 'priya_k',
            text: 'are we still on for lunch tomorrow?',
            createdAt: minutesAgo(200),
            mine: false,
          },
          {
            id: 'instagram:msg:seed2b',
            platform: 'instagram',
            threadId: 'instagram:thread:seed2',
            author: ME,
            text: 'yes! 1pm at the usual place',
            createdAt: minutesAgo(195),
            mine: true,
          },
        ],
      },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to a fresh seed */ }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

let state = load();
const subscribers = new Set();
const notify = () => { save(state); subscribers.forEach((fn) => fn()); };

export const instagram = {
  id: 'instagram',
  label: 'Instagram',
  handle: '@you',
  icon: Instagram,
  accent: 'from-fuchsia-500 via-rose-500 to-amber-400',
  connected: true,

  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  reset() {
    state = seed();
    notify();
  },

  listPosts: () => state.posts,

  createPost({ caption, image }) {
    const post = {
      id: id('post'),
      platform: 'instagram',
      author: ME,
      avatar: avatarFor(ME),
      image: image ?? 'linear-gradient(135deg,#667eea,#764ba2)',
      caption,
      createdAt: now(),
      likes: 0,
      likedByMe: false,
      comments: [],
    };
    state.posts = [post, ...state.posts];
    notify();
    return post;
  },

  addComment(postId, { text, author = ME }) {
    const comment = {
      id: id('comment'),
      platform: 'instagram',
      postId,
      author,
      avatar: avatarFor(author),
      text,
      createdAt: now(),
    };
    state.posts = state.posts.map((p) => (
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
    ));
    notify();
    return comment;
  },

  toggleLike(postId) {
    state.posts = state.posts.map((p) => (
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
        : p
    ));
    notify();
    return state.posts.find((p) => p.id === postId);
  },

  listThreads: () => state.threads,

  sendMessage(threadId, { text, author = ME, mine = true }) {
    const message = {
      id: id('msg'),
      platform: 'instagram',
      threadId,
      author,
      text,
      createdAt: now(),
      mine,
    };
    state.threads = state.threads.map((t) => (
      t.id === threadId ? { ...t, messages: [...t.messages, message] } : t
    ));
    notify();
    return message;
  },
};

export { ME, avatarFor };
