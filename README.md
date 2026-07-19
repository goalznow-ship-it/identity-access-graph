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
