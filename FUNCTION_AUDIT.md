# Functional Audit

## Automated verification
- Backend production build: PASS
- Frontend production build: PASS
- Backend tests: 160/160 PASS
- Frontend tests: 46/46 PASS

## Live API smoke tests
- GET /health: PASS
- GET /health/neo4j: PASS (disabled state reported correctly)
- GET /imports/limits: PASS
- POST /imports/upload: PASS
- GET /imports/:id/mappings: PASS
- POST /imports/:id/validate: PASS
- GET /imports/:id/normalized-preview: PASS
- POST /imports/:id/correlate: PASS
- POST /imports/:id/convert: PASS
- GET /imports/:id/graph-preview: PASS
- POST /imports/:id/persist: PASS in import-session fallback mode
- GET /imports/active: PASS
- GET /pipeline/state: PASS
- GET /risk/summary: PASS
- GET /connectors: PASS
- GET /identity/enterprise: PASS

## Fixes from this audit
- Removed hardcoded localhost API bases from frontend services.
- Added the correct Vite proxy for /attack-path.
- Imported-session availability is now detected from the backend, not only localStorage.
- Dashboard and Graph source selectors recover the latest active import automatically.
- Added all router subpaths to route validation.
- Made install:all resilient for the local mock-data dependency.
- Isolated import tests from persisted production sessions.
- Prevented existing import snapshots from causing the test suite to hit the concurrent-session limit.
- Reference resolution excludes the source node when finding relationship targets.
