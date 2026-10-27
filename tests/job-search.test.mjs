import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySearchProfile, sanitizeSearchProfile, migrateSearchProfile, jobSearchSources, searchProfileChanged, broadenSearchProfile, patchSearchProfile, skillSuggestionsForRole, captureJobLink } from '../lib/job-search.ts';

const profile = (patch = {}) => ({ ...emptySearchProfile, role: 'Software Engineer', filterRole: 'Software Engineer', country: 'Israel', location: 'Beer Sheva', ...patch });
const linkedIn = (p) => jobSearchSources(p, 'en')[0];

test('first search starts with a week; stored explicit time choice is preserved', () => {
  assert.equal(emptySearchProfile.datePosted, 'Past week');
  assert.equal(migrateSearchProfile(profile({ datePosted: 'Past 24 hours' })).datePosted, 'Past 24 hours');
});

test('preferred skills and unmapped industry are disclosed, not silently enforced', () => {
  const source = linkedIn(profile({ industry: 'Healthcare', skills: 'Python, SQL', exclude: 'sales, internship' }));
  const url = new URL(source.url);
  assert.equal(url.searchParams.get('keywords'), '"Software Engineer" NOT "sales" NOT "internship"');
  assert.ok(source.notApplied.some(x => x.includes('Healthcare')));
  assert.ok(source.notApplied.some(x => x.includes('Python, SQL')));
  assert.equal(url.searchParams.has('f_I'), false);
  assert.ok(source.applied.includes('Requested location: Beer Sheva, Israel'));
});

test('required typed or chip-selected skills follow one explicit AND path', () => {
  const source = linkedIn(profile({ skills: ' Python , SQL ', skillsMode: 'required' }));
  assert.match(source.query, /AND "Python" AND "SQL"/);
  assert.ok(source.applied.some(x => x.includes('Python, SQL')));
  assert.equal(source.notApplied.some(x => x.includes('Python')), false);
});

test('all relevant field edits invalidate an old snapshot', () => {
  const original = sanitizeSearchProfile(profile());
  for (const [key, value] of Object.entries({role:'Electrician',location:'Tel Aviv',country:'Netherlands',radius:'50',skills:'SQL',skillsMode:'required',seniority:'Director',workModel:'Remote',employmentType:'Contract',industry:'Healthcare',exclude:'sales',datePosted:'Past 24 hours'})) {
    assert.equal(searchProfileChanged({ ...original, [key]: value }, original), true, key);
  }
  assert.equal(searchProfileChanged(profile({role:' Software Engineer '}), original), false);
});

test('country change clears old city; following city update retains the new one', () => {
  const changed = patchSearchProfile(profile(), {country:'Netherlands'});
  assert.equal(changed.location, '');
  const city = patchSearchProfile(changed, {location:'Amsterdam'});
  assert.equal(new URL(linkedIn(city).url).searchParams.get('location'), 'Amsterdam, Netherlands');
});

test('24 hours to week changes only posting time, not user intent', () => {
  const original = profile({datePosted:'Past 24 hours',skills:'SQL',skillsMode:'required',exclude:'sales',workModel:'Hybrid'});
  const next = broadenSearchProfile(original);
  assert.deepEqual(next, sanitizeSearchProfile({...original,datePosted:'Past week'}));
  const before = new URL(linkedIn(original).url), after = new URL(linkedIn(next).url);
  assert.equal(before.searchParams.get('f_TPR'), 'r86400');
  assert.equal(after.searchParams.get('f_TPR'), 'r604800');
  assert.equal(before.searchParams.get('keywords'), after.searchParams.get('keywords'));
});

test('Hebrew and punctuation survive URL encoding without extra exclusions', () => {
  const source = linkedIn(profile({role:'חשמלאי מוסמך',location:'באר שבע',exclude:'מכירות, התמחות'}));
  const url = new URL(source.url);
  assert.equal(url.searchParams.get('keywords'), '"חשמלאי מוסמך" NOT "מכירות" NOT "התמחות"');
  assert.equal(url.searchParams.get('location'), 'באר שבע, Israel');
  assert.equal(linkedIn(profile({role:'HRBP'})).query.includes('Controller'), false);
});

test('LinkedIn contract, internship, part-time and workplace parameters are mapped', () => {
  for (const [employmentType, code] of [['Contract','C'],['Internship','I'],['Part-time','P'],['Full-time','F'],['Temporary','T']]) {
    assert.equal(new URL(linkedIn(profile({employmentType})).url).searchParams.get('f_JT'), code);
  }
  for (const [workModel, code] of [['Hybrid','3'],['Remote','2'],['On-site','1']]) {
    assert.equal(new URL(linkedIn(profile({workModel})).url).searchParams.get('f_WT'), code);
  }
});

test('skills cover the requested role families and unknown roles get no fake tailoring', () => {
  for (const role of ['Software Engineer','מפתח תוכנה','Registered Nurse','אח מוסמך','Teacher','מורה','Store Manager','מנהל חנות','Junior Data Analyst','אנליסט נתונים','Graphic Designer','מעצבת גרפית','Accountant','רואה חשבון','Electrician','חשמלאי','HRBP','Supply Chain Manager']) {
    assert.ok(skillSuggestionsForRole(role).length >= 5, role);
  }
  assert.deepEqual(skillSuggestionsForRole('Unrecognized profession'), []);
});

test('each source discloses unsupported preferences', () => {
  const sources = jobSearchSources(profile({industry:'Healthcare',seniority:'Director',skills:'SQL'}), 'he');
  assert.ok(sources.every(s=>s.notApplied.some(x=>x.includes('SQL'))));
  assert.ok(sources[1].notApplied.some(x=>x.includes('Healthcare')));
  assert.ok(sources[2].applied.some(x=>x.includes('Healthcare')));
  assert.ok(sources[2].notApplied.some(x=>x.includes('דירקטור')));
});

test('captured URLs keep their source without inventing role or company', () => {
  for (const url of ['https://www.linkedin.com/jobs/view/123456789/', 'https://example.com/jobs/senior-manager-at-example']) {
    const captured = captureJobLink(url);
    assert.equal(captured.jobUrl, url);
    assert.equal(captured.company, '');
    assert.equal(captured.role, '');
  }
  assert.equal(captureJobLink('https://linkedin.com.evil.example/jobs').source, 'Other');
  for(const url of ['javascript:alert(1)','file:///tmp/test','not a url']) assert.throws(()=>captureJobLink(url));
});
