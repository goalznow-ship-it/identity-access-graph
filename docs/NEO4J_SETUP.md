# Neo4j backend setup

Neo4j is the authoritative production graph database. Imported PostgreSQL-backed graph snapshots remain available for staged ingestion and recovery workflows when live Neo4j is unavailable.

Production frontend builds expose only Neo4j and imported graph sources. The bundled demonstration dataset can be enabled deliberately for training or evaluation builds with `VITE_DEMO_DATA_ENABLED=true`; this is a Vite build-time setting and must remain disabled in production.

## Local Docker Compose

```yaml
services:
  neo4j:
    image: neo4j:5-community
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: "neo4j/change-this-local-password"
    volumes:
      - neo4j_data:/data
volumes:
  neo4j_data:
```

Use development-only credentials in local Compose files and keep those files out of source control when they contain secrets.

## Environment

Set `NEO4J_ENABLED=true`, `NEO4J_URI=neo4j://localhost:7687`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD`. Optional settings are `NEO4J_DATABASE` (default `neo4j`), `NEO4J_ENCRYPTED` (default `true`), and `NEO4J_QUERY_TIMEOUT_MS` (default `30000`). Never commit populated `.env` files.

Start Neo4j with `docker compose up -d neo4j`, then start the backend with `npm run start:dev --prefix apps/backend`. Check connectivity at `GET /health/neo4j`; disabled installations return a safe `disabled` response.

## Schema bootstrap

`GraphSchemaService.bootstrap()` creates idempotent `GraphNode` constraints and search indexes using `IF NOT EXISTS`. Invoke it from controlled deployment/bootstrap tooling after connectivity succeeds. It is intentionally not forced during application startup.

## Security

Use a least-privilege Neo4j account, encrypted transport outside isolated local development, secret injection from the deployment platform, network allowlists, and regular credential rotation. The API never exposes credentials or arbitrary Cypher execution. Application values are passed as query parameters.

## Import persistence

Import conversion remains in memory. After Phase 3 conversion, `POST /imports/:importId/persist` writes its current graph preview through batch `UNWIND`/`MERGE` operations and returns counts, conflicts, skipped records, and duration. Future work can persist the complete conversion stream without removing the existing preview lifecycle.
