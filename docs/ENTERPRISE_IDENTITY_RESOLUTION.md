# Enterprise identity resolution

Enterprise identities are durable operational records stored in PostgreSQL. Source identities remain authoritative graph nodes in Neo4j.

The Enterprise Identity page can scan Neo4j identity node types for correlation candidates, filter candidates with the configured confidence threshold, preview a candidate against a selected enterprise identity, and explicitly confirm the merge. A preview is side-effect free and reports new sources, compared fields, and newly introduced conflicts. Confirmed merges re-read the node from Neo4j rather than trusting browser-supplied attributes, then update the PostgreSQL identity record, timeline, conflicts, and statistics.

Relevant endpoints:

- `POST /identity/enterprise/correlate`
- `GET /identity/enterprise/:id/merge-preview?targetId=...`
- `POST /identity/enterprise/:id/merge`
- `GET /identity/enterprise/:id/timeline`
- `GET /identity/enterprise/:id/conflicts`

Neo4j must be enabled for correlation, preview, and merge because these operations require authoritative graph nodes. Existing enterprise identity reads remain available from PostgreSQL independently.
