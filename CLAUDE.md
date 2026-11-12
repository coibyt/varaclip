# VaraClip (varaclip.com)

TikTok-style short-video site for beauty salons: salons post customers' results, viewers scroll, like, comment, follow, chat, watch lives and book (booking links usually point to VaraaAi.com, the owner's sister site in C:\Hiep\CLAUDE).

Reply to the owner in **Vietnamese**.

## Stack
Next.js 15 App Router, React 19, TypeScript, Tailwind 3, Prisma 5 on MySQL (Hostinger), jose JWT cookie `gr_session`, zod, lucide-react. Videos on Cloudflare R2 (presigned PUT uploads). Email via nodemailer + Hostinger SMTP (`SMTP_*` env vars).

## Deploy (important)
- Source repo: this folder → `git push origin main` (coibyt/varaclip).
- Hostinger deploys from **coibyt/varaclip-app**: copy `git ls-files` into `C:\Hiep\varaclip-app-deploy` (delete its src/prisma/docs/public first), commit, `GIT_TERMINAL_PROMPT=0 timeout 120 git push origin HEAD:main`. Push as the `coibyt` GitHub account (repo-local `credential.https://github.com.username coibyt`).
- Hostinger build server limits processes: keep `next.config.mjs` experimental `cpus: 1` etc., or the build fails with `spawn EAGAIN`.
- Commit only files you changed (`git add <paths>`, not `-A`): untracked experiments may be lying around.

## Database
- Production MySQL is on Hostinger and **not reachable** from this machine; local `.env` points at a localhost DB that is not running.
- New tables never go into existing models' columns (deploying a column before the SQL breaks every query). Add a separate table, write `docs/database-<feature>.sql` with `CREATE TABLE IF NOT EXISTS`, make the code work (catch) until it exists, and give the owner the SQL to paste in phpMyAdmin. The owner runs SQL himself.
- To test locally: copy `prisma/schema.prisma` to a temporary SQLite schema (provider sqlite, drop `@db.*`, generator `output` = node_modules/.prisma/client), `prisma db push`, run tsx scripts, then delete it and run `npx prisma generate` to restore the MySQL client.

## Conventions
- i18n: 35 locale files in `src/locales/*.ts`, keys used via `t("key")`; every new key must be added to **all 35** files with the same `{placeholders}` (append before `};`), then check parity. Admin-only pages are Vietnamese only.
- Admin = emails listed in `ADMIN_EMAILS`; admin pages under `/admin` (stats, customers, categories, email marketing, automatic emails `/admin/automations`).
- Type-check: `node --max-old-space-size=1024 node_modules/typescript/bin/tsc --noEmit`; build: `node --max-old-space-size=1536 node_modules/next/dist/bin/next build` (low RAM machine).
- Live follower minimum `LIVE_MIN_FOLLOWERS` in `src/lib/live.ts` is temporarily 0 for testing; the owner wants 50 later.
