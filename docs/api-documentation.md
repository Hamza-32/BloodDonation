# API reference

The app uses JSON route handlers under `/api`. All mutations use **POST**, `Content-Type: application/json`, and an `Origin` exactly matching `APP_URL`. Authenticated requests use the HttpOnly session cookie. Errors return `{ "error": "User-friendly message" }`; successful actions return `{ "message": "...", "redirect": "..." }` when navigation is appropriate.

## Endpoints

| Method | Path                        | Access                                              | Body / behavior                                                                                                        |
| ------ | --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`        | Public                                              | `name`, `email`, `phone`, `password`, `city`, `bloodGroup`, `role`; institutions also supply `license`, `address`      |
| POST   | `/api/auth/login`           | Public                                              | `email`, `password`; creates a seven-day session                                                                       |
| POST   | `/api/auth/logout`          | Public                                              | `{}`; revokes current session                                                                                          |
| GET    | `/api/campaigns`            | Public                                              | Active/completed campaigns; no donor identities or password data                                                       |
| GET    | `/api/campaigns/:id`        | Public                                              | Public campaign, 404 if unavailable                                                                                    |
| POST   | `/api/campaigns`            | Patient, approved institution, admin                | `title`, `description`, `bloodGroup`, `targetUnits`, `city`, `hospital`, `contact`, `categoryId`, `urgency`, `endDate` |
| POST   | `/api/campaigns/:id`        | Owner/admin                                         | Same fields; non-admin edits return to review                                                                          |
| POST   | `/api/campaign-status/:id`  | Admin; owner for cancellation                       | `status`: `ACTIVE`, `REJECTED`, or `CANCELLED`                                                                         |
| POST   | `/api/donations`            | Donor                                               | `campaignId`, future ISO `scheduledAt`, optional `note`; pledges one unit                                              |
| POST   | `/api/donations/:id`        | Receiving institution/admin; donor for cancellation | `status`: `COMPLETED`, `FAILED`, or `CANCELLED`; only pending records can transition                                   |
| GET    | `/api/history`              | Signed-in user                                      | Current user's donation records                                                                                        |
| GET    | `/api/history?format=csv`   | Signed-in user                                      | CSV download with formula-prefix escaping                                                                              |
| POST   | `/api/profile`              | Signed-in user                                      | `name`, `phone`, `city`, `bloodGroup`, `birthDate`, `weight`, `available` boolean, optional HTTPS `avatar` URL         |
| POST   | `/api/users/:id`            | Admin                                               | Optional `approval`: `APPROVED`/`REJECTED`, `active` boolean                                                           |
| POST   | `/api/inventory`            | Approved blood bank                                 | `bloodGroup`, `units`, unique `batch`, future ISO `expiresAt`                                                          |
| POST   | `/api/inventory-use/:id`    | Owning approved blood bank                          | `units`; guarded stock decrement                                                                                       |
| POST   | `/api/updates/:campaignId`  | Owner/admin                                         | `body` (10–1000 characters)                                                                                            |
| POST   | `/api/feedback/:donationId` | Donor of completed record                           | `rating` 1–5, `comment` 10–500 characters; once per donation                                                           |
| POST   | `/api/feedback-delete/:id`  | Admin                                               | `{}`; removes feedback and audits moderation                                                                           |
| POST   | `/api/categories`           | Admin                                               | Unique `name` (3–50 characters)                                                                                        |
| POST   | `/api/settings`             | Admin                                               | `intervalDays` integer 90–180                                                                                          |
| POST   | `/api/account-delete`       | Non-admin account owner                             | `{}`; deactivates account, cancels pending commitments, revokes sessions                                               |

GET campaign APIs currently return public campaigns as a list. Search/filter/sort/pagination run in the server-rendered `/campaigns` page rather than API query parameters. `/api/history` returns only the current user's history; management views read scoped Prisma records on the server.

## Example pledge

```json
{
  "campaignId": "campaign-id-from-public-list",
  "scheduledAt": "2026-11-01T04:00:00.000Z",
  "note": "Please coordinate my appointment with the care team."
}
```

Choose a future appointment before that campaign's closing date; the example date is illustrative. The donor must satisfy profile screening, compatibility, and capacity checks. This creates a **pending appointment**, not a confirmed donation or a payment.

## Status codes

- `200` action/read success; `201` account, campaign, pledge or inventory creation.
- `400` invalid input, closed request, duplicate pending appointment, invalid transition or insufficient stock.
- `401` missing session or incorrect credentials.
- `403` wrong role/owner, unapproved institution or rejected origin.
- `404` missing resource.
- `409` unique constraint violation.
- `429` persistent rate limit exceeded.
- `500` generic unexpected failure; no stack trace is returned.
