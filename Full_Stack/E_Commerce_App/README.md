# E-Commerce App (Nomadant Tech Store)

A full-stack academic e-commerce application with **real GitHub OAuth login**
and **real Stripe sandbox (test-mode) payments**. See
[`Requirements.md`](./Requirements.md) for the full specification. Both
integrations have been verified end-to-end against the live GitHub and Stripe
test APIs (not mocked) during development.

## Repository layout

This is a monorepo with two independently deployable halves. Keeping them in
separate top-level folders lets each be pointed to its own **Root Directory**
when configuring a Render service, so one repo produces two services.

```
E_Commerce_App/
├── backend/   # Node.js + Express + PostgreSQL REST API (Render Web Service)
├── frontend/  # React + Vite + Tailwind storefront SPA (Render Static Site)
└── Requirements.md
```

### `backend/`

- Node.js / Express 5 REST API, PostgreSQL via `pg`.
- Real GitHub OAuth (`GET /auth/oauth/github/start`,
  `GET /auth/oauth/github/callback`), JWT-based sessions (bearer token, no
  server-side session store), real Stripe PaymentIntents
  (`POST /payments/intent`) + webhook handling (`POST /payments/webhook`,
  the sole source of truth for marking a payment "paid").
- Other routes: `/auth` (register/login/me), `/products`, `/carts`,
  `/orders`, `/users`. Full OpenAPI docs served at `/api-docs` when running.
- Scripts run **from inside `backend/`**: `npm install`, `npm start`,
  `npm run dev` (watch), `npm test`, `npm run seed:dev`. `npm start` /
  `npm run dev` open the backend (`/` links to `/api-docs`) in your browser; set `OPEN_BROWSER=false` to
  disable (always disabled when `NODE_ENV=production`).
- Existing databases: apply `migration_002_profiles_addresses_shipments.sql`
  (profiles, delivery addresses, shipments).
- Optional env: `SHIPPO_API_KEY` (Shippo **test** key; without it shipments are
  simulated) and `SHIP_FROM_*` (sender address).
- Payments: status is reconciled directly with Stripe, so the webhook is
  optional locally but recommended. Local: `stripe listen --forward-to
  localhost:3000/payments/webhook` and put the printed `whsec_` in
  `STRIPE_WEBHOOK_SECRET`. Render: add a webhook endpoint
  `https://<backend>/payments/webhook` for `payment_intent.succeeded` and
  `payment_intent.payment_failed` and use its signing secret.
- GitHub sign-in ends on a confirmation screen (continue as the returned
  account or pick a different one).
- Entry point: `backend/bin/www`. App wiring: `backend/src/app.js`.
- Env file: `backend/src/.env`. Copy `backend/src/.env.example` to
  `backend/src/.env` and fill in real values — **never commit the real
  `.env` file** (it's already gitignored).

### `frontend/`

- React 19 SPA built with Vite, styled with Tailwind CSS v4, using Google
  Fonts (Inter for body text, Poppins for headings).
- Talks to the backend API via `fetch` (see `frontend/src/api/`), stores the
  JWT in `localStorage`, and embeds **Stripe Elements** (Payment Element) for
  checkout.
- Pages: Home/product listing, Product Detail, Login, Register, OAuth
  callback, Cart, Checkout, Order History, Order Detail, 404. Protected
  routes (cart, checkout, orders) redirect unauthenticated users to
  `/login`.
- Login page offers **Continue with GitHub** (fully functional) plus
  disabled "Coming soon" buttons for Google and Microsoft, alongside
  email/password login, per the project's design decisions.
- Env file: `frontend/.env`. Copy `frontend/.env.example` to `frontend/.env`
  and fill in real values.
- Scripts run **from inside `frontend/`**: `npm install`, `npm run dev`,
  `npm run build`, `npm run lint`, `npm test` (Vitest + Testing Library),
  `npm run preview` (builds, then opens the preview).

## Local development setup

### Consolidated database schema

The shared `pg` pool in `backend/src/db.js` awaits `SET search_path TO
nomadant_tech, public` on every new connection, including replacement connections.
Both `pool.query()` and checked-out clients (transactions and seed scripts) use
this path. A missing or inaccessible `nomadant_tech` schema rejects the connection
instead of falling back to `public`.

For Render, keep `DATABASE_URL` in the environment and use the Supabase **shared
session pooler on port 5432**, which supports IPv4. Do not use the transaction
pooler on port 6543: session settings do not reliably persist between transactions.
Keep `DB_SSL=true`. No credentials or database objects are changed by this fix.

The schema and tables must already exist, including in local/test databases.
The database role needs schema `USAGE` plus the existing table/sequence privileges.
`public` remains a fallback for shared objects; do not allow untrusted users to
create objects in either schema. Standalone SQL tools do not use this pool and
must set their own search path. Existing integration tests drop and recreate
tables: run them only against a disposable test database, never production.

After redeploying, check `GET /products`, `GET /products/:id`, authenticated
`GET /carts/me` (not `/cart`), and authenticated `GET /orders`.

1. **Database**: create a PostgreSQL database and apply
   `backend/migration_001_oauth_stripe_images.sql` (plus any earlier/base
   schema migrations) against it. Run `npm run seed:dev` from `backend/` to
   seed sample products and an admin user (`admin@example.com` /
   `Password123!`, set in the seed script).
2. **GitHub OAuth App**: create one at
   <https://github.com/settings/developers>.
   - Homepage URL: `http://localhost:5173` (the frontend).
   - Authorization callback URL:
     `http://localhost:3000/auth/oauth/github/callback`. GitHub OAuth Apps
     support up to 10 callback URLs, so you can add the production callback
     later on the same app without creating a new one.
   - Copy the Client ID/Secret into `backend/src/.env`.
3. **Stripe test-mode keys**: get your publishable/secret keys from
   <https://dashboard.stripe.com/test/apikeys>. Put the secret key in
   `backend/src/.env` (`STRIPE_SECRET_KEY`) and the publishable key in
   `frontend/.env` (`VITE_STRIPE_PUBLISHABLE_KEY`).
4. **Stripe webhook (local)**: install the
   [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:
   ```
   stripe listen --forward-to localhost:3000/payments/webhook \
     --events payment_intent.succeeded,payment_intent.payment_failed
   ```
   Copy the `whsec_...` it prints into `backend/src/.env` as
   `STRIPE_WEBHOOK_SECRET`. This value is **ephemeral** — if you restart
   `stripe listen`, update `.env` and restart the backend again.
5. **Run both servers** (from their respective folders):
   ```
   # backend/
   npm install && npm start      # http://localhost:3000

   # frontend/
   npm install && npm run dev    # http://localhost:5173
   ```
6. **Test a payment**: add an item to the cart, place an order, and pay with
   Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any
   ZIP. The order should flip to "Paid" once the webhook is delivered.

## Render deployment (two services from one repo)

1. **Backend — Web Service**
   - Root Directory: `Full_Stack/E_Commerce_App/backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment variables: `DATABASE_URL` (Supabase shared session-pooler URL,
     port 5432), `DB_SSL=true`, `JWT_SECRET`,
     `FRONTEND_URL` (deployed frontend URL), `CORS_ORIGIN` (deployed frontend
     URL), `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`,
     `GITHUB_REDIRECT_URI` (`https://<backend>.onrender.com/auth/oauth/github/callback`),
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
   - After the service is live, register its callback URL on the GitHub
     OAuth App (in addition to the local one), and create a webhook
     endpoint in the Stripe Dashboard pointing at
     `https://<backend>.onrender.com/payments/webhook` (events
     `payment_intent.succeeded`, `payment_intent.payment_failed`) — use the
     signing secret it generates for `STRIPE_WEBHOOK_SECRET` in production
     (the Stripe CLI secret is local-only).
   - The consolidated database already contains the application tables in
     `nomadant_tech`; do not recreate or move them during this deployment.
2. **Frontend — Static Site**
   - Root Directory: `Full_Stack/E_Commerce_App/frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment variables: `VITE_API_BASE_URL` (deployed backend URL),
     `VITE_STRIPE_PUBLISHABLE_KEY` (same Stripe test-mode account as the
     backend's secret key).

Because each service's Root Directory is scoped to its own subfolder, Render
only rebuilds/redeploys that service when files under its folder change.

## Notes

- This app is for academic purposes and is wired to **Stripe test mode**
  only — no real charges are ever possible with the keys/flow described
  here.
- GitHub OAuth is real (not mocked): signing in links your actual GitHub
  account identity (name/email) to a user record in this app's database.

### Admin: users and pay-on-behalf

Admins get a **Manage users** page (`/admin/users`) with full CRUD (create, edit profile/role, reset password, deactivate/reactivate; admins cannot deactivate or delete themselves). From **Manage orders**, *Take payment* on a pending order asks which user to assign the order to, then opens the Stripe payment form and pays on that user's behalf (`PUT /orders/{id}` with `userId`, admin only).

**Vendor role:** vendors can manage products and orders (list all orders, change status, create shipments) but cannot access user management or reassign orders; those remain admin-only.

**Staff order editing:** admins and vendors can change an order's customer (not once paid), delivery address, item quantities (pending, unpaid orders only) and shipment (manual create, update, delete) from **Manage orders > Edit order**. Only admins can change an order's payment status. Order updates are atomic (all changes apply or none). Orders can only be cancelled while pending or paid (`DELETE /orders/{id}` or `PUT` with `status: cancelled`), and payments can only be started for pending, unpaid orders; otherwise the API returns 409. GitHub sign-in only accepts a verified GitHub email. Related endpoints: `PUT /orders/{id}`, `PUT|DELETE /orders/{id}/shipment`, `GET /users/lookup`.
