# PostgreSQL persistence

The backend uses TypeORM with PostgreSQL. Schema synchronization is disabled; versioned migrations are the only supported way to change the database schema. Migrations run automatically during application startup and can also be run explicitly.

## Local PostgreSQL

One way to start an isolated local PostgreSQL 16 instance is:

```bash
docker run --name identity-access-graph-postgres \
  -e POSTGRES_USER=identity_graph \
  -e POSTGRES_PASSWORD=local-development-only \
  -e POSTGRES_DB=identity_graph \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Copy `.env.example` to `.env` and set a local connection URL:

```dotenv
DATABASE_URL=postgresql://identity_graph:local-development-only@localhost:5432/identity_graph
DATABASE_CONNECT_TIMEOUT_MS=5000
DATABASE_POOL_SIZE=10
```

Do not commit real passwords or production connection URLs. PostgreSQL TLS and certificate parameters can be supplied through standard PostgreSQL URL query parameters.

## Commands

From `apps/backend`:

```bash
npm ci
npm run migration:run
npm run build
npm run start:prod
```

Revert only the most recently applied migration with:

```bash
npm run migration:revert
```

The health endpoint includes database readiness and returns HTTP 503 when PostgreSQL cannot answer the probe:

```bash
curl http://localhost:3000/health
```

## Integration tests

The PostgreSQL integration suite intentionally drops all objects in its target database. Always use a dedicated disposable test database:

```bash
TEST_DATABASE_URL=postgresql://identity_graph:local-development-only@localhost:5432/identity_graph_test npm run test:integration
```

The suite covers migration apply/idempotence/rollback, CRUD, process-restart hydration, concurrent writes, transactional rollback, and JSON operational-state persistence.

## Persisted state

PostgreSQL stores connector definitions and sync runs; import sessions, mappings, validation, correlation, converted graph data, and parsed rows; imported graph snapshots; risk findings and scan metadata; attack paths and analysis metadata; enterprise identities; and pipeline runs and snapshots.

In-memory maps remain as process-local read-through/write-through caches and as isolated unit-test fallbacks. Uploaded source files remain temporary filesystem artifacts governed by the import session TTL; the parsed import state needed after restart is stored in PostgreSQL.
