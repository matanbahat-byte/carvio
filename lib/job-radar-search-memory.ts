import type {SearchProfile} from './job-search.ts';
import {canonicalRoleInput} from './role-intent.ts';
export type RadarSavedSearch={role:string;country:string;city:string;workModel:string;seniority:string;employmentType:string};
export function radarSearchFromProfile(profile:SearchProfile):RadarSavedSearch {
 return {role:canonicalRoleInput(profile.role.trim()),country:profile.country.trim(),city:profile.location.trim(),workModel:profile.workModel.trim(),seniority:profile.seniority.trim(),employmentType:profile.employmentType.trim()};
}
export function radarSearchSummary(search:Partial<RadarSavedSearch>):string {
 return [search.role,search.city,search.country,search.seniority,search.workModel,search.employmentType].filter(s=>typeof s==='string'&&s.trim()).join(' · ');
}
export function nextRadarSearchUpdate(input:{profile:SearchProfile;saved:RadarSavedSearch|null;enabled:boolean;successfulSearch:boolean;lastSearchAt:string|null;expectedVersion:string|null;now?:number}) {
 const at=Date.parse(input.profile.lastSearchedAt||'');const now=input.now??Date.now();
 if(!input.enabled||!input.successfulSearch||!input.saved||!input.expectedVersion||!Number.isFinite(at)||at>now+60000)return null;
 const previous=Math.max(Date.parse(input.lastSearchAt||input.expectedVersion),Date.parse(input.expectedVersion));
 if(!Number.isFinite(previous)||at<=previous)return null;
 const preferences=radarSearchFromProfile(input.profile);
 if(!preferences.role||!preferences.country||Object.values(preferences).some(v=>v.length>120))return null;
 if(Object.entries(preferences).every(([k,v])=>input.saved![k as keyof RadarSavedSearch]===v))return null;
 return {preferences,searchedAt:new Date(at).toISOString(),expectedVersion:input.expectedVersion};
}
