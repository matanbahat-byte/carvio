import test from 'node:test';
import assert from 'node:assert/strict';
import robots from '../app/robots.ts';
import sitemap from '../app/sitemap.ts';

function withEnvironment(environment, action) {
  const previous = process.env.VERCEL_ENV;
  if (environment === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = environment;
  try { return action(); }
  finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
}

test('sitemap contains exactly the two fixed public pages without queries or private data', () => {
  withEnvironment('production', () => {
    assert.deepEqual(sitemap(), [
      { url: 'https://carvio-pi.vercel.app/' },
      { url: 'https://carvio-pi.vercel.app/find' },
    ]);
    for (const page of sitemap()) {
      const url = new URL(page.url);
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
      assert.equal(Object.hasOwn(page, 'lastModified'), false);
    }
  });
});

test('production robots blocks API, auth and workspace query crawling and declares public sitemap', () => {
  withEnvironment('production', () => {
    assert.deepEqual(robots(), {
      rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/*?*workspace=*'] },
      sitemap: 'https://carvio-pi.vercel.app/sitemap.xml',
    });
  });
});

test('preview and development deployments do not advertise indexable pages', () => {
  for (const environment of ['preview', 'development']) withEnvironment(environment, () => {
    assert.deepEqual(sitemap(), []);
    assert.deepEqual(robots(), { rules: { userAgent: '*', disallow: '/' } });
  });
});
