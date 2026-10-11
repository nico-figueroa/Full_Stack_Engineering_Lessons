# Intakewise — Drug Intake Organizer

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

Intakewise is a responsive organizer for medication, supplement, vitamin, and custom intake schedules. It lets an account holder manage a private item catalog, view proposals in a calendar, adjust or skip individual intakes, and inspect public drug-label information. The application is an organizational tool only; it does not diagnose, prescribe, or determine whether an intake is safe.

> The [MVP specification](./docs/MVP.md) is the source of truth for product intent. This repository implements PostgreSQL (not SQLite), as specified there.

## Screenshots

Replace these placeholders with current product screenshots:

| Dashboard | Calendar |
| --- | --- |
| ![Dashboard screenshot placeholder](./docs/screenshots/dashboard.png) | ![Calendar screenshot placeholder](./docs/screenshots/calendar.png) |

| Item details | Reference information |
| --- | --- |
| ![Item details screenshot placeholder](./docs/screenshots/item-details.png) | ![Reference page screenshot placeholder](./docs/screenshots/references.png) |

## Features

- Email/password registration and sign-in using bcrypt password hashing.
- Short-lived JWT access tokens and rotating, revocable refresh sessions.
- Account-scoped item, schedule, and override APIs; admin-only user listing.
- CRUD for medication, supplement, vitamin, custom, and other catalog categories.
- Daily, weekly, weekdays, and periodic schedule proposals.
- Month, week, day, and agenda views powered by React Big Calendar.
- One-time intake edits, additions, and skips from the calendar.
- Item notes, saved warnings, interaction-profile notes, and reference links.
- Cached DailyMed and openFDA public drug-label data, when a matching label exists.
- Projected stock run-out estimates based on scheduled intakes.
- Responsive navigation, saved light/dark theme, and toast feedback.
- PostgreSQL migrations run before the API starts.

## Architecture

```text
Browser
  React 19 + Vite + Tailwind CSS v4 + React Router
  React Big Calendar + date-fns
       │ HTTPS / JSON, JWT bearer access token
       ▼
Node.js / Express API
  auth · items · schedule · overrides · stock · interactions · reference
       ├── PostgreSQL (users, items, auth sessions, overrides, source caches)
       ├── DailyMed SPL API (label search and sections)
       └── openFDA drug-label API (public label fields)
```

The frontend is in `frontend/`; the API, SQL migrations, and backend tests are in `backend/`. API data is scoped by the authenticated user ID. Database access uses parameterized PostgreSQL queries. `backend/src/server.js` runs the ordered SQL migrations once before accepting requests.

### Public reference data and safety

The API queries DailyMed and openFDA and caches returned profiles for 24 hours. A label lookup can return no match; a missing section is not evidence that no warning or interaction exists. Reference endpoints include errors when a source is unavailable and do not synthesize clinical recommendations. User-entered notes and warnings are kept distinct from source data. Always consult a pharmacist or healthcare professional.

### Label matching and manual review

Brand names alone can match the wrong product (for example, "Milli" matched the antiperspirant "MILLIONAIRE" instead of the "Mili" norgestimate/ethinyl estradiol tablets). To prevent false matches:

- The item form has an optional **Product identifiers** section: active ingredients, manufacturer, NDC code, dosage form, and strength. These come from the package or pharmacy label.
- `backend/src/services/labelMatcher.js` scores every DailyMed candidate. An exact NDC match is decisive; matching ingredients, manufacturer, and name raise the score; conflicting ingredients lower it; cosmetic/OTC-personal-care labels are rejected for medications, supplements, and vitamins.
- A label is used automatically only when its score is high enough and no candidate with different ingredients scores close to it. Otherwise the match status becomes `needs_review` and no label content is shown.
- Statuses are stored in `items.reference_data.match_status`: `auto`, `needs_review`, `confirmed` (user picked a label), or `no_label` (user said none apply). The status is saved whenever a reference, interaction, or schedule lookup analyzes the item. A user's `confirmed` or `no_label` decision is never overwritten automatically; editing the item name or identifiers clears it so the item is re-evaluated.
- Item cards show **⚠ Requires manual review** for `needs_review` items. The item detail page lets the user search candidates, choose the correct label, mark that no listed label applies, or return to automatic matching.

### Schedule and stock assumptions

Time-of-day labels map to calendar display times (`morning` → 08:00, `noon` → 12:00, `afternoon` → 14:00, `evening` → 18:00, `bedtime`/`night` → 21:00). Weekly entries are proposed on Mondays; a frequency such as `weekly:2` uses Sunday=0 through Saturday=6. `every:Nd` is anchored to UTC day-number multiples because the MVP schema does not store a per-item start date. Stock projections assume one inventory unit is consumed per scheduled intake and do not represent verified or recorded consumption.

## Requirements

- Node.js 20 or later and npm.
- PostgreSQL 15 or later (a managed PostgreSQL instance is supported).
- Internet access from the API for live DailyMed/openFDA lookups. The app remains usable when reference sources are unreachable; source retrieval errors are shown.

## Local installation

1. Create a PostgreSQL database and copy the environment templates below into `backend/.env` and `frontend/.env`.
2. Install and start the API:

   ```powershell
   cd Full_Stack\Intakewise\backend
   npm install
   npm run dev
   ```

   The API applies pending migrations when it starts. If it finds a complete pre-ledger schema, it validates the required baseline columns, records migrations 001–004 as already present, then applies later migrations without replaying the initial `CREATE TABLE` statements. An incomplete or mismatched schema stops startup without changing application tables or data. Back up the database before manually reconciling migration history. The health endpoint is `http://localhost:5000/health`.

3. In another terminal, install and start the frontend:

   ```powershell
   cd Full_Stack\Intakewise\frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL (normally `http://localhost:5173`) and create an account.

The API requires a database and a strong `JWT_SECRET`; it intentionally exits during startup if either is missing. Do not commit environment files or production credentials.

### Environment variables

`backend/.env`:

```dotenv
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/drug_intake_organizer
DATABASE_SSL=false
# Optional custom root CA. Prefer a path to the provider's .crt file; DATABASE_SSL_CA_FILE wins if both are set.
# DATABASE_SSL_CA_FILE=./certs/prod-ca-2021.crt
# DATABASE_SSL_CA=-----BEGIN CERTIFICATE-----...
DB_POOL_MAX=10
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
CLIENT_ORIGIN=http://localhost:5173
```

`DATABASE_SSL=true` enables TLS with certificate verification. If a provider requires a custom root CA, set `DATABASE_SSL_CA_FILE` to the path of its `.crt` file, or set `DATABASE_SSL_CA` to the PEM text (literal `\n` sequences are converted to newlines). The backend fails at startup if `DATABASE_SSL_CA_FILE` points to a file that can't be read. Use TLS for managed database connections.

`frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Vite variables are public and must never contain credentials. The application does not require API keys for DailyMed or openFDA.

### Password reset

1. On the sign-in page choose **Forgot password?**, enter the account email, and submit.
2. The API stores only a SHA-256 hash of a random token that expires after 60 minutes and can be used once.
3. No email provider is configured yet. Outside production, the reset link is shown on the page as a **Development reset link** and is also printed in the backend console with a `[password-reset]` prefix.
4. Open the link (`/reset-password?token=...`), enter a new password (minimum 8 characters) twice, and submit. All existing refresh sessions for that user are revoked, so the user signs in again.
5. Admins can issue a link for any account with `POST /api/admin/users/{id}/password-reset`, which returns `{ email, resetUrl, expiresAt }`.

Optional backend variables:

```dotenv
# true/false; defaults to true unless NODE_ENV=production
PASSWORD_RESET_EXPOSE_LINK=true
# Base URL of the frontend; defaults to the first CLIENT_ORIGIN entry
PASSWORD_RESET_URL_BASE=http://localhost:5173
```

Migration `007_create_password_reset_tokens.sql` runs automatically the next time the backend starts.

Hardening still to do before relying on this in production: send links through an email provider, keep `PASSWORD_RESET_EXPOSE_LINK=false` in production, add stricter per-endpoint rate limits for reset requests, and add audit logging for reset issuance and use.

## API summary

All routes except registration, login, refresh, logout, forgot/reset password, and health require `Authorization: Bearer <accessToken>`. Successful JSON responses are shown schematically.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API liveness |
| `POST` | `/api/auth/register` | Create a user account and session |
| `POST` | `/api/auth/login` | Authenticate and create access/refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate an active refresh token |
| `POST` | `/api/auth/logout` | Revoke a refresh session |
| `POST` | `/api/auth/forgot-password` | Request a password-reset link (generic response) |
| `POST` | `/api/auth/reset-password` | Set a new password with a valid reset token |
| `GET` | `/api/auth/me` | Read the authenticated profile |
| `GET` | `/api/items` | List the current user’s items |
| `POST` | `/api/items` | Create a validated item |
| `GET` | `/api/items/:id` | Read an owned item |
| `PUT` | `/api/items/:id` | Replace an owned item |
| `DELETE` | `/api/items/:id` | Delete an item and its overrides |
| `GET` | `/api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` | Generate proposals, overrides, and saved warnings |
| `GET` | `/api/overrides` | List the current user’s one-time overrides |
| `POST` | `/api/overrides` | Add or replace an intake override |
| `PUT` | `/api/overrides/:id` | Update an owned override |
| `DELETE` | `/api/overrides/:id` | Remove an override |
| `GET` | `/api/interactions` | Retrieve saved and DailyMed label warnings |
| `GET` | `/api/reference/:itemId` | Retrieve a cached official label profile |
| `GET` | `/api/reference/:itemId/candidates?q=` | List scored DailyMed label candidates for manual review |
| `PUT` | `/api/reference/:itemId/match` | Confirm a label (`confirmed` + `setid`), set `no_label`, or reset to `auto` |
| `GET` | `/api/stock` | Read on-hand quantity and estimated run-out |
| `GET` | `/api/admin/users` | List limited account metadata (admin only) |
| `POST` | `/api/admin/users/:id/password-reset` | Issue a password-reset link for a user (admin only) |

## OpenAPI and Swagger UI

Swagger UI is the API documentation portal at `http://localhost:5000/` (and at `/` on the deployed API). It loads the checked-in [OpenAPI 3.1 JSON](./backend/openapi.json), also available at `/openapi.json`. The specification documents authentication, item CRUD, calendar schedules, overrides, interactions, public references, stock estimates, and admin-only user listing.

When an API route changes, update `backend/openapi.json` in the same change:

1. Add or update the path and HTTP operation, including its authentication requirements.
2. Keep path/query parameters, request bodies, status codes, and JSON response schemas aligned with the route and controller.
3. Add or reuse component schemas and response definitions; Swagger UI reads this file directly, so no separate build step is needed.
4. Run `npm run test:openapi` from `backend/` (or `npm test`) and check the spec in Swagger UI.

The route-contract test compares every declared path and method with the Express router, verifies required path parameters and the required schedule query parameters, and checks response-schema structure and `$ref` resolution. A missing/extra route points to a path or method mismatch; parameter failures indicate a missing or incorrectly named required parameter; schema failures indicate a missing response definition, malformed schema, or unresolved reference. This test is structural and does not replace live endpoint integration tests.

Item payloads use `name`, `category`, `dosage_per_intake`, `frequency`, `times_of_day`, `container_quantity`, `interaction_profile`, `reference_data`, `warnings`, and `notes`. Override payloads use `item_id`, `date`, `time`, `dosage`, `notes`, and `is_skipped`. Validation failures return HTTP 400 with field details; unauthenticated, unauthorized, and missing resources return 401, 403, and 404 respectively.

To grant an administrator, first register a regular account, then run this database operation using a privileged database connection:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## Migrating the Database to Supabase

The application currently uses PostgreSQL through the `pg` driver; Supabase PostgreSQL is compatible with that adapter. The frontend must never connect to the database directly. Take a restorable backup, stop writes during the final copy, and verify row counts and application behavior before directing production traffic to the new database.

1. **Export and review the current schema.**
   - For PostgreSQL, use the source database's connection string:

     ```powershell
     pg_dump "$env:SOURCE_DATABASE_URL" --schema-only --no-owner --no-privileges --file schema.sql
     pg_dump "$env:SOURCE_DATABASE_URL" --data-only --no-owner --no-privileges --exclude-table=public.schema_migrations --exclude-table=public.auth_sessions --file data.sql
     ```

     Store these files securely; data exports contain private account and intake information. Review `schema.sql` for extensions, roles, ownership commands, or provider-specific objects. The data export deliberately omits migration history and refresh sessions; users must sign in again after cutover.
   - SQLite dumps are **not** PostgreSQL SQL and cannot be imported with `psql`. Export the schema and representative table data, for example `sqlite3 app.db ".schema" > sqlite-schema.sql` and `sqlite3 -header -csv app.db "SELECT * FROM users;" > users.csv` (repeat for each required table). Convert the schema and CSV data with a tested migration script/tool, mapping IDs, foreign keys, JSON and array fields to the definitions in `backend/migrations/`. Validate in staging, preserve IDs/sequences, and compare per-table row counts. This repository itself targets PostgreSQL, not SQLite.
2. **Create the Supabase project.** Create a project in the Supabase Dashboard, choose the production region, save the database password in a secret manager, and wait for the database to finish provisioning. Use the project's **Connect** panel to obtain the connection string. Supabase recommends direct connections for persistent servers when reachable and the session pooler when an IPv4-only host cannot reach the direct endpoint; use the direct endpoint for migrations and `pg_dump`/`psql`.
3. **Create the target schema and import data.** For a clean Supabase database, set the API's `DATABASE_URL` to the target connection string and start a non-public/staging backend once. Its startup migration runner applies `backend/migrations/001_*.sql` through `007_*.sql` and records the applied versions in `schema_migrations`. Confirm all migrations succeeded before importing source rows. The exported `schema.sql` is for review and conversion planning; do not restore it over the schema created by these migrations. Then, for PostgreSQL source data, import the reviewed data-only dump:

   ```powershell
   psql "$env:SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f data.sql
   ```

   Import before anyone registers in the new database: the dump preserves user IDs, so a pre-created account takes `id = 1` and makes the `users` copy fail. If that happens, empty the application tables (keeping `schema_migrations`) and re-run the import:

   ```sql
   TRUNCATE users, items, schedule_overrides, auth_sessions, password_reset_tokens,
            interaction_cache, reference_cache RESTART IDENTITY CASCADE;
   ```

   For SQLite or other non-PostgreSQL sources, load converted records through a reviewed import script into this already-created schema. If restoring a full pre-existing PostgreSQL schema instead, verify it exactly matches this version's migrations and reconcile its `schema_migrations` ledger before starting the API; the initial migrations are not all idempotent. Never mark migrations applied without verifying schema equivalence. Back up and rehearse the exact procedure in a separate Supabase project before production.
   Check Supabase's Data API exposure and SQL grants for the `public` tables. If tables are reachable through the Data API, enable RLS and either leave `anon`/`authenticated` without table grants or add ownership policies before granting access. This app uses its own JWT and server-side account filters; `auth.uid()` policies alone do not authorize those custom tokens.
4. **Configure the database adapter and environment.** The least disruptive option is to keep `pg`: set Render's backend `DATABASE_URL` to the Supabase direct or session-pooler connection string appropriate for the Render network, `DATABASE_SSL=true`, and optionally `DATABASE_SSL_CA_FILE` (path to the Supabase `.crt`) if the selected endpoint requires a custom CA. Keep `JWT_SECRET`, `CLIENT_ORIGIN`, and `DB_POOL_MAX` configured as described above. Keep parameterized SQL and current server-side user ownership checks. If replacing `pg` with `@supabase/supabase-js`, install a reviewed, pinned version in `backend/` (`npm install --save-exact @supabase/supabase-js@<approved-version>`), commit the lockfile, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` on the backend only, create a server-only client, and rewrite controller data access from `pool.query(...)` to typed `.from("table").select/insert/update/delete(...)` calls. Example server-only client:

   ```js
   import { createClient } from "@supabase/supabase-js";

   export const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SECRET_KEY,
     { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
   );
   ```

   Keep the Supabase secret/service-role key only in Render's backend environment; it bypasses RLS. Continue filtering every query by the authenticated account ID. If you want RLS to enforce ownership instead, migrate authentication to Supabase Auth and pass its user JWT to the database client; this app's existing custom JWT is not a Supabase Auth token and does not populate `auth.uid()`. `supabase-js` is not a drop-in replacement for raw SQL or multi-statement transactions: keep migrations on the PostgreSQL connection/Supabase migration tooling, move transaction work to reviewed SQL migrations/RPCs, and update server startup so it no longer expects the `pg` pool. Do not expose database passwords or secret keys in `VITE_*` variables.
5. **Deploy and verify on Render.** Set the API service's `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET` (32+ random characters), `CLIENT_ORIGIN`, and pool size in Render's secret environment. If using the Supabase client adapter, also set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` there. Keep `VITE_API_URL` set to the deployed API's `/api` URL and redeploy the frontend whenever this build-time variable changes. Confirm the migration completed, test `/health`, sign in, exercise item/schedule/override flows, and compare production row counts before switching traffic. Keep the old database read-only and backed up until validation and rollback checks are complete.

See Supabase's current [database connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) and [migration overview](https://supabase.com/docs/guides/platform/migrating-to-supabase) for connection-mode and project-specific details.

## Complexity and resource notes

Let `D` be schedule days, `N` items, `T` average scheduled times per item, `O` overrides, `E` resulting calendar events, and `W` source warning text size.

| Operation | Time | Additional memory | Notes |
| --- | --- | --- | --- |
| Schedule generation | `O(D × N × T + O + E log E)` | `O(O + E)` | The override map is built once; output is sorted by date/time. |
| Interaction lookup | `O(N² + ΣW)` application processing | `O(ΣW)` | Per-item source/cache lookups run concurrently; pair checks only surface an exact name mention in a cited official label. Same-time slots and same-name dose-entry discrepancies are presented as review notes, never as clinical conclusions. Cache hits avoid repeated external fetches. |
| Override resolution | Expected `O(1)` per schedule slot, `O(O)` to build | `O(O)` | Composite date/item/time keys are indexed in memory; database lookup is account- and date-scoped. |
| Calendar rendering | Approximately `O(E log E)` layout work | `O(E_visible)` | Only the visible month/week/day/agenda range is requested and rendered. |
| API memory | Proportional to the requested range and cached response | Bounded by pool and response limits | Request bodies are capped; PostgreSQL pool size is configurable. Large date ranges should be paginated or capped for multi-user deployments. |

The inventory estimate is a forecast, not an intake log. Actual adherence tracking, notifications, configurable weekly weekdays, and per-item schedule anchors are future work. A schedule overlap or a dose-entry discrepancy is a prompt to verify the information, not proof of a clinical conflict; the app does not prescribe timing or dosage.

## Tests, lint, and build

```powershell
cd Full_Stack\Intakewise\backend
npm test

cd ..\frontend
npm test
npm run test:coverage
npm run lint
npm run build
```

Backend unit tests use Mocha and Chai; frontend tests use Jest and React Testing Library. Run the frontend coverage command exactly as `npm run test:coverage` (no space after the colon). The database is not needed for unit tests; controller and migration tests replace the database connection at the module boundary. A production rollout should additionally run integration tests against an isolated PostgreSQL database.

## Render Deployment Notes

The [Render Blueprint](./render.yaml) describes the free-tier API and static frontend only. The database is hosted in Supabase (see [Migrating the Database to Supabase](#migrating-the-database-to-supabase)); the Blueprint does not create a Render PostgreSQL instance.

1. Push the repository to GitHub and create a new Blueprint in Render, using `Full_Stack/Intakewise/render.yaml` as the Blueprint path.
2. Select the repository; review the paths and generated environment values.
3. When prompted, enter the `sync: false` secrets:
   - `DATABASE_URL`: the Supabase **session pooler** connection string from the project's **Connect** panel (**Connection type → Session pooler**). It is free and IPv4-compatible. Don't use the direct host `db.<project-ref>.supabase.co`: it is IPv6-only unless you buy Supabase's IPv4 add-on, and Render has no outbound IPv6, so it fails with `ENETUNREACH`/`ENOTFOUND`. The session pooler URI looks like `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`. The user is `postgres.<project-ref>`, not `postgres`. Use port `5432` (session mode), not `6543` (transaction mode). URL-encode special characters in the password. Don't append `sslmode` to the URI; TLS is configured by `DATABASE_SSL`/`DATABASE_SSL_CA`. The direct IPv6 host is still fine for `psql`/`pg_dump` from a local machine that has IPv6.
   - **Supabase CA certificate (Secret File):** in Supabase, open **Database Settings → SSL Configuration** and download the certificate (`prod-ca-2021.crt`). In Render, open the `intakewise-api` service → **Environment → Secret Files → Add Secret File**, name it `prod-ca-2021.crt`, paste the file's contents, and save. Render mounts it at `/etc/secrets/prod-ca-2021.crt`, which the Blueprint already sets as `DATABASE_SSL_CA_FILE`. Blueprints can't declare secret files, so this step is manual. The API verifies the server certificate, so startup fails until the file exists. Optionally, under Supabase's **SSL Configuration**, turn on **Enforce SSL on incoming connections** so non-TLS clients are rejected.
   Keep `JWT_SECRET` generated and private. `DB_POOL_MAX` defaults to `5` to stay within the pooler's client limit.
4. Configure the API `CLIENT_ORIGIN` to the deployed static site origin and confirm the frontend `VITE_API_URL` points to the API `/api` base path.
5. Deploy. On first start the API runs migrations `001`–`007` against the empty Supabase database before listening. Then, in Supabase, enable RLS on the created `public` tables (or revoke `anon`/`authenticated` grants) so they aren't reachable through the Data API. Verify `/health`, register a test user, add an item, and check schedule and source lookups.

For separate Render services, set the API root directory to `Full_Stack/Intakewise/backend`, build/start commands to `npm install` and `npm start`, and the static-site root to `Full_Stack/Intakewise/frontend`, with build command `npm install && npm run build` and publish directory `dist`.

On Render's free web-service tier, the backend can sleep while idle. Before sending credentials to `/api/auth/login`, the frontend requests the public `/health` endpoint and polls until it receives HTTP 200. Retries use exponential backoff (starting at one second and capped at eight seconds), individual requests time out, and the overall wake-up wait is capped at two minutes. During this check, the sign-in page displays **“Waking up server…”**; login proceeds only once the API is ready. If the timeout is reached, the user sees an error and can retry. The health endpoint is intentionally unauthenticated so it can be used for readiness checks; it returns status only.

## License

This repository does not currently include a license file. Add one before redistributing the application.
