# Local setup

Prerequisites: Node.js **22+**, npm, and a modern browser. A separate database server is not required. Tested on Windows with Node.js 24.19.0.

```powershell
npm install
Copy-Item .env.example .env
npm run setup
npm run dev
```

macOS/Linux: replace `Copy-Item .env.example .env` with `cp .env.example .env`. Open the local URL printed by Next.js.

`setup` creates the configured SQLite file if missing, generates Prisma Client, applies tracked migrations, and seeds an empty database. A populated user table causes seeding to be skipped. The database location is relative to `prisma/`, so `file:./dev.db` creates `prisma/dev.db`.

## Environment

| Variable        | Meaning                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`  | SQLite URL, default example `file:./dev.db`                               |
| `APP_URL`       | Exact browser origin for mutation checks, example `http://127.0.0.1:3000` |
| `DEMO_PASSWORD` | 12+ character local seed password; example is public demo data only       |

Do not commit `.env` or SQLite database files. No payment-provider keys or external hospital credentials are needed.

If port 3000 is occupied, use:

```powershell
# Set APP_URL="http://127.0.0.1:3001" in .env first.
npm run dev -- --port 3001
```

`localhost` and `127.0.0.1` are different origins. Use the host that matches `APP_URL`. For production, use an HTTPS `APP_URL` and serve over HTTPS because the session cookie is Secure.

## Database commands

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use `npm run setup` for the first run; it explicitly creates the file to avoid a Windows SQLite creation issue observed with direct initial migrations. For schema changes, create and review a new migration with Prisma; deployment applies existing migration files.

On Windows, stop the app before rerunning setup or `db:generate`: a running server can lock Prisma's query-engine DLL and prevent client regeneration.

To inspect the database, `npx prisma studio` provides a local database browser. A reset discards local records: back up the database, stop the server, remove **only your configured local database file**, and run setup again. No reset command is run automatically against development data.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
npm run format:check
npm run build
npm audit
```

The E2E command resets only `prisma/test.db`, seeds separate accounts, and launches its own server at `127.0.0.1:3100` with an independent `.next-e2e` build directory. Development records in `prisma/dev.db` are preserved. Do not use `test.db` for your own work.

For a production-mode local review:

```powershell
npm run build
npm run start
```

Stop a dev server before building in the same `.next` directory. If testing production on an alternative port, update `APP_URL` and pass `-- --port 3001` to `start`.

## Screenshots

With the preview running, run `npm run screenshots`. Its default URL is `http://127.0.0.1:3001`; set `PREVIEW_URL` if yours differs and ensure `APP_URL` matches. It logs into seeded local demo accounts using `DEMO_PASSWORD` or the public example password, captures 15 PNGs, checks desktop/tablet/mobile overflow, and rejects browser page errors. It creates sessions but does not create fake donations for images.

## Troubleshooting

- **Origin denied**: correct `APP_URL` to the exact browser protocol, host and port; restart the server if needed.
- **No tables**: run `npm run setup` from the project root.
- **Seed skipped**: expected when a database already contains users.
- **Cannot pledge**: complete age/weight profile fields, match the requested blood group, check the last-donation interval, and resolve an existing pending appointment.
- **Unapproved institution**: an admin must approve the account under People & care partners.
- **Browser binary missing**: run `npx playwright install chromium`.
- **Port 3100 in use**: stop the unrelated test server or change both Playwright URL and test origin; tests do not attach to an unknown existing server.
