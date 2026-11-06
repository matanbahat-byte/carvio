import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptySearchProfile,googleJobSearch,officialSearchUrl,jobSearchSources} from '../lib/job-search.ts';
import {SearchSourceCards} from '../components/search-source-cards.ts';
const profile={...emptySearchProfile,role:'Senior HR Business Partner',country:'Israel',location:'Tel Aviv'};
test('Google searches web page content without forcing title or quoted city/country',()=>{
 const route=googleJobSearch(profile); const url=new URL(route.url);
 assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('q'),route.query);
 assert.ok(route.query.includes('Senior HR Business Partner'));assert.ok(route.query.includes('Tel Aviv'));
 assert.doesNotMatch(route.query,/intitle:|"Tel Aviv"|"Israel"/);assert.equal(url.searchParams.get('gl'),'il');
 assert.equal(url.searchParams.get('tbs'),'qdr:w');assert.ok(!url.searchParams.has('udm'));
 assert.deepEqual(jobSearchSources(profile).find(x=>x.id==='google').url,route.url);
});
test('Google escape hatch removes only time filtering and preserves explicit search intent',()=>{
 const p={...profile,skills:'SQL, People Analytics',skillsMode:'required',exclude:'internship',workModel:'Hybrid',industry:'Healthcare'};const before=JSON.stringify(p);
 const timed=new URL(googleJobSearch(p).url);const any=new URL(googleJobSearch(p,'en',{anyTime:true}).url);
 assert.equal(any.searchParams.get('q'),timed.searchParams.get('q'));assert.equal(any.searchParams.has('tbs'),false);
 assert.match(any.searchParams.get('q'),/"SQL"/);assert.match(any.searchParams.get('q'),/-"internship"/);assert.ok(any.searchParams.get('q').includes('Hybrid'));
 assert.equal(JSON.stringify(p),before);
});
test('career route covers company career pages and ATS hosts without requiring one exact location phrase',()=>{
 const url=new URL(officialSearchUrl(profile,'he'));const q=url.searchParams.get('q');
 assert.ok(q.includes('site:jobs.lever.co'));assert.ok(q.includes('site:job-boards.greenhouse.io'));assert.ok(q.includes('-site:linkedin.com'));
 assert.doesNotMatch(q,/"Tel Aviv, Israel"|intitle:/);assert.equal(url.searchParams.get('hl'),'he');
 assert.equal(url.searchParams.has('tbs'),false);
});
test('Hebrew roles and unknown countries encode safely without invented country codes',()=>{
 const url=new URL(googleJobSearch({...profile,role:'מנהל/ת משאבי אנוש',location:'באר שבע',country:'New Zealand'},'he').url);
 assert.ok(url.searchParams.get('q').includes('מנהל/ת משאבי אנוש'));assert.ok(url.searchParams.get('q').includes('באר שבע'));assert.equal(url.searchParams.has('gl'),false);
});
test('both visible providers are identified by ID, with Google and career links in both languages',()=>{
 for(const language of ['en','he']) {
  const html=renderToStaticMarkup(createElement(SearchSourceCards,{sources:jobSearchSources(profile,language).reverse(),profile,language,careerUrl:officialSearchUrl(profile,language),anyTimeUrl:googleJobSearch(profile,language,{anyTime:true}).url,onCopy:()=>{},onOpen:()=>{},filterNotice:()=>null}));
  assert.equal((html.match(/<article/g)||[]).length,2);assert.ok(html.indexOf('data-search-source="linkedin"')<html.indexOf('data-search-source="google"'));
  assert.match(html,/search-route-1/);assert.match(html,/search-career-pages/);assert.match(html,/search-google-anytime/);
  assert.ok(html.includes(language==='he'?'חיפוש ב־Google':'Search Google'));
  assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);
 }
});
