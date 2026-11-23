// Offline evaluation of manually reviewed, real ATS results. No network calls.
// Input JSON: { queries: [{name, results:[{id,url,provider,relevant,locationCorrect,seniorityCorrect,linkVerified}]}] }
// Only true/false judgments count as verified; unknown values are not silently treated as passes.
import { readFileSync } from 'node:fs';

export function evaluateQuery(query) {
  const results = Array.isArray(query.results) ? query.results : [];
  const top = results.slice(0, 10);
  const ids = results.map(r => typeof r.id === 'string' ? r.id.trim() : String(r.id ?? '').trim()).filter(Boolean);
  const urls = results.map(r => typeof r.url === 'string' ? r.url.trim() : '').filter(Boolean);
  const uniqueIds = new Set(ids);
  const uniqueUrls = new Set(urls);
  const judged = top.filter(r => typeof r.relevant === 'boolean');
  // Repeated listings must not inflate a ten-result relevance score.
  const topIds = top.map(r => String(r.id ?? '').trim());
  const topUrls = top.map(r => typeof r.url === 'string' ? r.url.trim() : '');
  const isSafeJobUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password && !u.port; } catch { return false; } };
  // Search-result landing pages are navigation, not individually retrieved job postings.
  const isSearchLandingPage = value => {
    try {
      const u = new URL(value);
      const host = u.hostname.toLowerCase();
      const path = u.pathname.toLowerCase();
      return (/(^|\.)linkedin\.com$/.test(host) && (path.startsWith('/jobs/search') || path.startsWith('/jobs/collections') || path === '/jobs'))
        || (/(^|\.)indeed\.[a-z.]+$/.test(host) && (path === '/' || path === '/jobs' || path.startsWith('/jobs/search')))
        || (/(^|\.)google\.[a-z.]+$/.test(host) && (path === '/search' || path === '/' || path === '/url'));
    } catch { return false; }
  };
  // Count missing URLs too: every row without a valid individual posting URL is invalid.
  const invalidJobUrls = results.filter(r => {
    const url = typeof r.url === 'string' ? r.url.trim() : '';
    return !isSafeJobUrl(url) || isSearchLandingPage(url);
  }).length;
  const distinctTop10 = top.length === 10 && topIds.every(Boolean) && topUrls.every(url => isSafeJobUrl(url) && !isSearchLandingPage(url))
    && new Set(topIds).size === 10 && new Set(topUrls).size === 10;
  const verifiedLinks = results.filter(r => r.linkVerified === true && isSafeJobUrl(r.url) && !isSearchLandingPage(r.url)).length;
  const failedLinks = results.filter(r => r.linkVerified === false || (r.linkVerified === true && (!isSafeJobUrl(r.url) || isSearchLandingPage(r.url)))).length;
  const sources = [...new Set(results.map(r => r.provider).filter(Boolean))].sort();
  // Coverage of actual posting URLs must not include providers represented only by search links.
  const validSources = [...new Set(results.filter(r => isSafeJobUrl(r.url) && !isSearchLandingPage(r.url)).map(r => r.provider).filter(Boolean))].sort();
  const verifiedSources = [...new Set(results.filter(r => r.linkVerified === true && isSafeJobUrl(r.url) && !isSearchLandingPage(r.url)).map(r => r.provider).filter(Boolean))].sort();
  // A syntactically plausible URL does not prove that a real, individual job was retrieved.
  // This flag must come from manual review of the destination page, not URL heuristics.
  const confirmedRows = results.filter(r => r.individualJobVerified === true && r.linkVerified === true && isSafeJobUrl(r.url) && !isSearchLandingPage(r.url));
  // Duplicate evidence rows are not distinct opportunities, even if each link was checked.
  const confirmedIds = new Set();
  const confirmedUrls = new Set();
  let confirmedIndividualJobs = 0;
  for (const row of confirmedRows) {
    const id = String(row.id ?? '').trim();
    const url = String(row.url ?? '').trim();
    // Either repeated identity or repeated destination is duplicate evidence.
    if (!id || confirmedIds.has(id) || confirmedUrls.has(url)) continue;
    confirmedIds.add(id);
    confirmedUrls.add(url);
    confirmedIndividualJobs++;
  }
  const confirmedSources = [...new Set(confirmedRows.map(r => r.provider).filter(Boolean))].sort();
  const confirmedTop10 = distinctTop10 && top.every(r => r.individualJobVerified === true);
  const locationJudged = top.filter(r => typeof r.locationCorrect === 'boolean');
  const seniorityJudged = top.filter(r => typeof r.seniorityCorrect === 'boolean');
  return {
    query: query.name, individualJobs: results.length, validIndividualJobs: results.length - invalidJobUrls, confirmedIndividualJobs, uniqueJobIds: uniqueIds.size,
    duplicateIds: ids.length - uniqueIds.size, duplicateUrls: urls.length - uniqueUrls.size,
    missingIds: results.length - ids.length, missingUrls: results.length - urls.length, invalidJobUrls,
    sources, sourcesCount: sources.length, validSources, validSourcesCount: validSources.length,
    verifiedSources, verifiedSourcesCount: verifiedSources.length,
    confirmedSources, confirmedSourcesCount: confirmedSources.length, linksVerified: verifiedLinks, linksFailed: failedLinks,
    linksNotChecked: results.length - verifiedLinks - failedLinks,
    precisionAt10: distinctTop10 && judged.length === 10
      ? judged.filter(r => r.relevant).length / 10 : null,
    // A usable top-ten score additionally requires live link verification for every listing.
    // This is deliberately unknown when any link is untested or broken.
    usablePrecisionAt10: distinctTop10 && judged.length === 10 && top.every(r => r.linkVerified === true)
      ? judged.filter(r => r.relevant).length / 10 : null,
    // Strict metric: only manually confirmed individual postings with checked live links.
    evidenceBasedPrecisionAt10: confirmedTop10 && judged.length === 10 && top.every(r => r.linkVerified === true)
      ? judged.filter(r => r.relevant).length / 10 : null,
    relevanceJudged: judged.length, top10Count: top.length,
    locationAccuracy: locationJudged.length === top.length && top.length > 0
      ? locationJudged.filter(r => r.locationCorrect).length / top.length : null,
    seniorityAccuracy: seniorityJudged.length === top.length && top.length > 0
      ? seniorityJudged.filter(r => r.seniorityCorrect).length / top.length : null,
  };
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) { console.error('Usage: node scripts/evaluate-ats-search.mjs reviewed-results.json'); process.exitCode = 2; }
  else {
    const input = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(input.queries)) throw new Error('Expected queries array');
    console.log(JSON.stringify(input.queries.map(evaluateQuery), null, 2));
  }
}
