// Department and rank stay together. Company names/descriptions are not titles.
function clean(value:string){return value.normalize('NFKC').toLowerCase().replace(/vice[-\s]*president/g,'vice president').replace(/["'“”״׳,.]/g,'').replace(/[/-]/g,' ').replace(/\s+/g,' ').trim();}
const executiveHrAliases=['vphr','vp hr','vp of hr','vp human resources','vp of human resources','vice president hr','vice president of hr','vice president human resources','vice president of human resources','vp people','vp of people','vice president people','vice president of people','vp people & culture','vice president of people & culture','סמנכל משאבי אנוש','סמנכלית משאבי אנוש'];
export function isExecutiveHrSearch(value:string){return executiveHrAliases.includes(clean(value));}
export function executiveHrSearchTerms(value:string):string[]|null {
 if(!isExecutiveHrSearch(value))return null;
 return ['VP HR','VP Human Resources','Vice President of Human Resources','VP People','סמנכ״ל משאבי אנוש','סמנכ״לית משאבי אנוש'];
}
export function canonicalRoleInput(value:string){return isExecutiveHrSearch(value)?'VP HR':value;}
export function matchesExecutiveHrTitle(value:string){
 const title=clean(value).replace(/^(global|group) /,'');
 if(/\b(sales|product|engineering|finance|marketing|customer|software|analytics)\b/.test(title))return false;
 return executiveHrAliases.some(alias=>title===alias||title.startsWith(alias+' '));
}
