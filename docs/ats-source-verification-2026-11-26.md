# ATS source capture verification — 26 November 2026

Official public source responses retrieved and inspected (no customer records):

- Greenhouse: https://job-boards.greenhouse.io/anthropic/jobs/5456619008 — 3P Revenue Accounting & Reporting, Anthropic. Structured API content normalized to 8,862 characters. Compared the complete normalized text against the complete API `content`. HTML entities and list boundaries cleaned. Minimum/preferred qualifications recognized; compensation and promotional sections excluded from extracted requirements.
- Lever: https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd — Administrative Business Partner, Palantir Technologies. Complete assembled description: 4,725 characters, including introduction, all three `lists` sections and additional text. Every list's normalized content checked against imported text. Seven requirement suggestions reviewed. Company comes from `JobPosting.hiringOrganization.name` in the official posting's JSON-LD, not the board slug.

The checks replayed these freshly retrieved official response bodies through the importer so results are reproducible despite network latency. The live listing HTML was fetched only from the exact allowed Lever posting URL; redirects and arbitrary remote hosts remain forbidden.

Partial fixture: introduction only, no requirements and no organization metadata. Classified as possibly partial, zero suggested requirements, company left blank for manual confirmation.

Full descriptions are no longer silently truncated to 20,000 characters. Network responses remain bounded to 2 MB. Existing saved records and manually entered fields are not migrated or automatically replaced. Current requirement UI still limits suggestions to 12; the complete source description remains available for manual review. Availability and extraction are independent: an open listing is not proof of a complete description. Live posting contents can change or close after this check.
