import test from 'node:test';
import assert from 'node:assert/strict';

const origin = new URL(process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3109').origin;
const read = async path => {
  const response = await fetch(new URL(path, origin), { headers: { 'user-agent': 'Twitterbot' } });
  assert.equal(response.status, 200);
  return response.text();
};

test('rendered public discovery endpoints advertise only public production URLs', async () => {
  const sitemap = await read('/sitemap.xml');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [
    'https://carvio-pi.vercel.app/', 'https://carvio-pi.vercel.app/find',
  ]);
  const robots = await read('/robots.txt');
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/auth\//);
  assert.match(robots, /Sitemap: https:\/\/carvio-pi.vercel.app\/sitemap.xml/);
});

test('rendered search result metadata excludes private query text and requests no indexing', async () => {
  const input = 'private-person@example.com';
  const html = await read(`/find?lang=en&q=${encodeURIComponent(input)}&country=Israel`);
  assert.match(html, /<meta name="robots" content="noindex, follow"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/carvio-pi.vercel.app\/find"/);
  const metadata = [...html.matchAll(/<meta\b[^>]*>|<title>[^<]*<\/title>|<link rel="canonical"[^>]*>/g)].map(match => match[0]).join('');
  assert.equal(metadata.includes(input), false);
  assert.equal(metadata.includes(encodeURIComponent(input)), false);
});

test('rendered plain English search page remains indexable', async () => {
  const html = await read('/find?lang=en');
  assert.match(html, /<meta name="robots" content="index, follow"/);
  assert.match(html, /<title>CARVIO — Search jobs in Hebrew and English<\/title>/);
});
