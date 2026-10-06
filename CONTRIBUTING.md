# Contributing

Use Node.js 22+, install dependencies, and run the tested setup in `docs/setup-guide.md`.

Keep authorization in server code. Any new donation transition must preserve the pending-state guard, screening interval, and confirmed-only campaign totals. Document actual behavior and mark external integrations clearly.

Before proposing a change, run lint, TypeScript checking, domain tests, relevant E2E workflows, formatting checks, and a production build. Use `npm run format` to apply the repository's formatting rules. Browser tests operate on `prisma/test.db`; never point them at real records.

Do not commit `.env`, databases, tokens, private keys, production credentials, or private donor data. Demo seed fixtures and the example password are exclusively for local review.
