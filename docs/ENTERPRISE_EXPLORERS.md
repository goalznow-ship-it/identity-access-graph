# Enterprise explorers

Identity, group, role, policy, and access inventories use the Neo4j-backed graph explorer API in live mode. Imported-session and demonstration sources retain client-side compatibility.

`GET /graph/explorer/nodes` supports matching across display name, ID, username, and email; multi-value node type, source, risk, and status filters; bounded offset pagination; and allowlisted sorting. `GET /graph/explorer/relationships` provides the corresponding relationship inventory contract with endpoint names.

The shared explorer UI supplies loading, error, retry, and empty states; source and risk filtering; ascending/descending sorting; pagination; keyboard-accessible rows; graph/profile navigation; and JSON/CSV export of the visible result set.
