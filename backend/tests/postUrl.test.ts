import { canonicalizePostUrl } from '../src/utils/postUrl';

describe('canonicalizePostUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('normalises YouTube link %s', (url) => {
    expect(canonicalizePostUrl(url, 'youtube')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it.each([
    'https://www.instagram.com/p/C1a2B3c4D5e/',
    'https://instagram.com/reel/C1a2B3c4D5e?igsh=xyz',
    'https://www.instagram.com/reels/C1a2B3c4D5e',
    'https://www.instagram.com/some.page/p/C1a2B3c4D5e/',
  ])('normalises Instagram link %s', (url) => {
    expect(canonicalizePostUrl(url, 'instagram')).toBe('https://www.instagram.com/p/C1a2B3c4D5e/');
  });

  it.each([
    ['https://www.instagram.com/p/C1a2B3c4D5e/', 'youtube'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'instagram'],
    ['https://www.youtube.com/watch?v=short', 'youtube'],
    ['https://www.instagram.com/somepage/', 'instagram'],
    ['https://evil.com/p/C1a2B3c4D5e/', 'instagram'],
    ['javascript:alert(1)', 'youtube'],
    ['not a url', 'youtube'],
  ] as const)('rejects %s for %s', (url, platform) => {
    expect(canonicalizePostUrl(url, platform)).toBeNull();
  });
});
