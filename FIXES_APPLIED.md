# Fixes applied

- Corrected the import workflow so Correlation advances to Graph Preview without silently skipping the Graph step.
- Added an explicit Build Graph Preview action on the Graph step.
- Added restoration of cached validation, correlation, and graph-conversion artifacts after refresh/session recovery.
- Corrected workflow completion tracking so the step being left is marked complete, not the step being entered.
- Distinguished file-processing progress from overall workflow completion.
- Switched frontend API calls to same-origin by default and expanded the Vite proxy to backend route groups.
- Enabled credentialed CORS for the local frontend origins.
- Added root install/dev/build/test scripts.
- Fixed backend build resolution for the local graph-model package.

Verification:
- Backend production build passed.
- Frontend production build passed.
- Backend tests passed.
- Frontend tests passed (46/46).
