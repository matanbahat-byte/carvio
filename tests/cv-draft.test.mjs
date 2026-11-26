import test from 'node:test';
import assert from 'node:assert/strict';
import {CV_DRAFT_KEY,emptyCvDraft,readCvDraft,writeCvDraft,replaceCvDraft} from '../lib/cv-draft.ts';

test('current edits and previous copy round trip together; repeated identical generation retains the backup',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let saved={...emptyCvDraft,current:'Manual original\nשמור'};
 saved=replaceCvDraft(saved,'Generated B');writeCvDraft(storage,saved);
 assert.deepEqual(readCvDraft(storage),{version:1,current:'Generated B',previous:'Manual original\nשמור'});
 assert.deepEqual(replaceCvDraft(readCvDraft(storage),'Generated B'),saved);
 saved=replaceCvDraft(saved,'');writeCvDraft(storage,saved);
 assert.deepEqual(replaceCvDraft(readCvDraft(storage),'Generated C'),{version:1,current:'Generated C',previous:'Generated B'});
});

test('missing storage starts empty; malformed/unknown persisted versions fail closed',()=>{
 assert.deepEqual(readCvDraft({getItem:()=>null}),emptyCvDraft);
 for(const raw of ['{invalid','null','{"version":2,"current":"private","previous":null}','{"version":1,"current":"private"}']) assert.throws(()=>readCvDraft({getItem:()=>raw}));
});

test('failed storage write cannot replace just the draft while losing its backup',()=>{
 const original=JSON.stringify({version:1,current:'Original',previous:'Older'});
 const storage={getItem:()=>original,setItem(){throw Error('QuotaExceededError');}};
 assert.throws(()=>writeCvDraft(storage,replaceCvDraft(readCvDraft(storage),'Replacement')));
 assert.equal(storage.getItem(CV_DRAFT_KEY),original);
});
