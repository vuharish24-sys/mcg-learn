# MCG Learn V1.1

Production-ready learning and career operations for Medical Coding Global. V1.1 completes feed actions, CRM notes, referral tracking, ad analytics, self-registration, and role-specific dashboards on top of V1.

## Requirements

- Node.js 22
- npm 10+
- A Supabase project with PostgreSQL and Storage enabled

## Local setup

1. Copy `.env.example` to `.env.local` and enter the Supabase and database values.
2. Apply the schema and seed required roles and categories:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

3. In Supabase Authentication, enable **Confirm email**, add site URL/callback URLs, then create an email/password user matching `BOOTSTRAP_ADMIN_EMAIL`. Run `npm run db:seed` again to promote that profile to Admin.
4. Run `npm run dev` and open `http://localhost:3000`.

## Supabase configuration

- Keep public sign-up enabled for `/register`, or restrict it if accounts must be staff-controlled.
- Enable email confirmation for verification after self-registration.
- Add the deployed site URL in Authentication > URL Configuration.
- The migration creates the public `learning-content` Storage bucket and application-profile trigger.
- `DATABASE_URL` uses the transaction pooler on port 6543. `DIRECT_URL` uses the direct connection on port 5432.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

New Supabase users are provisioned as Learners. Admins can change roles from Administration.

## API

Responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message": "...", "details": ... } }`.

- `POST /api/v1/auth/register`
- `GET/POST /api/v1/feed`
- `GET /api/v1/feed/:id/open`
- `POST /api/v1/feed/:id/register`
- `GET/POST /api/v1/leads`, `GET/PATCH /api/v1/leads/:id`
- `GET/POST /api/v1/leads/:id/notes`, `PATCH /api/v1/leads/:id/notes/:noteId`
- `GET/POST /api/v1/trainers`, `PATCH /api/v1/trainers/:id`
- `GET/POST /api/v1/referrals`
- `GET /api/v1/referrals/validate`
- `POST /api/v1/referrals/claim`
- `PATCH /api/v1/referrals/:id`
- `GET/POST /api/v1/certificates`
- `GET /api/v1/certificates/:id/pdf`
- `GET/POST /api/v1/advertisements`
- `GET/POST /api/v1/categories`
- `GET/POST /api/v1/settings`
- `PATCH /api/v1/users/:id`

Every authenticated endpoint verifies a Supabase session. Mutations enforce roles and validate input with Zod.

## Netlify deployment

1. Push the repository and create a Netlify site.
2. Add every variable from `.env.example`, setting `NEXT_PUBLIC_APP_URL` to the production URL.
3. Run `npm run db:migrate && npm run db:seed` against production from a secured workstation or CI migration job.
4. Deploy. `netlify.toml` configures Node 22, Prisma generation, and the Next.js adapter.

Migrations run separately from web deploys to avoid concurrent migration attempts.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Architecture

- `src/app`: pages and REST routes
- `src/components`: shared shadcn-style UI, forms, auth, and layouts
- `src/services`: module-level database operations
- `src/lib`: Prisma, Supabase, validation, authorization, and API helpers
- `src/types`: shared types
- `prisma`: schema, seed, and immutable SQL migrations

The browser never accesses application tables directly. Server Components and API routes use Prisma; Supabase Auth provides verified identity and cookie sessions.
