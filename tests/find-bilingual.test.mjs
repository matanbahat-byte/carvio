import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return nextResolve("next/link.js", context);
    if (specifier.startsWith('@/')) {
      const base = new URL('../' + specifier.slice(2), import.meta.url);
      const source = ['.ts', '.tsx'].map(extension => new URL(base.href + extension)).find(path => existsSync(path));
      if (source) return nextResolve(source.href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.tsx')) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText };
    }
    return nextLoad(url, context);
  },
});
const { default: FindJobs, generateMetadata } = await import('../app/find/page.tsx');
const render = async params => renderToStaticMarkup(await FindJobs({ searchParams: Promise.resolve(params) }));
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#x27;', "'");

for (const [lang, dir, label, truth] of [
  ['en', 'ltr', 'Search jobs', 'These are external search links, not job listings found or verified by CARVIO.'],
  ['he', 'rtl', 'חיפוש משרות', 'אלה קישורי חיפוש חיצוניים, לא משרות ש־CARVIO מצא או אימת.'],
]) {
  test(`public search renders correct language, direction, and honest destinations: ${lang}`, async () => {
    const html = await render({ lang, q: 'Software Engineer', country: 'Israel', city: 'Tel Aviv' });
    assert.match(html, new RegExp(`<main lang="${lang}" dir="${dir}"`));
    assert.ok(html.includes(label));
    assert.ok(html.includes(truth));
    assert.ok(html.includes(`type="hidden" name="lang" value="${lang}"`));
    assert.equal((html.match(/target="_blank"/g) || []).length, 4);
    assert.ok(html.includes('rel="noopener noreferrer"'));
    if (lang === 'en') assert.ok(!html.includes('למרכז ניהול הקריירה'));
  });
  test(`language switch retains role, country, city without retaining unrecognized query parameters: ${lang}`, async () => {
    const values = { lang, q: 'R&D "Lead" & AI', country: 'ישראל', city: 'תל אביב', token: 'private' };
    const html = await render(values);
    const href = html.match(/href="([^"]+)" hrefLang=/)?.[1];
    assert.ok(href);
    const url = new URL(decode(href), 'https://carvio.example');
    assert.equal(url.pathname, '/find');
    assert.equal(url.searchParams.get('lang'), lang === 'en' ? 'he' : 'en');
    for (const key of ['q', 'country', 'city']) assert.equal(url.searchParams.get(key), values[key]);
    assert.equal(url.searchParams.has('token'), false);
  });
}

test('missing or unsupported language retains Hebrew default and empty form has no external destinations', async () => {
  for (const params of [{}, { lang: 'invalid' }, { lang: ['en', 'he'] }]) {
    const html = await render(params);
    assert.match(html, /<main lang="he" dir="rtl"/);
    assert.equal(html.includes('target="_blank"'), false);
  }
});

test('English destinations use English provider labels and Google language while preserving Hebrew search input', async () => {
  const html = await render({ lang: 'en', q: 'מהנדס תוכנה', country: 'ישראל', city: 'תל אביב' });
  assert.ok(html.includes('Indeed — local search'));
  assert.ok(html.includes('Google — jobs-focused search'));
  assert.ok(html.includes('name="q"'));
  assert.ok(html.includes('value="מהנדס תוכנה"'));
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => new URL(decode(match[1]), 'https://carvio.example'));
  for (const url of links.filter(url => url.hostname === 'www.google.com')) assert.equal(url.searchParams.get('hl'), 'en');
  assert.ok(links.some(url => url.hostname === 'il.indeed.com'));
});


test('public search metadata localizes without echoing search criteria or context', async () => {
  for (const lang of ['he', 'en']) {
    const clean = await generateMetadata({ searchParams: Promise.resolve({ lang }) });
    assert.equal(clean.alternates.canonical, 'https://carvio-pi.vercel.app/find');
    assert.equal(clean.robots.index, true);
    assert.ok(clean.title.includes(lang === 'he' ? 'חיפוש משרות' : 'Search jobs'));
    for (const params of [
      { lang, q: 'private-person@example.com', country: 'Private location', city: 'Private city' },
      { lang, city: 'Private city' }, { lang, workspace: '1' },
      { lang, q: ['private-person@example.com', 'another'] },
    ]) {
      const metadata = await generateMetadata({ searchParams: Promise.resolve(params) });
      assert.equal(metadata.robots.index, false);
      assert.equal(metadata.robots.follow, true);
      assert.equal(metadata.alternates.canonical, 'https://carvio-pi.vercel.app/find');
      assert.equal(metadata.openGraph.url, 'https://carvio-pi.vercel.app/find');
      assert.doesNotMatch(JSON.stringify(metadata), /private-person|Private location|Private city|workspace=/);
    }
  }
});
