# External API v1

Base URL: `/api/v1`. This API exposes the existing clinic workflows to an authenticated app or a server-side CRM adapter. It uses the current staff roles and clinic-wide permissions; patient self-service would require a separate ownership model. It does not configure a Bitrix24 portal or assume CRM custom fields.

## Setup

1. Apply migrations: `pnpm db:migrate` (includes the API credential, audit, rate-limit and idempotency tables).
2. Set `BETTER_AUTH_URL` to the public HTTPS URL. Keep `BETTER_AUTH_SECRET` private and stable.
3. For browser API clients only, set `API_ALLOWED_ORIGINS` to an exact comma-separated origin allowlist, without trailing slashes. Native clients and server integrations do not need CORS. The auth service has its own trusted-origin setting (`AUTH_TRUSTED_ORIGINS`).
4. Terminate HTTPS at a trusted ingress. Apply request timeouts, connection limits and unauthenticated/IP throttling at the ingress, including `/api/auth/*`. The API's shared Postgres limit is 120 authenticated requests/minute per user or integration key, across all application instances. It is not an unauthenticated denial-of-service firewall.
5. Create a dedicated service user with the minimum clinic roles, then issue a scoped key from a trusted operator terminal:

```sh
pnpm api:key create USER_ID bitrix24 30 patient:read,patient:create
pnpm api:key revoke KEY_ID
```

Keys expire after 1–90 days. The random key is shown once; only its SHA-256 digest is stored. Keep it in the integration server's secret store. Revocation, bans and role changes apply on the next request. Effective permissions are the intersection of the user's current roles and the key scopes. The issuance command refuses scopes the user does not have. To rotate, create a replacement, update the integration, then revoke the old key. There is no public credential-management endpoint.

## Authentication

Every v1 request requires `Authorization: Bearer TOKEN`. Cookies alone are never accepted, and invalid bearer credentials never fall back to browser cookies.

For a native app, use existing Better Auth email/password sign-in at `POST /api/auth/sign-in/email`. Include `Origin: <public application origin>` on authentication POST requests so Better Auth can validate its trusted-origin policy. Store the signed token returned in the `set-auth-token` response header in the platform keychain/secure storage. Send it as the bearer credential; existing session expiry and revocation apply. Use Better Auth sign-out to terminate the session. Public signup stays disabled. Do not bundle an integration key in an app.

For a browser frontend, configure both trusted auth origins and API CORS origins. v1 deliberately uses explicit bearer credentials; it does not permit credentialed cookie CORS. The existing website continues using its cookie session.

`GET /me` returns the current user ID/name, roles, and credential scopes (`null` for a user session).

## Reads

| Endpoint | Permission | Returned data |
| --- | --- | --- |
| `GET /coordinators` | `patient:create` or `patient:update` | Active coordinator IDs and names (string cursors) |
| `GET /patients`, `/patients/{id}` | `patient:read` | Patient identity and creation time |
| `GET /visits`, `/visits/{id}` | `patient:read` | Patient/coordinator IDs and stay times; treatment/notes require `treatment:read` too |
| `GET /cases`, `/cases/{id}` | `backOfficeCase:read` | Visit/patient IDs, stay times, case status, assignee and progress times |
| `GET /apartments`, `/apartments/{id}` | `accommodation:read` | Apartment name, type, address |
| `GET /accommodation-requests`, `/accommodation-requests/{id}` | `accommodation:read` | Requested type, assigned apartment, reservation and complimentary-stay fields |
| `GET /treatments`, `/treatments/{id}` | `treatment:read` | Treatment catalogue |
| `GET /transfers?start=ISO&end=ISO` | `transfer:read` | Effective calendar events, trip members, revision, locations, pickup/completion and change history |

List responses are `{ "data": [...], "nextCursor": "UUID or null" }`. Use `limit` (1–100, default 25) and `after=nextCursor`; ordering is by UUID. This pagination is stable for an existing dataset, not a timestamp-based change feed or snapshot. `GET /visits` additionally accepts `patientId=UUID` to find a returning patient’s visits. Visit details include linked companion patient/visit IDs. Detail responses are `{ "data": {...} }`, or 404. Unknown/duplicate query fields are rejected. Transfer ranges are start-inclusive/end-exclusive and at most 31 days. Transfer names and locations are intentionally available to drivers; treatment text is not included.

## Writes

`GET /visits/{id}` also returns the booking configuration needed to edit a visit: `accommodation` requires effective `accommodation:read` permission and `transfer` requires effective `transfer:read` permission (both current roles and credential scopes). Without the corresponding permission the property is omitted; with permission, `null` means no service was requested. Accommodation objects contain `{id, apartmentType, isFree, freeDays, accommodationId, status, reservedAt}`, where `id` is the accommodation request ID and `accommodationId` is the assigned apartment ID or null. Transfer objects contain `{id, isFree, direction, oneWayLeg}`, where `id` is the transfer booking ID. These IDs are distinct from the visit ID. For replacement input, copy only the writable service fields listed below; response IDs and assignment fields are not accepted in `Visit` input.

Use `POST /commands/{name}`, `Content-Type: application/json`, and an `Idempotency-Key` header (8–128 letters, digits, `_` or `-`; a UUID works). Each command performs its own permission check and the same validated transaction, timeline and notifications as the website.

| Command | Permission | JSON body |
| --- | --- | --- |
| `registrations` | `patient:create` | `{patient: Visit, companion?: {firstName,lastName,visit?: Visit}}` |
| `visit-update` | `patient:update` | `{id: visitId, patient: Visit}`; full visit replacement |
| `apartment-create` | `accommodation:create` | `{name,address,apartmentType}` |
| `apartment-address` | `accommodation:update` | `{id: apartmentId,address}` |
| `accommodation-assign` | `accommodation:update` | `{id: requestId,accommodationId: UUID or null,isFree,freeDays}` |
| `treatment-create` | `treatment:create` | `{name,category,description,durationMinutes}` |
| `treatment-update` | `treatment:update` | Same fields plus `id` |
| `case-transition` | `backOfficeCase:update` | `{id: visitId,action: "start" or "complete"}` |
| `transfer-pickup` | `transfer:update` | `{visitId,leg: "arrival" or "departure",pickedUp: boolean}` |
| `transfer-plan` | `transfer:update` | `{visitId,leg,expectedStart,revision,intent,reason?,moment?,pickup?,dropoff?}` |

A `Visit` contains `firstName`, `lastName`, `arrivalDate`, `arrivalTime`, `departureDate`, `departureTime`, `coordinatorId`, `availabilityNotes`, `treatment`, and optionally `treatmentNotes` (left unchanged on update when omitted) and:

- `accommodation: {apartmentType,isFree,freeDays}`
- `transfer: {direction: "one_way" or "round_trip",oneWayLeg: "arrival" or "departure",isFree}`

Dates use `YYYY-MM-DD`; times use `HH:mm`, interpreted in `Europe/Chisinau`. For `transfer-plan`, get `expectedStart` (ISO timestamp) and `revision` from the transfer event. `intent` is `reschedule`, `complete`, or `reopen`; rescheduling requires a reason and `moment` in `YYYY-MM-DDTHH:mm`. Shared trips move together. Completed trips must be reopened before editing. The API retains active-coordinator, date order, complimentary-day, apartment-type/conflict, case ownership, pickup-time and transfer concurrency checks. Patient registration permission includes creating the requested visit services, just as on the website.

Unknown JSON properties are rejected, including nested visit/service fields. Names and text have length limits, UUIDs/enums are checked, JSON numbers/booleans have their actual types, and bodies are limited to 64 KiB, including streamed bodies. No arbitrary SQL filters, user role changes or deletion endpoints are exposed.

Example:

```sh
curl "$BASE_URL/api/v1/commands/registrations" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: crm-contact-42-visit-1' \
  --data '{"patient":{"firstName":"Ana","lastName":"Example","arrivalDate":"2026-12-01","arrivalTime":"10:00","departureDate":"2026-12-04","departureTime":"18:00","coordinatorId":"COORDINATOR_ID","availabilityNotes":"","treatment":"Consultation"}}'
```

Successful commands return `{data: result}`. Registration returns the new **visit ID** as `data.id`; catalogue writes currently return success status without a new record ID. Business failures return 422 with `error.code = operation_rejected` and the existing safe workflow error in `error.details`. Keep a local mapping between CRM contact/deal IDs and clinic patient/visit IDs; do not match people by name alone.

## Retries, errors and audit

An idempotency key is unique per principal across commands. The normalized command and validated input are fingerprinted. Identical retries return the recorded response, while reuse with different input returns 409. Validation failures before execution do not reserve the key. Validation of current permissions happens even on replay.

A durable pending record is written before invoking the domain action. If the process stops between executing a write and saving its response, the key remains pending and returns `409 operation_pending`. This intentionally avoids repeating an uncertain clinical write. An operator must reconcile the database/timeline before deciding on a new key; there is no automatic exactly-once claim across the existing domain transaction and the response record. Never automatically replace an uncertain key. Completed business rejections are also replayed; use a new key after correcting a rejected operation.

Statuses: 401 missing/expired credentials, 403 insufficient permission or disallowed origin, 404 unknown route/record, 409 replay conflict/pending, 413 body too large, 415 wrong media type, 422 validation/business rejection, 429 quota, 500 unexpected failure. Responses include a request ID and `Cache-Control: no-store`; internal errors never expose SQL or payloads. Post-authentication requests are audited by principal, method, route and status, without tokens or patient bodies. A null audit status indicates an interrupted request.

Audit and idempotency records are sensitive operational data: restrict database access, encrypt backups and set an operator-owned retention policy. Idempotency responses may include safe workflow results and validation messages. Do not delete pending records or expire completed keys while upstream systems may still retry them. Rate-limit rows have one row per principal and can be removed for permanently retired principals. Audit records do not track individual field values and are not a substitute for the clinical timeline.

## Bitrix24 integration boundary

A server-side Bitrix24 adapter can call this API using a scoped service credential and stable per-event operation keys. Direct portal event ingestion and contact/deal/custom-field mappings are deliberately not installed: the portal, object type, directions of sync and mapping have not been defined.

When adding an outbound-event receiver, verify Bitrix24's `auth.application_token` against the configured portal token and check `member_id`/portal identity before processing. Do not treat the portal domain or an incoming access token as sufficient proof; never fetch arbitrary callback URLs supplied in events. Accept only the chosen event types, durably deduplicate events and map them to these commands. See [Bitrix24 handler security](https://apidocs.bitrix24.com/api-reference/events/safe-event-handlers.html). The app bearer flow follows [Better Auth's bearer plugin](https://better-auth.com/docs/plugins/bearer) with signed tokens required.

## API reference and verification

`docs/openapi.json` is an OpenAPI 3.1 reference with request schemas generated from the runtime validators. Cross-field and database business rules are enforced at runtime and documented above. Regenerate with `pnpm api:docs` after changing contracts. Run `pnpm test`, `pnpm lint`, and `pnpm exec tsc --noEmit`. The migration is additive; applying it does not issue credentials or enable any CRM sync.

`pnpm test:api` runs live HTTP checks against a temporary database on local Postgres (requires permission to create databases and an existing production build). It applies all migrations to that isolated database, starts a test server, and removes the server/database afterward. It never migrates the clinic database.

## Code structure and adding v2 routes

Routes are explicit files under `app/api/v1/`, rather than a catch-all dispatcher:

```text
app/api/v1/patients/route.ts              # List controller
app/api/v1/patients/[id]/route.ts         # Detail controller
app/api/v1/commands/registrations/route.ts
lib/patients/queries.ts                  # Domain database reads
lib/accommodations/queries.ts
lib/treatments/queries.ts
lib/back-office/queries.ts
lib/transfers/queries.ts
lib/api/v1/validation/                   # v1 request contracts, grouped by domain
lib/api/v1/responses.ts                  # v1 response formatting
lib/api/route.ts                         # Shared authentication, scopes, quota, audit, errors and CORS
lib/api/command-route.ts                 # Shared write validation and durable retry protection
```

The domain query modules accept database filters and return data. They do not know about API versions or HTTP responses. Route files apply the version's validators, enforce access, call the relevant domain operation and format the response. Writes continue using the existing clinic actions so transaction, timeline and notification rules remain shared with the website. `lib/api/v1/contracts.ts` is a catalog for documentation and contract tests; it does not route requests.

To introduce just `GET /api/v2/patients`, add `app/api/v2/patients/route.ts` and the necessary v2 validators/response formatting under `lib/api/v2/`. Use `apiRoute` for the same authentication, scope, quota, audit and CORS protection. Reuse `listPatients` from the domain query module if the data requirements are the same, then format the v2 response separately. Add a different domain query only when the required data or query behavior differs. Do not modify v1 validators or serializers to implement a v2 wire contract.

For example, a new v2 route may still read through the same domain query:

```ts
export const GET = apiRoute(
  { auditPath: "v2/patients", scope: "patient:read" },
  async (request) => {
    const filters = patientFiltersV2.parse(queryParameters(request));
    const rows = await listPatients({ ...filters, limit: filters.limit + 1 });
    return { body: patientListResponseV2(rows, filters.limit) };
  },
);
```

`patientFiltersV2` and `patientListResponseV2` in this example are contracts to define for the new version; no placeholder v2 endpoints are shipped. Export `apiOptions as OPTIONS` from the shared route module for browser preflight support. For writes, `commandRoute` also requires `version: "v2"`, the new version's schema and an operation adapter that returns `{body,status}`. v1 retains its original retry fingerprints; newer versions get distinct fingerprints so a shared idempotency key cannot replay a v1 operation as a v2 operation. Keys are still unique per principal across versions: reuse with another version returns 409 rather than executing a second write. Use a new operation key when intentionally making a new versioned operation.

Only endpoints with a changed public contract need a new version. Transfers, treatments and other endpoints can stay on v1 while patients moves to v2. Share domain business rules and security helpers; keep HTTP input/output contracts in their respective version. Unknown routes now receive Next.js's standard 404, and unsupported methods on existing routes receive 405. Business-error replays retain their saved outcome and receive a fresh request ID for the current HTTP request.
