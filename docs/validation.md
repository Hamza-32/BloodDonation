# Validation report

Validated on **7 October 2026 (Asia/Dhaka)** using Windows, Node.js 24.19.0, SQLite, and Chromium.

| Check                          | Result                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `npm run lint`                 | Passed, no errors/warnings                                                                          |
| `npm run typecheck`            | Passed                                                                                              |
| `npm run format:check`         | Passed                                                                                              |
| `npm run test`                 | 6/6 domain and validation tests passed                                                              |
| `npm run test:e2e`             | 7/7 browser/API workflow tests passed against an isolated database                                  |
| `npm run build`                | Passed; all app routes successfully compiled                                                        |
| `npm run start -- --port 3001` | Production server started successfully; public pages and seeded account logins verified in Chromium |
| Fresh `npm run setup`          | Passed on a separate empty database; generated client, applied migration, created demo records      |
| Repeated setup                 | Passed; no pending migration, existing user data preserved                                          |
| `npm audit`                    | 0 known vulnerabilities at validation time                                                          |
| `npm run screenshots`          | 15 final PNGs captured from production build                                                        |
| Responsive public pages        | 390px mobile, 768px tablet, 1440px desktop; no document overflow                                    |
| Mobile administration          | Overview, campaign management and user management verified; tables scroll within their containers   |
| Browser page errors            | No uncaught page errors during screenshot capture                                                   |

Additional browser checks verified 10 unique internal landing-page links, no console/page errors, and donor/hospital/blood bank/admin dashboards and forms at 390px and 768px.

## Workflow coverage

Registration, profile editing, login, logout, bad credentials, invalid registration, role authorization, origin rejection, campaign creation/editing/review, pending-institution restrictions, donor appointment pledging, duplicate pending appointments, unauthorized confirmation, successful confirmation, repeated-finalization rejection, interval enforcement, failed and cancelled records, unchanged totals after failure/cancellation, feedback uniqueness, CSV history, institutional approval, account disabling, inventory creation, guarded stock decrement, and inventory ownership restrictions.

Domain tests cover all eight red-cell groups, age/weight/profile/interval boundaries, confirmed-only progress, salted password hashes, registration constraints, and campaign date/quantity validation.

## Fixes made during verification

- Repaired mobile workspace navigation overflow by allowing the grid sidebar to shrink and scroll internally.
- Separated form accessible names from helper descriptions; UI registration/profile tests now use their real labels.
- Worked around first-file creation behavior on Windows by explicitly creating the configured database before Prisma deployment migrations.
- Documented stopping the server before regenerating Prisma Client because Windows locks the engine DLL.
- Replaced a vulnerable lint preset dependency and updated affected development transitive packages. No production or development advisories remain in the final audit.
- Split transactional donation rules into a reusable service.
- Normalized historical demo donations to compatible donors and consistent dates.
- Removed development controls from screenshots and captured the final production build.

## Limits

This is verification of a local demonstration, not a production certification. Load/concurrency testing against PostgreSQL, external hospital APIs, clinical clearance, email/SMS, MFA, recovery, private medical files, cloud deployment, and comprehensive screen-reader/a11y audits are not implemented or verified. Session cookies are Secure in production; use HTTPS for hosted review.

Original supplied PDFs are retained locally and ignored by Git because they contain personal identifying details. `.env`, local databases, generated build artifacts, and test results are ignored. A remote Git push requires the user's target repository URL and available credentials.
