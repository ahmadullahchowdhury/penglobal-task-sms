# Deployment guide: Neon + Vercel

Deploys the app with a Neon PostgreSQL database and Vercel hosting. About 15 minutes.

> **Read this first: uploads.** `lib/storage.ts` writes submissions to local disk. Vercel's
> filesystem is read-only except `/tmp`, and `/tmp` is temporary and not shared between
> serverless instances. Section 5 covers a demo workaround and the real fix.

## What you need

- The code pushed to a GitHub repo (Vercel imports from it).
- A Neon account and a Vercel account (free tiers are enough).
- Node 20.9+ and `npm install` done locally. Migrations and seeding run from your machine.

## 1. Create the Neon database

1. In the Neon console, create a project. Pick the region closest to where you will deploy Vercel functions (the Vercel default is Washington D.C., `iad1`).
2. On the project dashboard click **Connect**. Neon shows two connection strings for the same database:
   - **Pooled** (host contains `-pooler`): for the running app.
   - **Direct** (no `-pooler`): for migrations and seeding.
3. Copy both. Make sure each ends with `?sslmode=require`.

Why two: Vercel runs many short-lived functions, and the pooler stops them exhausting Postgres connections. Prisma migrations need a normal session, so they use the direct string.

## 2. Create the tables and demo data

`prisma.config.ts` reads one variable, `DATABASE_URL`, so point it at the **direct** string for this step only.

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
npx prisma migrate deploy     # applies prisma/migrations, never prompts, never resets
npm run db:seed               # optional demo data, safe to run again
```

Bash:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
npx prisma migrate deploy
npm run db:seed
```

Notes:

- Use `migrate deploy`, not `npm run db:migrate`. The latter is `migrate dev`, which is for development and can prompt to reset.
- Never run `npm run db:reset` against Neon. It deletes all data.
- `prisma.config.ts` loads `.env` through dotenv, but dotenv does not override variables already set in the shell, so the `$env:` / `export` value wins. Close the terminal afterwards (or unset it) so you do not point local dev at Neon by accident.
- In the Neon console, **Tables** should now list `Student`, `Payment`, `Grade` and the rest.

## 3. Import the project into Vercel

1. In Vercel: **Add New > Project**, pick the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Root directory: repository root.
3. Under **Build and Output Settings**, override the **Build Command** with:

   ```
   npm run db:generate && npm run build
   ```

   The Prisma client is generated into `generated/prisma`, which is gitignored, so Vercel has to generate it before building. Without this the build fails with a "Cannot find module @/generated/prisma/client" error.
4. Leave Install Command and Output Directory as default.
5. Node version: **Settings > General > Node.js Version** must be 20.x or newer (the default is fine).

## 4. Set environment variables

In **Settings > Environment Variables** (or on the import screen), for Production (and Preview if you use it):

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | the **pooled** Neon string | Required. Needed at build time too, because `prisma.config.ts` reads it during `prisma generate`. |
| `DEMO_ROLE_SWITCHER` | `true` | The role switcher is the only way to sign in, so the demo needs it. It is **not authentication**, so do not put real data behind it. |
| `UPLOAD_DIR` | `/tmp/uploads` | Demo workaround, see section 5. |

Do not commit `.env`. Keep `.env.example` current if you add variables.

Then click **Deploy**.

## 5. File uploads on Vercel

The app saves student submissions with `writeFile` into `UPLOAD_DIR`, resolved from the project root.

- **Default (`uploads`)**: the deployment directory is read-only, so every submission fails with a server error.
- **Demo workaround (`UPLOAD_DIR=/tmp/uploads`)**: an absolute path wins over the project root, so writes succeed. But `/tmp` is per instance and cleared when the instance is recycled. A submission can upload fine and later return "file not found" when staff open it from another instance. Fine for a short walkthrough, not for real use.
- **The real fix**: replace the three functions in `lib/storage.ts` (`saveUpload`, `readUpload`, `deleteUpload`) with an object store such as Vercel Blob or S3, keeping the generated-key scheme and the authorised download route. Files must stay private and be served only through `app/api/submissions/[id]/file/route.ts`. The rest of the app does not need to change. This is a feature change, so it is not part of this guide.

## 6. Verify

1. Open the Vercel URL. The landing page should show the **Viewing as** switcher.
2. Switch to **Registry**: the dashboard should list seeded students, including overdue ones.
3. Switch to a seeded **Student** and submit a small PDF. With the `/tmp` workaround, open it immediately from the staff view.
4. Check **Deployments > Functions logs** for errors if anything fails.

## 7. Updating later

- **Code changes**: push to `main` and Vercel redeploys.
- **Schema changes**: create the migration locally with `npm run db:migrate`, commit `prisma/migrations`, then run `npx prisma migrate deploy` against Neon (section 2) **before or alongside** the deploy so new code never runs against old tables.
- **Preview deployments** share the same `DATABASE_URL` if you set it for Preview. Use a Neon branch for previews to keep them away from production data: create a branch in Neon and set its pooled string as the Preview-scoped `DATABASE_URL`.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Build: `Cannot find module '@/generated/prisma/client'` | The build command is missing `npm run db:generate &&`. |
| Build: `Cannot resolve environment variable: DATABASE_URL` | `DATABASE_URL` is not set for the environment being built (Production vs Preview). |
| Runtime: `DATABASE_URL is not set` | Variable was added after the last deploy. Redeploy. |
| `migrate deploy` hangs or fails to connect | Using the pooled string, or `sslmode=require` is missing. Use the direct string. |
| First request after idle is slow (1 to 3 s) | Neon free tier suspends idle compute and wakes on the next query. Normal. |
| `too many connections` | The app is using the direct string. Switch `DATABASE_URL` in Vercel to the pooled one. |
| Submission upload returns 500 | `UPLOAD_DIR` still points inside the project. See section 5. |
| "Viewing as" menu missing | `DEMO_ROLE_SWITCHER` is not exactly `true`. |
