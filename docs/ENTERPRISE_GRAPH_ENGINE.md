# Enterprise graph engine

Neo4j is the primary graph database; PostgreSQL remains the operational database and stores graph-version metadata and immutable snapshot payloads. Set `NEO4J_ENABLED=true` and configure the Bolt connection before starting the backend. Schema constraints and indexes are applied idempotently during application startup.

## Versioned writes

`POST /graph/versions` accepts nodes, relationships, and explicit deletion IDs. Each request creates a PostgreSQL version record, applies incremental Neo4j mutations, stamps nodes and relationships with `graphVersion`, and records soft deletion using `deletedVersion`. Failed versions remain visible in operational history. Imported graphs automatically use this versioned path.

```json
{
  "source": "connector:entra-production",
  "description": "Incremental directory synchronization",
  "nodes": [],
  "relationships": [],
  "deleteNodeIds": [],
  "deleteRelationshipIds": []
}
```

Current graph APIs exclude objects with a deletion version.

## APIs

- `GET /health/neo4j` — connectivity, database, server, and latency.
- `GET /graph/statistics` — active node/edge counts, types, and latest version.
- `GET /graph/versions` — ordered version history.
- `POST /graph/versions` — incremental versioned mutation.
- `GET /graph/snapshots` — immutable snapshot catalog.
- `POST /graph/snapshots` — capture the active graph.
- `GET /graph/snapshots/diff?from=...&to=...` — added, updated, and removed nodes/edges.
- `GET /graph/shortest-path?source=...&target=...&maxDepth=...` — native directed shortest path.
- `GET /graph/blast-radius/:id?maxDepth=...` — downstream reachability and minimum depths.
- `/attack-path/*` — scored privilege-aware attack-path traversal using Neo4j when `graphSource=neo4j`.

## Indexes

The startup schema creates unique identity constraints, property indexes for node type, source, status, risk, lookup fields, and temporal versions, a full-text node search index, and typed edge indexes for IDs and temporal properties across privilege-bearing relationships.

## Local Neo4j

```bash
docker run --name identity-access-graph-neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/local-development-password \
  -d neo4j:5-community
```

```dotenv
NEO4J_ENABLED=true
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=local-development-password
NEO4J_DATABASE=neo4j
NEO4J_ENCRYPTED=false
```

Run the graph integration suite only against disposable PostgreSQL and Neo4j databases:

```bash
TEST_DATABASE_URL=postgresql://... \
TEST_NEO4J_URI=bolt://localhost:7687 \
TEST_NEO4J_USERNAME=neo4j \
TEST_NEO4J_PASSWORD=... \
npm run test:graph-integration --prefix apps/backend
```
