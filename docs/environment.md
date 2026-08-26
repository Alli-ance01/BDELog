# BDELog production environment variables

## Vercel frontend

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://bdelog-api.onrender.com/api` | The public base URL of the Render Express API. No trailing slash. |

Vite variables are embedded into the browser build. Never put MongoDB credentials, JWT secrets, or administrative passwords in Vercel variables beginning with `VITE_`.

## Render backend

| Variable | Example or format | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production-safe Express behaviour. |
| `PORT` | `5000` | Render supplies this automatically; the server must read it dynamically. |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string with a least-privilege application database user. |
| `CLIENT_ORIGIN` | `https://bdelog.alliancedev.online` | The single allowed browser origin for CORS and cookies. |
| `JWT_SECRET` | Long random secret | Signs administrator sessions. Generate at least 64 random characters and do not reuse it elsewhere. |
| `JWT_EXPIRES_IN` | `8h` | Maximum administrator session lifetime. |
| `COOKIE_NAME` | `bdelog_session` | HTTP-only session-cookie name. |
| `COOKIE_DOMAIN` | Leave empty initially | Optional only when frontend and API share a parent domain such as `.alliancedev.online`. |
| `COOKIE_SAME_SITE` | `none` in production | Cookie policy for a separately hosted frontend and API. Use `lax` for local development. |
| `CSRF_HEADER_NAME` | `x-bdelog-csrf` | Expected header name for state-changing administrative requests. |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit time window in milliseconds. |
| `RATE_LIMIT_MAX` | `120` | Maximum allowed requests per window per IP for public submission routes. |
| `ADMIN_EMAIL` | Administrator email address | One-time administrator seed identity. Remove or rotate after the first seed. |
| `ADMIN_PASSWORD` | Strong one-time password | One-time administrator seed password. Never commit it or leave it active permanently. |
| `ADMIN_DISPLAY_NAME` | `Regional Sales Manager` | Display name used by the one-time seed process. |

## MongoDB Atlas setup

Create a dedicated database user with access restricted to the BDELog database, paste the Atlas SRV connection string into `MONGODB_URI`, and add Render’s outbound IP policy if your Atlas network policy is restrictive. Do not use a personal Atlas account or an all-database administrator credential for the application connection.

## Custom-domain note

If the frontend is `bdelog.alliancedev.online` and the API is on an unrelated `onrender.com` host, cross-site cookie behaviour can be constrained by browser privacy settings. The preferred production arrangement is to map an API subdomain such as `api.bdelog.alliancedev.online` to Render and set `CLIENT_ORIGIN=https://bdelog.alliancedev.online`. `COOKIE_DOMAIN=.alliancedev.online` can then be configured once both hosts are live under the same parent domain.
