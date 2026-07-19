# Enterprise notifications

Notifications are durable operational records stored in PostgreSQL. Risk scans create completion or failure notifications with links back to the findings workspace. The navbar polls for changes, displays unread counts, and supports read, mark-all-read, delete, loading, empty, and retry states.

## API

- `GET /notifications` supports `unread`, `type`, `severity`, `search`, `limit`, `offset`, and `sort=newest|oldest|severity`.
- `POST /notifications` creates an internal application notification. Links must be application-relative.
- `PATCH /notifications/:id/read` marks one notification read or unread.
- `PATCH /notifications/read-all` marks all current notifications read.
- `DELETE /notifications/:id` permanently removes a notification.

Migration `1721812800000-EnterpriseNotifications` creates the indexed `notifications` table. Notification failures do not fail the risk scan that generated them.
