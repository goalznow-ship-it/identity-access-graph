# Enterprise import engine

Phase 3 adds a PostgreSQL-backed import queue with worker leases, retries, cancellation, checkpoints, row chunks, history, audit records, reports, statistics, and health monitoring.

## Processing model

`POST /imports/upload` remains available with its original synchronous contract. The frontend and new integrations use `POST /imports/upload-async`, which returns HTTP 202 with the existing `ImportSession` shape. Workers claim jobs using PostgreSQL row locks with `SKIP LOCKED`, allowing multiple backend instances to process different files without duplicate claims.

CSV input uses the streaming `csv-parse` parser and supports quoted fields, embedded delimiters, BOMs, and relaxed column counts. CSV and Excel rows are persisted in bounded PostgreSQL JSONB chunks. Checkpoints are written after every chunk; expired worker leases are reclaimable after a process restart. Excel worksheets are read and emitted in bounded row ranges, although the XLSX library must still open the workbook container in memory.

## Endpoints

- `POST /imports/upload-async` — enqueue files.
- `GET /imports/:id/progress` — live row throughput and progress.
- `POST /imports/:id/cancel` — cancel queued or active jobs.
- `POST /imports/:id/files/:fileId/retry` — reset and requeue a failed file.
- `GET /imports/history` — paginated durable history.
- `GET /imports/:id/jobs` — attempts, checkpoints, and queue state.
- `GET /imports/:id/audit` — ordered lifecycle audit log.
- `GET /imports/:id/validation-report` — durable validation findings.
- `GET /imports/:id/error-report.csv` — downloadable error report.
- `GET /imports/:id/statistics` — file, byte, row, chunk, duplicate, issue, and job totals.
- `GET /health/import-workers` — worker heartbeat, concurrency, errors, and queue depth.

## Configuration

```dotenv
IMPORT_MAX_ROWS_PER_FILE=10000000
IMPORT_CHUNK_SIZE_ROWS=5000
IMPORT_WORKER_CONCURRENCY=2
IMPORT_WORKER_POLL_MS=1000
IMPORT_WORKER_LEASE_MS=60000
IMPORT_MAX_JOB_ATTEMPTS=3
IMPORT_RETRY_BASE_DELAY_MS=1000
```

Uploaded source files are temporary local artifacts. Deployments with multiple worker hosts should place `IMPORT_UPLOAD_DIR` on shared durable storage. PostgreSQL remains the source of truth for jobs, checkpoints, parsed rows, reports, and history.
