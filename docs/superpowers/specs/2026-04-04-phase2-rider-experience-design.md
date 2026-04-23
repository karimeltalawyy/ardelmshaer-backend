# Phase 2 — Rider Experience Design Spec

**Project:** Saudi Land Transport Platform — Angular 21 Frontend  
**Date:** 2026-04-04  
**Phase:** 2 of N — Rider Experience  
**Status:** Approved

---

## Goal

Implement the full rider-facing experience: trip search, trip results with filters, trip detail with multi-step seat booking, my bookings list, booking detail with cancellation, and rider profile with name editing.

---

## Scope

Six screens under the existing rider shell (`/rider/*`):

| Route | Screen |
|---|---|
| `/rider/trips` | Trip Search + Results |
| `/rider/trips/:id` | Trip Detail + Booking Stepper |
| `/rider/bookings` | My Bookings List |
| `/rider/bookings/:id` | Booking Detail |
| `/rider/profile` | Rider Profile |

The `/rider/home` placeholder route is out of scope for this phase.

---

## Architecture

### File Structure

```
src/app/features/rider/
  trips/
    models/
      trip.model.ts          — Trip, TripSummary, Destination, SeatInfo interfaces
    data/
      trip.repository.ts     — HTTP calls for destinations, search, findById
    services/
      trip.service.ts        — Signal-based facade (destinations, searchResults, selectedTrip, loading, error)
    components/
      trip-search/           — Search form component (/rider/trips)
      trip-results/          — Results list with filter chips (/rider/trips with query params)
      trip-detail/           — Trip detail + booking stepper (/rider/trips/:id)
        seat-map/            — Seat grid sub-component
        passenger-form/      — Passenger details sub-component
  bookings/
    models/
      booking.model.ts       — Booking, BookingSummary, PassengerForm, CreateBookingRequest interfaces
    data/
      booking.repository.ts  — HTTP calls for create, findMine, findById, cancel
    services/
      booking.service.ts     — Signal-based facade (myBookings, selectedBooking, loading, error)
      booking-flow.service.ts — Stepper state, provided in TripDetailComponent (not root)
    components/
      booking-list/          — My bookings list (/rider/bookings)
      booking-detail/        — Booking detail + cancel (/rider/bookings/:id)
  profile/
    models/
      rider-profile.model.ts — RiderProfile interface
    data/
      profile.repository.ts  — HTTP calls for getMe, updateMe
    services/
      profile.service.ts     — Signal-based facade (profile, loading, saving)
    components/
      profile/               — Rider profile view + name edit (/rider/profile)
```

### Clean Architecture Layers

Same pattern as Phase 1:
- **Models** — plain TypeScript interfaces, no Angular dependencies
- **Repositories** — inject `HttpClient`, return `Observable<T>`
- **Services** — inject repository, expose signals + methods, handle errors via `ToastService`
- **Components** — inject service, bind to signals, call service methods on user action

---

## Screen Designs

### 1. Trip Search (`/rider/trips`)

- Three fields: **Origin** (dropdown), **Destination** (dropdown), **Date** (date picker)
- Origin/destination options loaded from `GET /api/v1/destinations` on component init
- On submit: navigate to `/rider/trips?originId=&destinationId=&departureDate=`
- If query params already present on init (back-navigation): pre-populate form and auto-trigger search
- Both search form and results live on the same route; results appear below the form after search

### 2. Trip Results (`/rider/trips` with query params)

- Results loaded on init from query params via `GET /api/v1/trips/search`
- **Filter chips** at top of results: `bookingMode` (all / per_seat / per_trip) and `carType` — applied client-side after load
- Trip cards use the Phase 1 `TripCard` shared component
- Empty state: `AppEmptyState` shared component
- Loading state: `AppLoading` shared component
- Tapping a card navigates to `/rider/trips/:id`

### 3. Trip Detail + Booking Stepper (`/rider/trips/:id`)

Trip loaded from `GET /api/v1/trips/:id` (response includes seats and existing bookings).

**Four inline steps (no sub-routes):**

**Step 1 — Trip Summary**
- Origin, destination, departure time, arrival time, car type, price per seat / price per trip
- "Select This Trip" button to proceed

**Step 2 — Seat Map** *(skipped for `per_trip` bookingMode)*
- Full seat grid rendered from trip's seat data
- Occupied seats (already booked): gray background, disabled, non-clickable
- Available seats: clickable, highlight on select
- Selected seats: distinct highlight color (GOV.SA secondary `#C8A951`)
- User must select at least 1 seat to proceed

**Step 3 — Passenger Details**
- One form row per selected seat (or one row for per_trip)
- Fields per row: **Full Name**, **Nationality**, **ID Number**
- Slot 1 pre-filled from rider's profile (name + ID number); user can edit
- All fields required; inline validation before proceeding

**Step 4 — Payment & Confirm**
- Payment method selector: radio buttons from `PaymentMethod` enum values
- Booking summary: trip route, date, seat numbers, passenger count, total price
- "Confirm Booking" button → `POST /api/v1/bookings`
- On success: navigate to `/rider/bookings` (my bookings list)
- On error: toast error, stay on step 4

**Stepper state** managed by `BookingFlowService` provided in `TripDetailComponent` — destroyed with component, preventing stale state.

### 4. My Bookings List (`/rider/bookings`)

- Loaded from `GET /api/v1/bookings/my` on init
- Phase 1 `BookingCard` shared component for each booking
- Status badge on each card (confirmed, cancelled, completed, etc.)
- Empty state if no bookings
- Tap card → `/rider/bookings/:id`

### 5. Booking Detail (`/rider/bookings/:id`)

- Loaded from `GET /api/v1/bookings/:id`
- Full details: trip route, departure/arrival, seat numbers, passengers (name + ID), payment method, status, total price
- **Cancel button** shown only if booking status allows cancellation (not cancelled, not completed)
- Cancel flow: PrimeNG `ConfirmDialog` → on confirm → `DELETE /api/v1/bookings/:id` → toast success → navigate back to `/rider/bookings`

### 6. Rider Profile (`/rider/profile`)

- Loaded from `GET /api/v1/users/me` on init
- **Read-only fields**: phone number, ID number (with note: "لتغيير هذه البيانات تواصل معنا" — contact us to change)
- **Editable field**: full name — inline `InputText` with Save button
- Save calls `PATCH /api/v1/users/me` with `{ fullName }` → toast success on save
- Loading/saving states shown

---

## State Management

All state uses Angular signals. No NgRx.

### `TripService`
```typescript
destinations: Signal<Destination[]>
searchResults: Signal<TripSummary[]>
selectedTrip: Signal<Trip | null>
loading: Signal<boolean>
error: Signal<string | null>

loadDestinations(): void
searchTrips(params: TripSearchParams): void
loadTrip(id: string): void
```

### `BookingFlowService` *(provided in TripDetailComponent)*
```typescript
currentStep: Signal<1 | 2 | 3 | 4>
selectedSeatIds: Signal<string[]>
passengers: Signal<PassengerForm[]>
paymentMethod: Signal<PaymentMethod | null>

nextStep(): void
prevStep(): void
reset(): void
canProceed(): boolean   // validates current step
```

### `BookingService`
```typescript
myBookings: Signal<BookingSummary[]>
selectedBooking: Signal<Booking | null>
loading: Signal<boolean>
error: Signal<string | null>

loadMyBookings(): void
loadBooking(id: string): void
createBooking(dto: CreateBookingRequest): Observable<Booking>
cancelBooking(id: string): Observable<void>
```

### `ProfileService`
```typescript
profile: Signal<RiderProfile | null>
loading: Signal<boolean>
saving: Signal<boolean>

loadProfile(): void
updateName(fullName: string): Observable<RiderProfile>
```

---

## API Mapping

| Method | Endpoint | Used By |
|---|---|---|
| GET | `/api/v1/destinations` | TripRepository.loadDestinations() |
| GET | `/api/v1/trips/search?originId=&destinationId=&departureDate=&bookingMode=&carType=` | TripRepository.search(params) |
| GET | `/api/v1/trips/:id` | TripRepository.findById(id) |
| POST | `/api/v1/bookings` | BookingRepository.create(dto) |
| GET | `/api/v1/bookings/my` | BookingRepository.findMine() |
| GET | `/api/v1/bookings/:id` | BookingRepository.findById(id) |
| DELETE | `/api/v1/bookings/:id` | BookingRepository.cancel(id) |
| GET | `/api/v1/users/me` | ProfileRepository.getMe() |
| PATCH | `/api/v1/users/me` | ProfileRepository.updateMe(dto) |

---

## Models

```typescript
// Destination
interface Destination {
  id: string;
  nameAr: string;
  nameEn: string;
}

// TripSummary (for results list)
interface TripSummary {
  id: string;
  origin: Destination;
  destination: Destination;
  departureTime: string;   // ISO string
  arrivalTime: string;
  bookingMode: BookingMode;
  carType: CarType;
  pricePerSeat?: number;
  pricePerTrip?: number;
  availableSeats: number;
}

// SeatInfo
interface SeatInfo {
  id: string;
  seatNumber: string;
  isBooked: boolean;
}

// Trip (full detail)
interface Trip extends TripSummary {
  seats: SeatInfo[];
  driverName: string;
  vehiclePlate: string;
}

// PassengerForm
interface PassengerForm {
  fullName: string;
  nationality: string;
  idNumber: string;
}

// CreateBookingRequest
interface CreateBookingRequest {
  tripId: string;
  seatIds?: string[];
  passengers: PassengerForm[];
  paymentMethod: PaymentMethod;
}

// BookingSummary (for list)
interface BookingSummary {
  id: string;
  trip: TripSummary;
  status: BookingStatus;
  totalPrice: number;
  createdAt: string;
}

// Booking (full detail)
interface Booking extends BookingSummary {
  seats: SeatInfo[];
  passengers: PassengerForm[];
  paymentMethod: PaymentMethod;
}

// RiderProfile
interface RiderProfile {
  id: string;
  fullName: string;
  phone: string;
  idNumber: string;
}
```

---

## Error Handling

- All API errors surfaced via PrimeNG toast (error severity) through existing `ToastService`
- Loading states: `AppLoading` spinner (Phase 1 shared component)
- Empty states: `AppEmptyState` (Phase 1 shared component)
- Auth errors (401/403) handled by existing `AuthInterceptor` — no additional handling needed in these components
- Booking creation errors: stay on step 4, show toast

---

## Design Constraints

- **RTL**: all components use `dir="rtl"`, logical CSS properties, Arabic text
- **GOV.SA design system**: `--govsa-primary: #1B3A6B`, `--govsa-secondary: #C8A951` (seat selection highlight)
- **Mobile-first**: responsive, bottom-nav shell already in place from Phase 1
- **PrimeNG 21**: use existing `providePrimeNG()` configuration, `Aura` preset
- **Zoneless**: `inject()` pattern throughout, no constructor injection, no `ngOnInit` lifecycle (use `afterNextRender` or signal effects where needed)

---

## Testing

- **Repositories**: `HttpTestingController` to verify correct endpoints and request bodies
- **Services**: mock repositories with `vi.fn()`, verify signal state transitions
- **BookingFlowService**: unit test step transitions, `canProceed()` validation per step
- **Components**: render tests + key interaction tests (search submit, step navigation, cancel dialog confirmation)
- **Test runner**: Vitest via `npx ng test --watch=false`

---

## Out of Scope

- Driver experience (Phase 3)
- Admin panel (Phase 4)
- Real-time seat availability updates (WebSocket)
- Payment gateway integration (PaymentMethod is enum only — no real payment processing)
- Push notifications
