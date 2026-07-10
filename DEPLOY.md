# Deploy Escalon Map (free tier)

Host on **Vercel** + **Supabase** at $0/month for a small audience.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Open **SQL Editor** and run the schema in [`drizzle/0000_init.sql`](drizzle/0000_init.sql).
3. Under **Project Settings → Database**, copy the **Connection string** (URI, pooler mode).
4. Under **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Under **Authentication → Providers**, enable **Email** (magic link) and optionally **Google**.
6. Under **Authentication → URL configuration**, add:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`

## 2. Vercel

1. Push this repo to GitHub and import in [vercel.com](https://vercel.com).
2. Add environment variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase pooled Postgres URI |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL |
| `ANTHROPIC_API_KEY` | Optional, for AI features |
| `VOYAGE_API_KEY` | Optional, for embeddings |

3. Deploy. First visit prompts login; a map is auto-created on signup.

## 3. Local development

```bash
cp .env.example .env.local
# Fill in Supabase values
npm install
npm run dev
```

Apply schema once (either SQL file in Supabase dashboard or):

```bash
npm run db:push
```

## 4. Import existing desktop map

1. Log in to your hosted app.
2. Open **Settings → Import map file**.
3. Choose an export JSON from the old local app (`data/maps/` export or `/api/export` backup).

Import **replaces** your cloud map contents.

## 5. Sharing

1. **Settings → Sharing → Public**
2. Copy the share link (`/m/your-slug`)
3. Anyone with the link can **view**; they must **log in to comment**

## Free tier limits

- **Supabase**: 500 MB DB, 50K MAU — fine for a small group
- **Vercel Hobby**: sufficient for low traffic; cold starts possible
- **AI keys**: usage-based if you enable Map Intelligence

## Troubleshooting

- **DATABASE_URL is not set** — add the pooled connection string to Vercel env vars.
- **Auth redirect fails** — check Supabase redirect URLs match your domain.
- **Map empty after signup** — demo seed data loads on first `/api/data` request.
