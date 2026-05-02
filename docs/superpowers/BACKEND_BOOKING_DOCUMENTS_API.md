# Backend spec: booking PDF documents (admin + shared paths)

This describes what the **transport-frontend** app calls when loading and **generating** booking documents (كشف الركاب، عقد النقل، إيصال الدفع).

An **HTTP 500 Internal Server Error** on `POST …/documents/…` means the **server** failed while building or storing the PDF (template, storage, missing data, uncaught exception). The frontend cannot fix that; the API must return **200/201** with a **JSON** body that includes a **public URL** to the PDF (or the fields below under an accepted shape).

---

## Base URL

All paths below are **relative to** the API root the app uses today, e.g.

`{apiUrl}` = `https://<host>/api/v1`

So a full URL looks like: `https://<host>/api/v1/bookings/{bookingId}/documents/passenger-manifest`

The Angular app sends **`Authorization: Bearer <access_token>`** (admin session) on these requests.

---

## Document type slugs (URL segment)

| Logical type            | URL suffix            |
|-------------------------|------------------------|
| Passenger manifest      | `passenger-manifest`   |
| Transport contract      | `contract`             |
| Payment receipt         | `payment-receipt`      |

---

## 1) List documents for a booking

**Primary**

- **Method:** `GET`
- **Path:** `/bookings/{bookingId}/documents`

**Fallback (if primary returns 404 or 405)**

- **Path:** `/admin/bookings/{bookingId}/documents`

**Success response**

Any of the following is accepted (the frontend normalizes):

1. **JSON array** of document objects  
2. **`{ "documents": [ … ] }`**  
3. **`{ "data": [ … ] }`**  
4. **`{ "data": { "documents": [ … ] } }`**  
5. **`{ "items": [ … ] }`**

Each document object should include enough for the UI to show “متوفر” and “معاينة”:

| Field (any of these names) | Meaning |
|----------------------------|---------|
| `id` or `_id` | Stable document id |
| `bookingId` or `booking_id` | Same as `{bookingId}` in path |
| `type` or `kind` or `documentType` or `document_type` | One of: `passenger_manifest`, `contract`, `payment_receipt` (hyphen form in URL only; body may use underscores or hyphens) |
| `fileUrl` or `file_url` or `url` or `publicUrl` / `public_url` or `downloadUrl` / `download_url` | **HTTPS (or absolute) URL** the browser can open for the PDF |
| `issuedAt` or `issued_at` or `createdAt` / `created_at` or `generatedAt` / `generated_at` | ISO timestamp (optional but recommended) |

**Minimum to be useful:** at least **`fileUrl` (or alias)** + **`type`** (or inferrable). If `booking_id` is omitted, the client still knows the booking id from the path.

**Errors**

Prefer **4xx** with a JSON body Nest-style, e.g. `{ "message": "…" }` or `{ "message": ["…"] }`, so the admin UI can show the reason. **500** should be logged server-side with stack trace.

---

## 2) Generate / (re)issue a document

**Primary**

- **Method:** `POST`
- **Path:** `/bookings/{bookingId}/documents/{slug}`  
  Examples:  
  - `/bookings/{id}/documents/passenger-manifest`  
  - `/bookings/{id}/documents/contract`

**Body**

- **`{}`** (empty JSON object). No form-data required for the current frontend.

**Fallback (if primary returns 404 or 405)**

- **Path:** `/admin/bookings/{bookingId}/documents/{slug}`

**Success**

- **Status:** `200` or `201`
- **`Content-Type: application/json`**
- **Body:** JSON object the client can normalize (wrapper allowed):

Recommended **canonical** shape:

```json
{
  "id": "uuid-or-string",
  "bookingId": "same-as-path",
  "type": "passenger_manifest",
  "fileUrl": "https://.../….pdf",
  "issuedAt": "2026-05-02T12:34:56.000Z"
}
```

Also accepted:

- Wrapper: **`{ "data": { …document… } }`** or **`{ "document": { … } }`**
- **snake_case:** `booking_id`, `file_url`, `issued_at`, etc. (aliases listed in §1)

**Hard requirement after normalization**

The response must allow deriving:

- **`bookingId`** (from body or fallback to URL)
- **`type`** (from body or inferred from `{slug}`)
- **`fileUrl`** (or one of the URL aliases above)

Without a **usable absolute URL**, the frontend cannot offer “معاينة” / open PDF.

**Failure modes to avoid returning as bare 500**

- Missing booking / trip / passengers for PDF template → return **400** with `message`
- Storage upload failure → **502/503** or **500** with logged cause
- PDF library error → **500** with internal log; optional `message` for admins

**Contract / manifest business rules (should be enforced server-side)**

- **Passenger manifest:** generation limits per trip status (see product rules: e.g. up to 2 total when trip completed; 0 if trip cancelled).  
- **Contract:** typically **once** per booking (duplicate generation should be **409** or **400** with clear `message`).

(Frontend has hints for drivers; **admin** panel may call the same endpoints—backend policy is authoritative.)

---

## 3) CORS (dev + prod)

If the SPA is on another origin (e.g. `http://localhost:4200` or Vercel), the API must allow:

- **Origin** of the admin app  
- **Methods:** `GET`, `POST`, `OPTIONS` (and others you use)  
- **Headers:** `Authorization`, `Content-Type`  
- **Credentials** if you use cookies (this app mainly uses Bearer tokens)

---

## 4) Quick checklist for backend developers

- [ ] Implement **GET** list on **one** of: `/bookings/:id/documents` **or** `/admin/bookings/:id/documents`  
- [ ] Implement **POST** generate on **one** of: `/bookings/:id/documents/:slug` **or** `/admin/bookings/:id/documents/:slug`  
- [ ] Return **JSON** (not raw PDF bytes) on success, with a **file URL** field the browser can `GET`  
- [ ] On validation / business rule failure, return **4xx** + `message` instead of generic **500**  
- [ ] Log **500** with enough context (booking id, slug, storage key, template step)

---

## 5) Reference: same paths used by the driver app

The driver portal uses the same **non-admin** paths for generation:

`POST /bookings/{bookingId}/documents/passenger-manifest` (etc.)

Keeping **one implementation** for both admin and driver avoids drift.

---

*Generated for handoff to backend. Source of truth in repo: `src/app/features/admin/documents/data/admin-document.repository.ts` and `normalize-admin-booking-document.ts`.*
