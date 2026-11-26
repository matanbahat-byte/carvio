# Direct job capture from Home — initial candidate checkpoint

Base: released PR #124, main `ffd192ae3b86aba412b46ff1b1d578ef832c6e6c`. Branch: `fix/capture-home-20261126`.

Existing capture already supports URL input, essential-field review, optional supported ATS details, manual correction, save confirmation and duplicate detection. Home previously placed its returning-user capture button below saved search sources and only displayed it when saved search preferences were complete. New visitors had a separate onboarding entry; users with existing records and no search profile could miss capture entirely.

This candidate moves the returning-user action into the first Home section header, always available alongside Edit search, for Hebrew/English and mobile/desktop. The lower conditional button is removed to avoid repeating that action. Existing first-opportunity guidance and all capture semantics remain unchanged. No new clipboard permission, automatic clipboard reads, storage, cloud or job-retrieval behavior is introduced.

Initial checkpoint: 183 units passed; TypeScript, lint/build and focused browser acceptance are being completed. The PR records final results. The focused browser matrix covers Home entry without saved search preferences, isolated supported-ATS autofill, user review/edit before save, duplicate reuse, unsupported-source manual fallback, invalid search-page rejection, and horizontal overflow at 390px/1440px in Hebrew/English. Mock metadata is explicitly a QA fixture, not evidence of an actual published listing.

Overall mission remains 58%. Production unchanged; final release approval is required. No migration; rollback baseline is the base main SHA above.
