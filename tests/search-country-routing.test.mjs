import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySearchProfile, jobSearchSources, officialSearchUrl, companyJobSearchRoute } from '../lib/job-search.ts';

for (const [country, host, code] of [
  ['ישראל', 'il.indeed.com', 'il'], ['הולנד', 'nl.indeed.com', 'nl'],
  ['גרמניה', 'de.indeed.com', 'de'], [' israel ', 'il.indeed.com', 'il'],
  ['ארצות הברית', 'www.indeed.com', 'us'],
]) {
  test(`explicit country alias routes providers correctly: ${country}`, () => {
    const profile = { ...emptySearchProfile, role: 'מהנדס תוכנה', country, location: 'תל אביב' };
    for (const language of ['he', 'en']) {
      const sources = jobSearchSources(profile, language);
      assert.equal(new URL(sources[1].url).hostname, host);
      assert.equal(new URL(sources[0].url).searchParams.get('location'), `תל אביב, ${country.trim()}`);
      assert.equal(new URL(sources[2].url).searchParams.get('gl'), code);
      assert.ok(new URL(sources[2].url).searchParams.get('q').includes(country.trim()));
      assert.equal(new URL(officialSearchUrl(profile, language)).searchParams.get('gl'), code);
      assert.equal(new URL(companyJobSearchRoute(profile, 'Example', 0).url).hostname, host);
    }
  });
}

test('unknown countries do not inherit an inferred country bias', () => {
  const profile = { ...emptySearchProfile, role: 'Engineer', country: 'Unknown country', location: 'Shared city name' };
  const sources = jobSearchSources(profile);
  assert.equal(new URL(sources[2].url).searchParams.has('gl'), false);
  assert.equal(new URL(sources[0].url).searchParams.get('location'), 'Shared city name, Unknown country');
});
