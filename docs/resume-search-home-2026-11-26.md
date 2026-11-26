# Resume saved search from Home — initial candidate checkpoint

Base: released main `efd3313c69aa8eab7a67c3c83aa9aac59591ae76` (PR #122). Branch: `fix/resume-search-home-20261126`.

Existing Home already displays saved search criteria and outbound source cards. The missing action is a single button to enter the workspace search view and prepare all source links together using the saved criteria. This candidate adds Hebrew/English Continue your search beside that summary and retains locale on Edit search. It reuses runJobSearch, including existing search telemetry. It does not automatically open external tabs or claim fetched/verified listings. No new storage, cloud or schema behavior is introduced.

The action is offered only for a nonempty role, country other than Other and preferences that do not require review. It resumes the currently saved criteria (including saved edits); CARVIO has no separate immutable historical-search snapshot in this package.

Initial verification: 183 units and TypeScript passed. ESLint, production build and four-case browser acceptance are pending at this checkpoint. The PR records their final status. Browser acceptance covers Hebrew/English at 390px/1440px after reload, one-click source preparation, criteria/locale preservation, no extra external tabs, no application-record changes, horizontal overflow and incomplete-search fallback. CI includes the focused matrix alongside existing visual/cloud/database coverage.

Overall mission remains 58%. No activation or retention improvement is claimed without post-release evidence. Production release requires final user approval; rollback baseline is the main SHA above. No migration required.
