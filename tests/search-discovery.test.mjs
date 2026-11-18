import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptySearchProfile,jobSearchSources,googleJobSearch,officialSearchUrl,suggestedRoleAlternatives,selectedRoleAlternatives,changeSearchRole,migrateSearchProfile,searchProfileChanged,jobLinkIdentity} from '../lib/job-search.ts';
import {SearchRoleAlternatives} from '../components/search-role-alternatives.ts';
const profile={...emptySearchProfile,role:'Global Planning Director',country:'Israel',location:'Tel Aviv',alternativeRoles:'Head of Planning, S&OP Director',skills:'ERP',skillsMode:'required',exclude:'internship',workModel:'Hybrid',seniority:'Director'};

test('selected title alternatives reach every source with location and mandatory keywords preserved',()=>{
 for(const language of ['he','en']) {
  const sources=jobSearchSources(profile,language);
  for(const source of sources){assert.match(source.query,/Head of Planning/);assert.match(source.query,/S&OP Director/);assert.match(source.query,/OR/);assert.match(source.query,/"ERP"/);assert.match(source.query,/internship/);}
  const linkedin=new URL(sources[0].url);assert.equal(linkedin.searchParams.get('location'),'Tel Aviv, Israel');assert.equal(linkedin.searchParams.get('f_WT'),'3');assert.equal(linkedin.searchParams.get('f_E'),'5');
  const careers=new URL(officialSearchUrl(profile,language));assert.match(careers.searchParams.get('q'),/Head of Planning/);assert.equal(careers.searchParams.has('tbs'),false);
 }
});
test('title suggestions are opt-in, respect seniority, support Hebrew, and never guess unknown roles',()=>{
 assert.ok(suggestedRoleAlternatives('Global Planning Director').includes('Head of Planning'));
 assert.ok(suggestedRoleAlternatives('מנהל שרשרת אספקה').includes('Head of Supply Chain'));
 assert.deepEqual(suggestedRoleAlternatives('Unknown Profession'),[]);
 assert.ok(suggestedRoleAlternatives('Senior HRBP').every(title=>title.startsWith('Senior')));
 const primary={...profile,alternativeRoles:''};assert.doesNotMatch(googleJobSearch(primary).query,/Head of Planning/);
 assert.equal(changeSearchRole(profile,'Teacher').alternativeRoles,'');
});
test('selected alternatives deduplicate, cap at four and survive profile restore',()=>{
 const selected={...profile,alternativeRoles:'Head of Planning, head of planning, Global Planning Director, A, B, C, D'};
 assert.deepEqual(selectedRoleAlternatives(selected),['Head of Planning','A','B','C']);
 const restored=migrateSearchProfile(selected);assert.equal(restored.alternativeRoles,'Head of Planning, A, B, C');
 assert.equal(searchProfileChanged({...profile,alternativeRoles:''},profile),true);
});
test('alternative title controls disclose selection and render in both languages',()=>{
 for(const language of ['he','en']){
  const html=renderToStaticMarkup(createElement(SearchRoleAlternatives,{profile,selected:selectedRoleAlternatives(profile),suggestions:suggestedRoleAlternatives(profile.role),language,onChange:()=>{}}));
  assert.match(html,/aria-pressed="true"/);assert.match(html,/alternative-role-help/);assert.match(html,/alternative-role-input/);assert.match(html,/S&amp;OP Director/);
 }
});
test('posting identity deduplicates LinkedIn country hosts and slugs without merging distinct jobs',()=>{
 assert.equal(jobLinkIdentity('https://il.linkedin.com/jobs/view/head-of-planning-at-acme-123456?trk=public_jobs&refId=x'),jobLinkIdentity('https://www.linkedin.com/jobs/view/123456/'));
 assert.notEqual(jobLinkIdentity('https://linkedin.com/jobs/view/123456'),jobLinkIdentity('https://linkedin.com/jobs/view/123457'));
 assert.notEqual(jobLinkIdentity('https://linkedin.com.evil.example/jobs/view/123456'),jobLinkIdentity('https://linkedin.com/jobs/view/123456'));
 assert.equal(jobLinkIdentity('https://il.indeed.com/viewjob?jk=abc123&from=search'),jobLinkIdentity('https://www.indeed.com/viewjob?jk=abc123'));
});
