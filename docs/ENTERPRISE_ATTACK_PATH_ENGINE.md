# Enterprise attack path engine

The attack path engine uses Neo4j for graph traversal and PostgreSQL for operational history. Memory graph mode remains available for imported-data previews and deterministic tests.

## Analysis capabilities

- `shortest` uses breadth-first traversal to find minimum-hop paths.
- `weighted` uses a deterministic exposure-cost model that prioritizes privilege-bearing edges over weaker infrastructure and business dependencies.
- `all` discovers multiple simple paths up to the configured depth and result limits.
- Blast radius reports reachable nodes, privileged targets, and maximum traversal depth.
- Choke points rank intermediate nodes by the percentage of discovered paths they control.
- Dedicated analyses cover privilege escalation, identity-to-application access, and application-to-database access.
- Every path includes a bounded 0–100 score, severity, confidence, factor breakdown, evidence, and mitigations.

Traversal is bounded to depth 12, 200 returned paths, and a 30-second request timeout. Relationship types are allowlisted and Neo4j parameters are passed separately from Cypher.

## REST API

- `POST /attack-path/search` — shortest, weighted, or multiple path discovery.
- `POST /attack-path/escalation` — privilege-bearing relationship analysis.
- `POST /attack-path/identity-to-application/:nodeId`
- `POST /attack-path/application-to-database/:nodeId`
- `POST /attack-path/blast-radius/:nodeId`
- `POST /attack-path/choke-points`
- `GET /attack-path/history` and `GET /attack-path/history/:id`
- `GET /attack-path/export?format=json|csv`
- `GET /attack-path/top`, `/targets`, `/summary`, `/from/:nodeId`, `/to/:nodeId`, and `/:id`

## Persistence

Migration `1721726400000-EnterpriseAttackPathEngine` adds `attack_path_runs`. Run status, input, counts, errors, and timing are stored in PostgreSQL. Discovered paths remain in `attack_paths`; analyses append or update stable path IDs rather than deleting unrelated prior results.

## Verification

Run `npm run check` for all builds and unit/integration-contract tests. Run `npm run smoke:attack-path --prefix apps/backend` for the runtime controller smoke test. With `TEST_DATABASE_URL` and Neo4j integration variables configured, run the existing database and graph integration commands as documented in `POSTGRESQL.md` and `ENTERPRISE_GRAPH_ENGINE.md`.
