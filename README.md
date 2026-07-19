# Identity Access Graph Platform

A platform for modeling, visualizing, and managing complex identity and access relationships using graph-based data structures. This project provides shared type definitions, graph models, and mock data for building identity and access management (IAM) solutions.

## Structure

| Directory | Purpose |
|---|---|
| `apps/frontend` | Frontend application |
| `apps/backend` | Backend application |
| `packages/shared-types` | Shared TypeScript type definitions |
| `packages/graph-model` | Graph data model and algorithms |
| `packages/mock-data` | Mock/fixture data for development |
| `docs` | Documentation |
| `docker` | Docker configuration files |
| `scripts` | Utility scripts |

## PostgreSQL

PostgreSQL is required for backend runtime state. See [docs/POSTGRESQL.md](docs/POSTGRESQL.md) for local setup, migrations, health checks, and integration-test commands.

The production import queue and reporting APIs are documented in [docs/ENTERPRISE_IMPORT_ENGINE.md](docs/ENTERPRISE_IMPORT_ENGINE.md).

Neo4j graph versioning, snapshots, traversal, indexes, and operational commands are documented in [docs/ENTERPRISE_GRAPH_ENGINE.md](docs/ENTERPRISE_GRAPH_ENGINE.md).

Durable risk scan history and finding lifecycle reconciliation are documented in [docs/ENTERPRISE_RISK_ENGINE.md](docs/ENTERPRISE_RISK_ENGINE.md).

Enterprise attack-path discovery, blast radius, choke points, history, exports, and APIs are documented in [docs/ENTERPRISE_ATTACK_PATH_ENGINE.md](docs/ENTERPRISE_ATTACK_PATH_ENGINE.md).

Durable operational alerts and the notification center are documented in [docs/ENTERPRISE_NOTIFICATIONS.md](docs/ENTERPRISE_NOTIFICATIONS.md).

Shared workspace configuration and settings audit history are documented in [docs/ENTERPRISE_ADMINISTRATION.md](docs/ENTERPRISE_ADMINISTRATION.md).

Neo4j-backed identity, group, access, and relationship inventory contracts are documented in [docs/ENTERPRISE_EXPLORERS.md](docs/ENTERPRISE_EXPLORERS.md).
