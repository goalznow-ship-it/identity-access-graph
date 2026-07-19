# Pipeline operations

The pipeline processes an authoritative snapshot through extraction, normalization, identity matching, relationship resolution, graph construction, validation, persistence preparation, and scheduling stages. Each run and its stage snapshots are retained in PostgreSQL so operations state survives restarts.

In production, Neo4j is the required pipeline input. `GET /pipeline/input-status` reports whether input is ready, which source will be used, and whether that source is production-safe. Start and step controls are disabled in the UI when no valid source is available.

`PIPELINE_ALLOW_DEMO_DATA` is a development compatibility switch. It defaults to `false` in production and should remain false in deployed environments. When explicitly enabled without Neo4j, pipeline runs are labeled `demo` in the operations UI. Resetting a run discards its input snapshot, so the next start or step reloads the latest Neo4j graph.

The pipeline exports at most 50,000 nodes and 50,000 relationships for a run. Graphs beyond that bound fail with `413 Payload Too Large`; the service never silently processes a truncated graph. Neo4j connectivity/configuration failures retain their original HTTP status instead of being converted to pipeline-state conflicts.

Administrative endpoints are:

- `GET /pipeline/state`, `/pipeline/snapshots`, and `/pipeline/input-status` for operational inspection.
- `POST /pipeline/start`, `/pause`, `/resume`, `/next`, `/previous`, `/replay`, and `/reset` for lifecycle control.

All pipeline routes require an authenticated administrator under the platform RBAC defaults.
