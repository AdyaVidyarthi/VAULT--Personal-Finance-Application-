# Personal finance API

This backend provides cookie-based authentication and a current-user API. It does not implement transaction, budget, savings, or investment endpoints.

## Setup

1. Create the database and users table by running `sql/schema.sql` with MySQL.
2. Copy `.env.example` to `.env` and set the MySQL connection values and a strong random `SESSION_SECRET`.
3. From this directory, install dependencies with `npm install`.
4. Start the API with `npm start`.

The API creates the MySQL `sessions` table automatically. Sessions expire after 30 minutes without activity by default; each successful request refreshes the timer. Set `SESSION_MAX_AGE_MS` to change the duration. In production, serve over HTTPS and set `NODE_ENV=production`.

## Endpoints

All request and response bodies use JSON. Send `credentials: "include"` from the browser so the session cookie is stored and sent.

### `POST /api/auth/signup`

Request:

```json
{ "name": "Alex Doe", "email": "alex@example.com", "password": "at-least-8-characters" }
```

Creates the account and signs in. Returns `201` with `{ "user": { "id", "name", "email", "createdAt" }, "session": { "expiresAt" } }`. An email already in use returns `409`.

### `POST /api/auth/login`

Request:

```json
{ "email": "alex@example.com", "password": "your-password" }
```

Returns `200` with the same user/session shape. Invalid credentials return `401`.

### `GET /api/auth/me`

Requires the session cookie. Returns `200` with the current user's safe profile and session expiry, or `401` when not signed in.

### `POST /api/auth/logout`

Requires the session cookie. Destroys the session and returns `204`.

### `GET /api/health`

Returns `{ "status": "ok" }`.
