# Enterprise administration

Workspace defaults are stored in PostgreSQL operational metadata and exposed under `/admin/settings`. Browser-local settings remain an offline fallback for backward compatibility, while successful API loads and saves synchronize the local cache.

New browser sessions bootstrap their graph source from the shared workspace settings. Both server and client defaults select Neo4j, and automatic fallback to the demonstration graph is disabled. A user-selected source remains tab-independent browser state until changed explicitly. Neo4j explorer source filters accept live source-system values rather than presenting values derived from demonstration data.

The administration page validates graph source, layout, page sizes, Neo4j limits, relationship limits, API timeouts, and boolean presentation/resilience options. Updates and resets create bounded audit events containing the actor, timestamp, action, and changed fields.

## API

- `GET /admin/settings`
- `PUT /admin/settings`
- `POST /admin/settings/reset`
- `GET /admin/settings/history?limit=50`
