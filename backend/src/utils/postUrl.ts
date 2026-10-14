import type { Platform } from '../types/domain';

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be']);

// /p/<id>, /reel/<id>, /reels/<id>, /tv/<id>, optionally prefixed by /<username>
const INSTAGRAM_PATH = /^\/(?:[A-Za-z0-9._]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (YOUTUBE_SHORT_HOSTS.has(host)) {
    return url.pathname.split('/')[1] ?? null;
  }
  if (!YOUTUBE_HOSTS.has(host)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const shorts = url.pathname.match(/^\/shorts\/([^/]+)\/?$/);
  return shorts?.[1] ?? null;
}

/**
 * Turns a post link into one canonical URL, so the same post submitted as
 * "youtu.be/x", "youtube.com/shorts/x" or "youtube.com/watch?v=x&t=10" is
 * recognised as a duplicate. Returns null if the link is not a post on the
 * given platform.
 */
export function canonicalizePostUrl(raw: string, platform: Platform): string | null {
  const url = parseUrl(raw);
  if (!url) return null;

  if (platform === 'instagram') {
    if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(INSTAGRAM_PATH);
    return match ? `https://www.instagram.com/p/${match[1]}/` : null;
  }

  const id = youtubeVideoId(url);
  return id && YOUTUBE_ID.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
}
