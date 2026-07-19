# Authentication and authorization

The platform uses signed bearer tokens and three inherited roles: `VIEWER`, `ANALYST`, and `ADMIN`. Viewers can use read APIs, analysts can also execute risk and attack-path analyses, and administrators can perform every mutation and access administration pages.

Authentication is enabled by default when `NODE_ENV=production`. Set `AUTH_ENABLED=true` explicitly in other deployed environments. A production configuration must provide a `JWT_SECRET` of at least 32 characters and at least one user through either:

- `AUTH_USERS_JSON`, a JSON array of users with `id`, `username`, `displayName`, `password`, and `role`.
- `AUTH_ADMIN_USERNAME` and `AUTH_ADMIN_PASSWORD`, for a single bootstrap administrator.

`AUTH_TOKEN_TTL_SECONDS` controls session lifetime and accepts 300 through 86400 seconds. The default is eight hours. Credentials are used only for verification and are never returned by the API.

The web client stores its bearer token in tab-scoped session storage, adds it to API requests and authenticated exports, clears expired sessions on `401`, and redirects protected routes to `/login`. Administrative navigation is hidden for unauthorized roles, while the backend remains the authoritative enforcement layer.

For local backward-compatible development, `AUTH_ENABLED=false` supplies a development administrator context without requiring login. Never use that mode for a deployed environment.

## API contract

- `POST /auth/login` accepts `{ "username": "...", "password": "..." }` and returns the access token, expiry, and user.
- `GET /auth/me` returns the current user and whether authentication is enabled.
- Protected requests use `Authorization: Bearer <token>`.

Health endpoints remain public so infrastructure probes do not require credentials.
