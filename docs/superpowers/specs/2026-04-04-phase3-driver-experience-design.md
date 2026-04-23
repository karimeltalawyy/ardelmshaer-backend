# Phase 3 — Driver Experience Design Spec

**Project:** Saudi Land Transport Platform — Angular 21 Frontend  
**Date:** 2026-04-04  
**Phase:** 3 of N — Driver Experience  
**Status:** Approved

---

## Goal

Implement the full driver-facing experience: home dashboard with approval status, assigned trips list with status management, passenger manifest with COD payment collection, document upload, and driver profile.

---

## Business Context

- Driver is a **company employee** — no earnings, no self-created trips
- Admin assigns trips to drivers
- Driver must see the **passenger manifest (كشف ركاب)** — legally required at Saudi checkpoints
- Driver collects **cash payments (COD)** from passengers and marks each booking as paid
- Payment is per-booking: `per_seat` mode = one booking per passenger; `whole_car` mode = one booking covers the entire car

---

## Scope

Five screens under the existing driver shell (`/driver/*`):

| Route | Screen |
|---|---|
| `/driver/home` | Home Dashboard |
| `/driver/trips` | My Trips List |
| `/driver/trips/:id` | Trip Detail + Passenger Manifest |
| `/driver/documents` | My Documents |
| `/driver/profile` | Driver Profile |

Driver shell navigation changes (update `driver-shell.component.ts`):

| Tab | Arabic | Icon | Route |
|-----|---------|------|-------|
| Home | الرئيسية | `pi pi-home` | `/driver/home` |
| My Trips | رحلاتي | `pi pi-car` | `/driver/trips` |
| My Documents | وثائقي | `pi pi-file` | `/driver/documents` |
| Profile | حسابي | `pi pi-user` | `/driver/profile` |

> **Shell change:** Replace the "الأرباح" (Earnings) tab and its `/driver/earnings` route with "وثائقي" at `/driver/documents`.

---

## Architecture

### Option B: Shared trip layer, independent document/profile layers

```
src/app/features/driver/
  home/
    components/
      home/home.component.{ts,html,scss,spec.ts}
        — injects DriverTripService (next trip) + DriverProfileService (approval status)
  trips/
    models/
      driver-trip.model.ts
    data/
      driver-trip.repository.ts + spec.ts
    services/
      driver-trip.service.ts + spec.ts
    components/
      trip-list/trip-list.component.{ts,html,scss,spec.ts}
      trip-detail/
        trip-detail.component.{ts,html,scss,spec.ts}
        passenger-manifest/passenger-manifest.component.{ts,html,scss,spec.ts}
  documents/
    models/
      driver-document.model.ts
    data/
      document.repository.ts + spec.ts
    services/
      document.service.ts + spec.ts
    components/
      documents/documents.component.{ts,html,scss,spec.ts}
  profile/
    models/
      driver-profile.model.ts
    data/
      driver-profile.repository.ts + spec.ts
    services/
      driver-profile.service.ts + spec.ts
    components/
      profile/profile.component.{ts,html,scss,spec.ts}
```

### Modified files

- `src/app/features/driver/driver.routes.ts` — final routes after this phase:
  ```
  { path: 'home',        loadComponent: HomeComponent }
  { path: 'trips',       loadComponent: TripListComponent }
  { path: 'trips/:id',   loadComponent: TripDetailComponent }
  { path: 'documents',   loadComponent: DocumentsComponent }
  { path: 'profile',     loadComponent: ProfileComponent }
  ```
  Remove the existing `earnings` placeholder route. All five paths are lazy-loaded.
- `src/app/layout/driver-shell/driver-shell.component.ts` — replace Earnings nav item with Documents nav item

---

## Data Models

### `driver-trip.model.ts`

> The `DriverTripSummary` and `DriverTripDetail` interfaces represent a **subset** of the full API response. The raw response from TRIP_INCLUDE also includes `driver`, `season`, and other nested objects — the repository maps only the fields listed here and discards the rest.

```typescript
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingMode = 'per_seat' | 'whole_car';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

// Matches the relevant subset of GET /trips/my response
export interface DriverTripSummary {
  id: string;
  departureAt: string;             // ISO datetime — DB column is departureAt
  status: TripStatus;
  bookingMode: BookingMode;
  totalSeats: number | null;
  availableSeats: number | null;
  route: {
    estimatedDurationMin: number;
    origin: { nameAr: string; nameEn: string };
    destination: { nameAr: string; nameEn: string };
  };
}

// One row in the passenger manifest table
export interface PassengerManifestEntry {
  bookingId: string;
  seatCode: string;                // e.g. "3A" for per_seat; "—" for whole_car
  passengerName: string;
  nationality: string;
  idNumber: string;
  paymentStatus: PaymentStatus;    // from booking.paymentStatus
  totalPrice: number;              // from booking.totalPrice (Decimal → number)
}

// Relevant subset of GET /trips/:id response
export interface DriverTripDetail {
  id: string;
  departureAt: string;
  status: TripStatus;
  bookingMode: BookingMode;
  totalSeats: number | null;
  availableSeats: number | null;
  route: {
    estimatedDurationMin: number;
    origin: { nameAr: string; nameEn: string };
    destination: { nameAr: string; nameEn: string };
  };
  car: {
    brand: string;
    model: string;
    plateNumber: string;
    carType: string;
  };
  passengers: PassengerManifestEntry[];  // built by repository from bookings[]
}
```

> **Manifest mapping strategy per `bookingMode`:**
>
> - **`per_seat`**: Iterate `booking.bookingSeats[]`. Each entry → one `PassengerManifestEntry` with `seatCode = bookingSeat.carSeat.seatCode` and passenger fields from `bookingSeat.passenger`.
> - **`whole_car`**: One booking covers all seats. `bookingSeats` may be empty. Iterate `booking.passengers[]` instead. Each entry → one row with `seatCode = '—'`.
>
> **Required backend change — `findOne` query extension:**  
> The current `trips.service.ts` `findOne` query includes `bookingSeats: { select: { carSeatId, status } }` but does not include `passengers` or `carSeat.seatCode`. Before Phase 3 implementation, extend the query to:
> ```
> bookings: {
>   where: { status: { not: 'cancelled' } },
>   include: {
>     passengers: true,
>     bookingSeats: {
>       include: {
>         carSeat: { select: { seatCode: true } },
>         passenger: { select: { fullName: true, nationality: true, idNumber: true } }
>       }
>     }
>   }
> }
> ```

### `driver-document.model.ts`

```typescript
export type DriverDocumentType = 'national_id' | 'license' | 'car_registration' | 'car_photo';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface DriverDocument {
  id: string;
  docType: DriverDocumentType;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
}
```

### `driver-profile.model.ts`

```typescript
// Matches Prisma enum DriverApprovalStatus: pending | approved | rejected
export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CarInfo {
  id: string;
  carType: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  totalSeats: number;
}

export interface DriverProfile {
  id: string;
  fullName: string;                      // from user.fullName
  email: string;                         // from user.email
  phone: string;                         // from user.phone
  idNumber: string;                      // from user.idNumber — see backend note
  licenseNumber: string;
  approvalStatus: DriverApprovalStatus;
  rejectionReason: string | null;        // profile-level rejection reason
  cars: CarInfo[];                       // see backend note
  documents: DriverDocument[];
}
```

> **Required backend changes in `drivers.service.ts` `getMyProfile`:**
> 1. Add `idNumber: true` to the `user` select clause
> 2. Add `cars: true` to the include

---

## Backend API Reference

All endpoints under `/api/v1/`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/trips/my` | Driver's assigned trips |
| `GET` | `/trips/:id` | Full trip detail with bookings (requires backend extension) |
| `PATCH` | `/trips/:id/status` | Update status — body: `{ status: TripStatus }` |
| `GET` | `/drivers/me` | Driver profile + documents + cars (requires backend extension) |
| `POST` | `/drivers/documents` | Upload document — multipart: `file` + `docType` |
| `PATCH` | `/payments/bookings/:bookingId/collect` | Mark booking COD paid — body: `{ note?: string }` |

> `DELETE /trips/:id` exists in the backend but is not exposed in the driver UI for this phase.

---

## Error Handling Policy

All screens follow the same error policy (consistent with Phase 2):

- On any HTTP error: call `ToastService.error('حدث خطأ، يرجى المحاولة مجدداً')` to surface a toast
- Reset in-flight signals: `loading.set(false)`, `updatingStatus.set(false)`, `collecting.set(null)`, `uploading.set(null)`
- The data signal is left unchanged on error (stale display is better than empty)
- Loading states: show PrimeNG `<p-progressSpinner>` (or `AppLoading` shared component) while initial data loads

---

## Screen Designs

### Home Dashboard (`/driver/home`)

**Data sources:**
- `DriverTripService.loadMyTrips()` — called in constructor; `scheduled` trip with soonest `departureAt` used for the next-trip card
- `DriverProfileService.loadProfile()` — called in constructor; `approvalStatus` used for the banner

**Approval status banner** (conditional, shown when `approvalStatus !== 'approved'`):
- `pending`: "حسابك قيد المراجعة — يرجى رفع وثائقك المطلوبة" — yellow style (`--govsa-secondary: #C8A951`) with link to `/driver/documents`
- `rejected`: "تم رفض طلبك — يرجى التواصل مع الإدارة" — red style

**Next trip card** (first `scheduled` trip sorted by `departureAt` ascending):
- Route: `route.origin.nameAr → route.destination.nameAr`
- Departure time formatted in Arabic locale
- Seat count: `(totalSeats - availableSeats) / totalSeats` (hidden for `whole_car` trips)
- Tap → `/driver/trips/:id`

**Empty state**: "لا توجد رحلات قادمة" when no `scheduled` trips

### My Trips List (`/driver/trips`)

**Data source:** `DriverTripService.loadMyTrips()` called in constructor

- Status filter chips: الكل / قادمة (`scheduled`) / جارية (`in_progress`) / مكتملة (`completed`) / ملغاة (`cancelled`)
- Filtering is client-side (no additional HTTP call)
- Trip card: `route.origin.nameAr → route.destination.nameAr`, `departureAt` formatted, seat count (hidden for `whole_car`), status badge
- Tap → trip detail (navigate to `/driver/trips/:id`)
- Empty state per filter: "لا توجد رحلات في هذه الفئة"

### Trip Detail + Passenger Manifest (`/driver/trips/:id`)

**Data source:** `DriverTripService.loadTrip(id)` called in constructor

**Trip header:**
- Route (origin → destination), departure datetime, car brand/model/plate

**Status action bar** (shown only for `scheduled` and `in_progress` statuses):
- `scheduled` → "ابدأ الرحلة" button → PrimeNG `ConfirmationService` confirm dialog → on confirm: `PATCH /trips/:id/status` with `{ status: 'in_progress' }`
- `in_progress` → "أنهِ الرحلة" button → confirm dialog → `PATCH /trips/:id/status` with `{ status: 'completed' }`
- `updatingStatus = signal(false)` — disables button while request in-flight; on success update `trip.status` signal

**Passenger manifest section (كشف ركاب):**

Columns: # | الاسم | الجنسية | رقم الهوية | المقعد | الدفع

- Payment badge: green "مدفوع ✓" for `paid`, amber "غير مدفوع" for `pending`
- **"استلمت الدفع"** button: shown only when `paymentStatus === 'pending'`
  - `collecting = signal<string | null>(null)` — holds the `bookingId` currently being collected; `null` when idle
  - Button disabled when `collecting() === entry.bookingId`
  - On success: update the entry's `paymentStatus` to `'paid'` in the signal (no page reload); set `collecting(null)`
  - On error: toast error; set `collecting(null)`
- Empty manifest message if trip has no active bookings: "لا يوجد ركاب مسجلون"

### My Documents (`/driver/documents`)

**Data source:** `DocumentService.loadDocuments()` — calls `GET /drivers/me` and extracts `documents[]` and `rejectionReason`

**Profile rejection banner** (shown at top when `approvalStatus === 'rejected'`):
- Shows `profile.rejectionReason` if present: "سبب الرفض: [reason]" in red style
- Note: `rejectionReason` is a single profile-level field — it is NOT per-document

**4 document slots always displayed:**

| docType | Arabic label |
|---------|-------------|
| `national_id` | الهوية الوطنية |
| `license` | رخصة القيادة |
| `car_registration` | استمارة السيارة |
| `car_photo` | صورة السيارة |

Each slot shows:
- If uploaded: upload date, status badge (`pending` / `approved` / `rejected`)
- If not uploaded: "لم يُرفع بعد" placeholder
- Upload / Re-upload button → hidden `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf">` → `POST /drivers/documents` multipart
- File constraints in UI hint: JPEG/PNG/WEBP/PDF, max 10 MB (validated by backend)
- `uploading = signal<DriverDocumentType | null>(null)` — null when idle; holds `docType` while request in-flight
- Upload button for a slot is disabled when `uploading() === slot.docType`
- On upload success: replace the document in the `documents` signal for that `docType`; set `uploading(null)`
- On upload error: toast error; set `uploading(null)`

### Driver Profile (`/driver/profile`)

**Data source:** `DriverProfileService.loadProfile()` called in constructor

**Driver info (read-only):** full name, phone, email, national ID, license number
**Car section:** for each car in `cars[]` — type, brand, model, year, plate number (multiple cars possible)
**Approval status badge**: pending / approved / rejected (with `rejectionReason` if `'rejected'`)
**Logout button**: calls `this.auth.clearSession()` then `this.router.navigate(['/login'])`

---

## Angular Patterns (consistent with Phases 1 & 2)

- All components are **standalone**
- All mutable state uses **`signal()`** — plain booleans don't trigger change detection in zoneless
- HTTP subscriptions use **`takeUntilDestroyed(this.destroyRef)`**
- Service init calls go in **constructor** (not `ngOnInit`) — tests call `createComponent()` without `detectChanges()`  
  > Note: Phase 2's `TripDetailComponent` uses `ngOnInit` for `BookingFlowService.init()` — that is a pre-existing exception due to the multi-step booking flow; do not follow that pattern in Phase 3
- **`inject()`** pattern for all service injection — no constructor parameters
- No `CommonModule` — use `@if` / `@for` control flow
- RTL icons: back = `pi-arrow-left`, forward = `pi-arrow-right`

---

## Testing

- Each service, repository, and component gets a `.spec.ts`
- Services: mock repository with `vi.fn()`, verify signal state updates
- Repositories: use Angular `HttpTestingController`, assert URL, method, and request body
- Components: `TestBed.createComponent()` + mock services, assert DOM state
- Key test cases:
  - `collecting` signal: button disabled for in-flight bookingId only, badge updates to "مدفوع ✓" on success, `collecting()` resets to null on success and on error
  - `uploading` signal: upload button disabled for only the slot being uploaded; document replaced in signal on success
  - Home approval banner: shown for `pending` and `rejected`; hidden for `approved`
  - Status action bar: "ابدأ الرحلة" shown for `scheduled`, "أنهِ الرحلة" for `in_progress`, hidden for `completed`/`cancelled`
  - `whole_car` manifest: rows rendered from `booking.passengers[]` with `seatCode = '—'`
- Target: all tests passing, production build clean

---

## Summary of Required Backend Changes

All three changes must be made before Phase 3 frontend implementation begins:

| # | File | Change |
|---|------|--------|
| 1 | `src/modules/trips/trips.service.ts` | Extend `findOne` bookings include: add `passengers: true` and `bookingSeats: { include: { carSeat: { select: { seatCode: true } }, passenger: { select: { fullName: true, nationality: true, idNumber: true } } } }` |
| 2 | `src/modules/drivers/drivers.service.ts` | Add `cars: true` to `getMyProfile` include |
| 3 | `src/modules/drivers/drivers.service.ts` | Add `idNumber: true` to the `user` select in `getMyProfile` |
