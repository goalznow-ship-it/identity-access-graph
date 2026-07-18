# V2 refactor progress

## Phase 1 — durable imported dataset foundation

- Import sessions, mappings, validation, correlation and graph conversion snapshots are persisted under the backend import state directory.
- Valid sessions are restored after backend restart.
- Added `GET /imports/active` and `GET /imports/active/graph-preview`.
- Graph imported-source mode can recover the latest active import even when the browser no longer has an import ID.
- Neo4j persistence summaries explicitly identify `neo4j` versus `import-session` storage.
- Root and package dependencies support build/test execution.

## Verification

- Backend build: pass
- Frontend build: pass
- Backend tests: 160/160 pass
- Frontend tests: 46/46 pass
