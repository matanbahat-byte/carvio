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
  const verifiedLinks = results.filter(r => r.linkVerified === true).length;
  const failedLinks = results.filter(r => r.linkVerified === false).length;
  const sources = [...new Set(results.map(r => r.provider).filter(Boolean))].sort();
  const locationJudged = top.filter(r => typeof r.locationCorrect === 'boolean');
  const seniorityJudged = top.filter(r => typeof r.seniorityCorrect === 'boolean');
  return {
    query: query.name, individualJobs: results.length, uniqueJobIds: uniqueIds.size,
    duplicateIds: ids.length - uniqueIds.size, duplicateUrls: urls.length - uniqueUrls.size,
    missingIds: results.length - ids.length, missingUrls: results.length - urls.length,
    sources, sourcesCount: sources.length, linksVerified: verifiedLinks, linksFailed: failedLinks,
    linksNotChecked: results.length - verifiedLinks - failedLinks,
    precisionAt10: top.length === 10 && judged.length === 10
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
