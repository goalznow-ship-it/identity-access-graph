# Enterprise risk engine

The risk engine evaluates the current graph using deterministic rules and persists both findings and scan history in PostgreSQL. Neo4j is used when `graphSource` is `neo4j` (or when `auto` selects it); memory mode remains available for previews and tests.

Production analysis fails closed when neither Neo4j nor a durable imported graph snapshot is available. Bundled demonstration data is never selected implicitly in production. `RISK_ALLOW_DEMO_DATA=true` is an explicit development-only compatibility option and defaults to false when `NODE_ENV=production`.

## Finding lifecycle

- Finding IDs are stable across scans for the same rule, nodes, and relationships.
- A finding that remains detectable retains its original `firstDetected` time and any `ACKNOWLEDGED` or `SUPPRESSED` state.
- An open or acknowledged finding that is absent from a later scan of the same rule is marked `RESOLVED` with `resolution: NO_LONGER_DETECTED`.
- A resolved finding that reappears is reopened. Suppressed findings are not auto-resolved or reopened.
- Partial scans reconcile only the requested rules; they cannot resolve findings owned by rules that did not run.

Only one scan can run in a backend process at a time. A concurrent request returns HTTP 409.

## API

- `POST /risk/scan` starts a scan and returns its `scanId`, detected count, and resolved count.
- `GET /risk/scans?limit=50` lists newest scan runs, including failures.
- `GET /risk/scans/:id` returns one scan run.
- `GET /risk/findings` and `GET /risk/findings/:id` return current findings.
- `PATCH /risk/findings/:id/status` applies an analyst lifecycle decision.
- `GET /risk/summary` returns current aggregate risk metrics.

## Database

Migration `1721640000000-EnterpriseRiskEngine` creates `risk_scan_runs`, with indexes for chronological history and status queries. Migration execution remains automatic at backend startup and is also available through `npm run migration:run --prefix apps/backend`.
