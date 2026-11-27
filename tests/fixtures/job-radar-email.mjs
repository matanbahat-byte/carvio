// Fictional roles and companies only. Never send or publish these to production.
export const emailFixtureJobs=Array.from({length:6},(_,i)=>({
 id:`greenhouse:carvio-email-fixture:${91001+i}`,
 title:['מנהלת גיוס / Recruitment Manager','Talent Acquisition Manager — Product & Engineering','Recruiting Manager, International Teams','מנהל גיוס — טכנולוגיה וצמיחה','Talent Acquisition Manager — People & Candidate Experience','Recruitment Manager — sixth card omitted'][i],
 company:['חברת דוגמה א׳','Example Mint Labs','Example & Partners','חברת דוגמה ב׳','Example Turquoise Group','Example Sixth'][i],
 location:'תל אביב · Tel Aviv, Israel',
 url:`https://boards.greenhouse.io/carvio-email-fixture/jobs/${91001+i}`,
 provider:'greenhouse',postedAt:'2026-11-26T00:00:00Z',
}));
