# Phase 2 — Rider Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full rider experience in the Angular 21 frontend: trip search + results, trip detail with 4-step booking stepper, my bookings list, booking detail with cancellation, and rider profile with name editing.

**Architecture:** Signal-based clean architecture (models → repository → service → component). `BookingFlowService` is provided only in `TripDetailComponent` and destroyed with it — preventing stale state across navigations. Repositories map raw backend responses to lean frontend models. No NgRx, no BehaviorSubject in services.

**Tech Stack:** Angular 21 (standalone, zoneless, signals, `inject()`), PrimeNG 21 (`primeng/select`, `primeng/datepicker`, `primeng/confirmdialog`, `primeng/radiobutton`), GOV.SA CSS variables, Vitest (`npx ng test --watch=false`), NestJS backend at `http://localhost:3000/api/v1`

---

## Codebase Context

**Working directory:** `/Users/krim/Documents/transport-frontend`

**Key existing files to know before touching anything:**
- `src/app/core/services/api.service.ts` — `ApiService` with `.get<T>()`, `.post<T>()`, `.patch<T>()`, `.delete<T>()` methods. Use this, never inject `HttpClient` directly.
- `src/app/core/services/toast.service.ts` — `ToastService` with `.success()`, `.error()`, `.warn()` methods.
- `src/app/core/auth/auth.service.ts` — `AuthService` with `currentUser` (readonly signal), `isLoggedIn()`, `role()` computed signals.
- `src/app/shared/index.ts` — re-exports `AppLoadingComponent`, `AppEmptyStateComponent`, `AppCardComponent`, `AppPageHeaderComponent`, `TripCardComponent` (needs `TripCardData`), `BookingCardComponent` (needs `BookingCardData`), `ArabicDatePipe`, `CurrencySarPipe`.
- `src/app/features/rider/rider.routes.ts` — placeholder routes to replace.
- `src/app/app.config.ts` — app providers including `MessageService` from `primeng/api`.

**Test runner:** Vitest globals are enabled — `vi`, `describe`, `it`, `expect`, `beforeEach`, `afterEach` are all global. No import needed.

**Backend enum values (from Prisma schema):**
- `BookingMode`: `per_seat` | `whole_car`
- `CarType`: `sedan` | `family` | `vip` | `limousine` | `minibus` | `bus`
- `PaymentMethod`: `cash` | `card` | `mada`
- `BookingStatus`: `pending` | `confirmed` | `cancelled`
- `PaymentStatus`: `pending` | `paid` | `refunded`

**Backend response shapes** (what the repositories must map FROM):

Trip (`GET /trips/search` and `GET /trips/:id`):
```
raw.id, raw.departureAt (ISO string), raw.status, raw.bookingMode, raw.pricePerSeat, raw.priceWholeCar,
raw.totalSeats, raw.availableSeats,
raw.route.origin.{ id, nameAr, nameEn },
raw.route.destination.{ id, nameAr, nameEn },
raw.car.{ carType, brand, model, plateNumber },
raw.car.seats[].{ id, seatCode, position }   (only in /trips/:id),
raw.bookings[].bookingSeats[].{ carSeatId, status }  (only in /trips/:id),
raw.driver.user.{ fullName, phone }
```

Booking (`GET /bookings/my`, `GET /bookings/:id`, `POST /bookings`, `DELETE /bookings/:id`):
```
raw.id, raw.tripId, raw.bookingMode, raw.seatCount, raw.totalPrice, raw.paymentMethod,
raw.paymentStatus, raw.status, raw.createdAt, raw.cancellationReason,
raw.trip.departureAt, raw.trip.status, raw.trip.bookingMode,
raw.trip.route.origin.{ nameAr, nameEn },
raw.trip.route.destination.{ nameAr, nameEn },
raw.trip.car.{ plateNumber },
raw.trip.driver.user.{ fullName, phone },
raw.passengers[].{ fullName, nationality, idNumber },
raw.bookingSeats[].carSeat.{ seatCode }
```

---

## File Map

**Create:**
```
src/app/features/rider/
  trips/
    models/trip.model.ts
    data/trip.repository.ts
    data/trip.repository.spec.ts
    services/trip.service.ts
    services/trip.service.spec.ts
    components/
      trip-search/trip-search.component.ts
      trip-search/trip-search.component.html
      trip-search/trip-search.component.scss
      trip-search/trip-search.component.spec.ts
      trip-results/trip-results.component.ts
      trip-results/trip-results.component.html
      trip-results/trip-results.component.scss
      trip-results/trip-results.component.spec.ts
      trip-detail/trip-detail.component.ts
      trip-detail/trip-detail.component.html
      trip-detail/trip-detail.component.scss
      trip-detail/trip-detail.component.spec.ts
      trip-detail/seat-map/seat-map.component.ts
      trip-detail/seat-map/seat-map.component.scss
      trip-detail/seat-map/seat-map.component.spec.ts
      trip-detail/passenger-form/passenger-form.component.ts
      trip-detail/passenger-form/passenger-form.component.spec.ts
  bookings/
    models/booking.model.ts
    data/booking.repository.ts
    data/booking.repository.spec.ts
    services/booking.service.ts
    services/booking.service.spec.ts
    services/booking-flow.service.ts
    services/booking-flow.service.spec.ts
    components/
      booking-list/booking-list.component.ts
      booking-list/booking-list.component.html
      booking-list/booking-list.component.scss
      booking-list/booking-list.component.spec.ts
      booking-detail/booking-detail.component.ts
      booking-detail/booking-detail.component.html
      booking-detail/booking-detail.component.scss
      booking-detail/booking-detail.component.spec.ts
  profile/
    models/rider-profile.model.ts
    data/profile.repository.ts
    data/profile.repository.spec.ts
    services/profile.service.ts
    services/profile.service.spec.ts
    components/profile/profile.component.ts
    components/profile/profile.component.html
    components/profile/profile.component.scss
    components/profile/profile.component.spec.ts
```

**Modify:**
- `src/app/features/rider/rider.routes.ts` — replace placeholder with real lazy-loaded routes
- `src/app/core/models/user.model.ts` — add `idNumber?: string` field
- `src/app/core/auth/auth.service.ts` — add `updateFullName(name: string): void` method
- `src/app/app.config.ts` — add `ConfirmationService` to providers

---

## Task 1: Trip Models

**Files:**
- Create: `src/app/features/rider/trips/models/trip.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/app/features/rider/trips/models/trip.model.ts

export type BookingMode = 'per_seat' | 'whole_car';
export type CarType = 'sedan' | 'family' | 'vip' | 'limousine' | 'minibus' | 'bus';
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SeatPosition = 'front' | 'middle' | 'back';

export interface Destination {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface SeatInfo {
  id: string;
  seatCode: string;
  position: SeatPosition;
  isBooked: boolean;
}

export interface TripSummary {
  id: string;
  origin: Destination;
  destination: Destination;
  departureAt: string;
  bookingMode: BookingMode;
  carType: CarType;
  pricePerSeat: number | null;
  priceWholeCar: number | null;
  availableSeats: number | null;
  status: TripStatus;
  driverName: string;
}

export interface Trip extends TripSummary {
  seats: SeatInfo[];
  carBrand: string;
  carModel: string;
  vehiclePlate: string;
}

export interface TripSearchParams {
  originId: string;
  destinationId: string;
  departureDate: string;
  bookingMode?: BookingMode;
  carType?: CarType;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`
Expected: no errors related to this file

- [ ] **Step 3: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/models/trip.model.ts
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add trip models"
```

---

## Task 2: TripRepository

**Files:**
- Create: `src/app/features/rider/trips/data/trip.repository.ts`
- Create: `src/app/features/rider/trips/data/trip.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/data/trip.repository.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TripRepository } from './trip.repository';

describe('TripRepository', () => {
  let repo: TripRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TripRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(TripRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should map destinations from API response', async () => {
    const promise = repo.loadDestinations().toPromise();
    const req = http.expectOne(r => r.url.includes('/destinations'));
    req.flush([{ id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh', type: 'city', isActive: true }]);
    const result = await promise;
    expect(result).toEqual([{ id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh' }]);
  });

  it('should map trip summaries from search response', async () => {
    const promise = repo.search({ originId: 'd1', destinationId: 'd2', departureDate: '2026-05-01' }).toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/search'));
    const rawTrip = {
      id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
      bookingMode: 'per_seat', pricePerSeat: 50, priceWholeCar: null,
      totalSeats: 4, availableSeats: 3,
      route: {
        origin: { id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh' },
        destination: { id: 'd2', nameAr: 'جدة', nameEn: 'Jeddah' },
      },
      car: { carType: 'sedan', brand: 'Toyota', model: 'Camry', plateNumber: 'ABC123', seats: [] },
      driver: { user: { fullName: 'خالد', phone: '0501234567' } },
      season: null,
    };
    req.flush([rawTrip]);
    const result = await promise;
    expect(result![0].id).toBe('t1');
    expect(result![0].origin.nameAr).toBe('الرياض');
    expect(result![0].pricePerSeat).toBe(50);
    expect(result![0].driverName).toBe('خالد');
  });

  it('should map trip detail with seat availability', async () => {
    const promise = repo.findById('t1').toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/t1'));
    const rawTrip = {
      id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
      bookingMode: 'per_seat', pricePerSeat: 50, priceWholeCar: null,
      totalSeats: 2, availableSeats: 1,
      route: {
        origin: { id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh' },
        destination: { id: 'd2', nameAr: 'جدة', nameEn: 'Jeddah' },
      },
      car: {
        carType: 'sedan', brand: 'Toyota', model: 'Camry', plateNumber: 'ABC123',
        seats: [
          { id: 's1', seatCode: 'A1', position: 'front' },
          { id: 's2', seatCode: 'A2', position: 'back' },
        ],
      },
      driver: { user: { fullName: 'خالد', phone: '0501234567' } },
      season: null,
      bookings: [
        { bookingSeats: [{ carSeatId: 's1', status: 'confirmed' }] },
      ],
    };
    req.flush(rawTrip);
    const result = await promise;
    expect(result!.seats).toHaveLength(2);
    expect(result!.seats.find(s => s.id === 's1')!.isBooked).toBe(true);
    expect(result!.seats.find(s => s.id === 's2')!.isBooked).toBe(false);
    expect(result!.vehiclePlate).toBe('ABC123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "FAIL|PASS|Error" | head -10`
Expected: FAIL (TripRepository not found)

- [ ] **Step 3: Implement TripRepository**

```typescript
// src/app/features/rider/trips/data/trip.repository.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import {
  Destination, Trip, TripSearchParams, TripSummary, SeatInfo
} from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripRepository {
  private api = inject(ApiService);

  loadDestinations(): Observable<Destination[]> {
    return this.api.get<any[]>('/destinations', { activeOnly: true }).pipe(
      map(items => items.map(d => ({ id: d.id, nameAr: d.nameAr, nameEn: d.nameEn })))
    );
  }

  search(params: TripSearchParams): Observable<TripSummary[]> {
    const q: Record<string, string> = {
      originId: params.originId,
      destinationId: params.destinationId,
      departureDate: params.departureDate,
    };
    if (params.bookingMode) q['bookingMode'] = params.bookingMode;
    if (params.carType) q['carType'] = params.carType;
    return this.api.get<any[]>('/trips/search', q).pipe(
      map(items => items.map(t => this.mapSummary(t)))
    );
  }

  findById(id: string): Observable<Trip> {
    return this.api.get<any>(`/trips/${id}`).pipe(
      map(t => this.mapDetail(t))
    );
  }

  private mapSummary(raw: any): TripSummary {
    return {
      id: raw.id,
      origin: { id: raw.route.origin.id, nameAr: raw.route.origin.nameAr, nameEn: raw.route.origin.nameEn },
      destination: { id: raw.route.destination.id, nameAr: raw.route.destination.nameAr, nameEn: raw.route.destination.nameEn },
      departureAt: raw.departureAt,
      bookingMode: raw.bookingMode,
      carType: raw.car.carType,
      pricePerSeat: raw.pricePerSeat !== null && raw.pricePerSeat !== undefined ? Number(raw.pricePerSeat) : null,
      priceWholeCar: raw.priceWholeCar !== null && raw.priceWholeCar !== undefined ? Number(raw.priceWholeCar) : null,
      availableSeats: raw.availableSeats ?? null,
      status: raw.status,
      driverName: raw.driver.user.fullName,
    };
  }

  private mapDetail(raw: any): Trip {
    const bookedIds = new Set<string>(
      (raw.bookings ?? [])
        .flatMap((b: any) => b.bookingSeats ?? [])
        .filter((bs: any) => bs.status !== 'cancelled')
        .map((bs: any) => bs.carSeatId as string)
    );
    const seats: SeatInfo[] = (raw.car.seats ?? []).map((s: any) => ({
      id: s.id,
      seatCode: s.seatCode,
      position: s.position,
      isBooked: bookedIds.has(s.id),
    }));
    return {
      ...this.mapSummary(raw),
      seats,
      carBrand: raw.car.brand,
      carModel: raw.car.model,
      vehiclePlate: raw.car.plateNumber,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip.repository|FAIL|PASS" | head -10`
Expected: all 3 TripRepository tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/data/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add TripRepository with response mapping"
```

---

## Task 3: TripService

**Files:**
- Create: `src/app/features/rider/trips/services/trip.service.ts`
- Create: `src/app/features/rider/trips/services/trip.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/services/trip.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TripService } from './trip.service';
import { TripRepository } from '../data/trip.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { TripSummary, Trip, Destination } from '../models/trip.model';

const mockDest: Destination = { id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh' };
const mockSummary: TripSummary = {
  id: 't1', origin: mockDest, destination: { id: 'd2', nameAr: 'جدة', nameEn: 'Jeddah' },
  departureAt: '2026-05-01T08:00:00Z', bookingMode: 'per_seat', carType: 'sedan',
  pricePerSeat: 50, priceWholeCar: null, availableSeats: 3, status: 'scheduled', driverName: 'خالد',
};
const mockTrip: Trip = { ...mockSummary, seats: [], carBrand: 'Toyota', carModel: 'Camry', vehiclePlate: 'ABC' };

describe('TripService', () => {
  let service: TripService;
  let repo: { loadDestinations: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = {
      loadDestinations: vi.fn().mockReturnValue(of([mockDest])),
      search: vi.fn().mockReturnValue(of([mockSummary])),
      findById: vi.fn().mockReturnValue(of(mockTrip)),
    };
    toast = { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        TripService,
        { provide: TripRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(TripService);
  });

  it('should load destinations into signal', () => {
    service.loadDestinations();
    expect(service.destinations()).toEqual([mockDest]);
  });

  it('should search and populate searchResults signal', () => {
    service.searchTrips({ originId: 'd1', destinationId: 'd2', departureDate: '2026-05-01' });
    expect(service.searchResults()).toEqual([mockSummary]);
    expect(service.loading()).toBe(false);
  });

  it('should set loading false and toast on search error', () => {
    repo.search.mockReturnValue(throwError(() => new Error('network')));
    service.searchTrips({ originId: 'd1', destinationId: 'd2', departureDate: '2026-05-01' });
    expect(service.loading()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('should load trip detail into selectedTrip signal', () => {
    service.loadTrip('t1');
    expect(service.selectedTrip()).toEqual(mockTrip);
    expect(service.loading()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip.service|FAIL|PASS" | head -10`
Expected: FAIL (TripService not found)

- [ ] **Step 3: Implement TripService**

```typescript
// src/app/features/rider/trips/services/trip.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TripRepository } from '../data/trip.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { Destination, Trip, TripSearchParams, TripSummary } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private repo  = inject(TripRepository);
  private toast = inject(ToastService);

  private _destinations   = signal<Destination[]>([]);
  private _searchResults  = signal<TripSummary[]>([]);
  private _selectedTrip   = signal<Trip | null>(null);
  private _loading        = signal(false);

  readonly destinations  = this._destinations.asReadonly();
  readonly searchResults = this._searchResults.asReadonly();
  readonly selectedTrip  = this._selectedTrip.asReadonly();
  readonly loading       = this._loading.asReadonly();

  loadDestinations(): void {
    this.repo.loadDestinations().subscribe({
      next: d => this._destinations.set(d),
      error: () => this.toast.error('فشل تحميل الوجهات'),
    });
  }

  searchTrips(params: TripSearchParams): void {
    this._loading.set(true);
    this.repo.search(params).subscribe({
      next: trips => { this._searchResults.set(trips); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل البحث عن الرحلات'); },
    });
  }

  loadTrip(id: string): void {
    this._loading.set(true);
    this._selectedTrip.set(null);
    this.repo.findById(id).subscribe({
      next: trip => { this._selectedTrip.set(trip); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل بيانات الرحلة'); },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip.service|FAIL|PASS" | head -10`
Expected: all 4 TripService tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/services/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add TripService with signal-based state"
```

---

## Task 4: Booking Models + Core User Model Update

**Files:**
- Create: `src/app/features/rider/bookings/models/booking.model.ts`
- Modify: `src/app/core/models/user.model.ts`
- Modify: `src/app/core/auth/auth.service.ts`

- [ ] **Step 1: Create booking model**

```typescript
// src/app/features/rider/bookings/models/booking.model.ts
import { BookingMode } from '../../trips/models/trip.model';

export type BookingStatus  = 'pending' | 'confirmed' | 'cancelled';
export type PaymentMethod  = 'cash' | 'card' | 'mada';
export type PaymentStatus  = 'pending' | 'paid' | 'refunded';

export interface PassengerForm {
  fullName:    string;
  nationality: string;
  idNumber:    string;
}

export interface CreateBookingRequest {
  tripId:        string;
  seatIds?:      string[];
  passengers:    PassengerForm[];
  paymentMethod: PaymentMethod;
}

export interface BookingSummary {
  id:               string;
  originNameAr:     string;
  destinationNameAr:string;
  departureAt:      string;
  totalPrice:       number;
  status:           BookingStatus;
  paymentStatus:    PaymentStatus;
  seatCount:        number | null;
  bookingMode:      BookingMode;
}

export interface Booking extends BookingSummary {
  paymentMethod:       PaymentMethod;
  passengers:          PassengerForm[];
  seatCodes:           string[];
  driverName:          string;
  driverPhone:         string;
  vehiclePlate:        string;
  cancellationReason:  string | null;
  createdAt:           string;
  tripId:              string;
}
```

- [ ] **Step 2: Add `idNumber` to User model**

In `src/app/core/models/user.model.ts`, add `idNumber?: string` after the `nationality?` line:

```typescript
export interface User {
  id:          string;
  fullName:    string;
  email:       string;
  phone?:      string;
  nationality?: string;
  idNumber?:   string;   // ← add this line
  role:        UserRole;
  status:      UserStatus;
}
```

- [ ] **Step 3: Add `updateFullName` to AuthService**

In `src/app/core/auth/auth.service.ts`, add this method after `getToken()`:

```typescript
updateFullName(name: string): void {
  const user = this._currentUser();
  if (!user) return;
  const updated = { ...user, fullName: name };
  this.storage.set('current_user', JSON.stringify(updated));
  this._currentUser.set(updated);
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add \
  src/app/features/rider/bookings/models/booking.model.ts \
  src/app/core/models/user.model.ts \
  src/app/core/auth/auth.service.ts
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add booking models, idNumber to User, updateFullName to AuthService"
```

---

## Task 5: BookingRepository

**Files:**
- Create: `src/app/features/rider/bookings/data/booking.repository.ts`
- Create: `src/app/features/rider/bookings/data/booking.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/bookings/data/booking.repository.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BookingRepository } from './booking.repository';

const rawBooking = {
  id: 'b1', tripId: 't1', bookingMode: 'per_seat', seatCount: 1,
  totalPrice: 50, paymentMethod: 'cash', paymentStatus: 'pending',
  status: 'confirmed', createdAt: '2026-05-01T10:00:00Z', cancellationReason: null,
  trip: {
    departureAt: '2026-05-01T08:00:00Z', status: 'scheduled', bookingMode: 'per_seat',
    route: {
      origin: { nameAr: 'الرياض', nameEn: 'Riyadh' },
      destination: { nameAr: 'جدة', nameEn: 'Jeddah' },
    },
    car: { plateNumber: 'ABC123' },
    driver: { user: { fullName: 'خالد', phone: '0501234567' } },
  },
  passengers: [{ fullName: 'أحمد', nationality: 'Saudi', idNumber: '1234567890' }],
  bookingSeats: [{ carSeat: { seatCode: 'A1' } }],
};

describe('BookingRepository', () => {
  let repo: BookingRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(BookingRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should map booking summaries from findMine', async () => {
    const promise = repo.findMine().toPromise();
    const req = http.expectOne(r => r.url.includes('/bookings/my'));
    req.flush([rawBooking]);
    const result = await promise;
    expect(result![0].id).toBe('b1');
    expect(result![0].originNameAr).toBe('الرياض');
    expect(result![0].totalPrice).toBe(50);
  });

  it('should map full booking from findById', async () => {
    const promise = repo.findById('b1').toPromise();
    const req = http.expectOne(r => r.url.includes('/bookings/b1'));
    req.flush(rawBooking);
    const result = await promise;
    expect(result!.passengers[0].fullName).toBe('أحمد');
    expect(result!.seatCodes).toEqual(['A1']);
    expect(result!.driverName).toBe('خالد');
    expect(result!.vehiclePlate).toBe('ABC123');
  });

  it('should POST to /bookings on create', async () => {
    const dto = { tripId: 't1', seatIds: ['s1'], passengers: [{ fullName: 'أحمد', nationality: 'Saudi', idNumber: '123' }], paymentMethod: 'cash' as const };
    const promise = repo.create(dto).toPromise();
    const req = http.expectOne(r => r.url.includes('/bookings') && r.method === 'POST');
    expect(req.request.body.tripId).toBe('t1');
    req.flush(rawBooking);
    const result = await promise;
    expect(result!.id).toBe('b1');
  });

  it('should DELETE to /bookings/:id on cancel', async () => {
    const promise = repo.cancel('b1').toPromise();
    const req = http.expectOne(r => r.url.includes('/bookings/b1') && r.method === 'DELETE');
    req.flush(rawBooking);
    const result = await promise;
    expect(result!.id).toBe('b1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking.repository|FAIL" | head -5`
Expected: FAIL (BookingRepository not found)

- [ ] **Step 3: Implement BookingRepository**

```typescript
// src/app/features/rider/bookings/data/booking.repository.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { Booking, BookingSummary, CreateBookingRequest } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingRepository {
  private api = inject(ApiService);

  create(dto: CreateBookingRequest): Observable<Booking> {
    return this.api.post<any>('/bookings', dto).pipe(map(b => this.mapBooking(b)));
  }

  findMine(): Observable<BookingSummary[]> {
    return this.api.get<any[]>('/bookings/my').pipe(
      map(items => items.map(b => this.mapSummary(b)))
    );
  }

  findById(id: string): Observable<Booking> {
    return this.api.get<any>(`/bookings/${id}`).pipe(map(b => this.mapBooking(b)));
  }

  cancel(id: string): Observable<Booking> {
    return this.api.delete<any>(`/bookings/${id}`).pipe(map(b => this.mapBooking(b)));
  }

  private mapSummary(raw: any): BookingSummary {
    return {
      id:                raw.id,
      originNameAr:      raw.trip.route.origin.nameAr,
      destinationNameAr: raw.trip.route.destination.nameAr,
      departureAt:       raw.trip.departureAt,
      totalPrice:        Number(raw.totalPrice),
      status:            raw.status,
      paymentStatus:     raw.paymentStatus,
      seatCount:         raw.seatCount ?? null,
      bookingMode:       raw.bookingMode,
    };
  }

  private mapBooking(raw: any): Booking {
    return {
      ...this.mapSummary(raw),
      tripId:             raw.tripId,
      paymentMethod:      raw.paymentMethod,
      passengers:         (raw.passengers ?? []).map((p: any) => ({
        fullName: p.fullName, nationality: p.nationality, idNumber: p.idNumber,
      })),
      seatCodes:          (raw.bookingSeats ?? []).map((bs: any) => bs.carSeat?.seatCode ?? ''),
      driverName:         raw.trip.driver.user.fullName,
      driverPhone:        raw.trip.driver.user.phone,
      vehiclePlate:       raw.trip.car.plateNumber,
      cancellationReason: raw.cancellationReason ?? null,
      createdAt:          raw.createdAt,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking.repository|FAIL|PASS" | head -10`
Expected: all 4 BookingRepository tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/bookings/data/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add BookingRepository with response mapping"
```

---

## Task 6: BookingService

**Files:**
- Create: `src/app/features/rider/bookings/services/booking.service.ts`
- Create: `src/app/features/rider/bookings/services/booking.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/bookings/services/booking.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BookingService } from './booking.service';
import { BookingRepository } from '../data/booking.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { Booking, BookingSummary } from '../models/booking.model';

const mockSummary: BookingSummary = {
  id: 'b1', originNameAr: 'الرياض', destinationNameAr: 'جدة',
  departureAt: '2026-05-01T08:00:00Z', totalPrice: 50,
  status: 'confirmed', paymentStatus: 'pending', seatCount: 1, bookingMode: 'per_seat',
};
const mockBooking: Booking = {
  ...mockSummary, tripId: 't1', paymentMethod: 'cash',
  passengers: [], seatCodes: [], driverName: 'خالد', driverPhone: '050',
  vehiclePlate: 'ABC', cancellationReason: null, createdAt: '2026-05-01T10:00:00Z',
};

describe('BookingService', () => {
  let service: BookingService;
  let repo: { findMine: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = {
      findMine: vi.fn().mockReturnValue(of([mockSummary])),
      findById: vi.fn().mockReturnValue(of(mockBooking)),
      create: vi.fn().mockReturnValue(of(mockBooking)),
      cancel: vi.fn().mockReturnValue(of(mockBooking)),
    };
    toast = { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        BookingService,
        { provide: BookingRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(BookingService);
  });

  it('should load my bookings into signal', () => {
    service.loadMyBookings();
    expect(service.myBookings()).toEqual([mockSummary]);
    expect(service.loading()).toBe(false);
  });

  it('should load booking detail into selectedBooking signal', () => {
    service.loadBooking('b1');
    expect(service.selectedBooking()).toEqual(mockBooking);
    expect(service.loading()).toBe(false);
  });

  it('should toast error on loadMyBookings failure', () => {
    repo.findMine.mockReturnValue(throwError(() => new Error('net')));
    service.loadMyBookings();
    expect(service.loading()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('should return observable from createBooking', done => {
    const dto = { tripId: 't1', passengers: [], paymentMethod: 'cash' as const };
    service.createBooking(dto).subscribe(result => {
      expect(result.id).toBe('b1');
      done();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking.service|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement BookingService**

```typescript
// src/app/features/rider/bookings/services/booking.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BookingRepository } from '../data/booking.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { Booking, BookingSummary, CreateBookingRequest } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private repo  = inject(BookingRepository);
  private toast = inject(ToastService);

  private _myBookings     = signal<BookingSummary[]>([]);
  private _selectedBooking = signal<Booking | null>(null);
  private _loading        = signal(false);

  readonly myBookings      = this._myBookings.asReadonly();
  readonly selectedBooking = this._selectedBooking.asReadonly();
  readonly loading         = this._loading.asReadonly();

  loadMyBookings(): void {
    this._loading.set(true);
    this.repo.findMine().subscribe({
      next: list => { this._myBookings.set(list); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل الحجوزات'); },
    });
  }

  loadBooking(id: string): void {
    this._loading.set(true);
    this._selectedBooking.set(null);
    this.repo.findById(id).subscribe({
      next: b => { this._selectedBooking.set(b); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل بيانات الحجز'); },
    });
  }

  createBooking(dto: CreateBookingRequest): Observable<Booking> {
    return this.repo.create(dto);
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.repo.cancel(id);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking.service|FAIL|PASS" | head -10`
Expected: all 4 BookingService tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/bookings/services/booking.service.ts src/app/features/rider/bookings/services/booking.service.spec.ts
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add BookingService"
```

---

## Task 7: BookingFlowService

**Files:**
- Create: `src/app/features/rider/bookings/services/booking-flow.service.ts`
- Create: `src/app/features/rider/bookings/services/booking-flow.service.spec.ts`

Note: This service is **not** `providedIn: 'root'`. It is provided in `TripDetailComponent` via `providers: [BookingFlowService]`. This means it is created fresh and destroyed with the component — no stale state between trips.

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/bookings/services/booking-flow.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { BookingFlowService } from './booking-flow.service';

describe('BookingFlowService', () => {
  let service: BookingFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BookingFlowService] });
    service = TestBed.inject(BookingFlowService);
  });

  describe('per_seat mode', () => {
    beforeEach(() => service.init('per_seat'));

    it('should start at step 1', () => {
      expect(service.currentStep()).toBe(1);
    });

    it('should have steps [1,2,3,4]', () => {
      expect(service.steps()).toEqual([1, 2, 3, 4]);
    });

    it('should advance 1→2→3→4 with nextStep', () => {
      service.nextStep(); expect(service.currentStep()).toBe(2);
      service.nextStep(); expect(service.currentStep()).toBe(3);
      service.nextStep(); expect(service.currentStep()).toBe(4);
      service.nextStep(); expect(service.currentStep()).toBe(4); // clamped
    });

    it('should go back 2→1 with prevStep', () => {
      service.nextStep();
      service.prevStep();
      expect(service.currentStep()).toBe(1);
    });

    it('step 2 canProceed=false when no seats selected', () => {
      service.nextStep(); // step 2
      expect(service.canProceed()).toBe(false);
    });

    it('step 2 canProceed=true when seats selected', () => {
      service.nextStep();
      service.setSelectedSeats(['s1']);
      expect(service.canProceed()).toBe(true);
    });
  });

  describe('whole_car mode', () => {
    beforeEach(() => service.init('whole_car'));

    it('should have steps [1,3,4]', () => {
      expect(service.steps()).toEqual([1, 3, 4]);
    });

    it('should advance 1→3→4 skipping step 2', () => {
      service.nextStep(); expect(service.currentStep()).toBe(3);
      service.nextStep(); expect(service.currentStep()).toBe(4);
    });
  });

  it('step 3 canProceed validates all passenger fields', () => {
    service.init('whole_car');
    service.nextStep(); // step 3
    expect(service.canProceed()).toBe(false);
    service.setPassengers([{ fullName: 'أحمد محمد', nationality: 'Saudi', idNumber: '1234567890' }]);
    expect(service.canProceed()).toBe(true);
  });

  it('step 4 canProceed=true only when payment selected', () => {
    service.init('whole_car');
    service.nextStep(); service.nextStep(); // step 4
    expect(service.canProceed()).toBe(false);
    service.setPaymentMethod('cash');
    expect(service.canProceed()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-flow|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement BookingFlowService**

```typescript
// src/app/features/rider/bookings/services/booking-flow.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { BookingMode } from '../../trips/models/trip.model';
import { PassengerForm, PaymentMethod } from '../models/booking.model';

export type BookingStep = 1 | 2 | 3 | 4;

@Injectable()  // NOT providedIn: 'root' — provided in TripDetailComponent
export class BookingFlowService {
  private _mode           = signal<BookingMode>('per_seat');
  private _currentStep    = signal<BookingStep>(1);
  private _selectedSeatIds = signal<string[]>([]);
  private _passengers     = signal<PassengerForm[]>([]);
  private _paymentMethod  = signal<PaymentMethod | null>(null);

  readonly bookingMode     = this._mode.asReadonly();
  readonly currentStep     = this._currentStep.asReadonly();
  readonly selectedSeatIds = this._selectedSeatIds.asReadonly();
  readonly passengers      = this._passengers.asReadonly();
  readonly paymentMethod   = this._paymentMethod.asReadonly();

  readonly steps = computed<BookingStep[]>(() =>
    this._mode() === 'per_seat' ? [1, 2, 3, 4] : [1, 3, 4]
  );

  init(mode: BookingMode): void {
    this._mode.set(mode);
    this._currentStep.set(1);
    this._selectedSeatIds.set([]);
    this._passengers.set([]);
    this._paymentMethod.set(null);
  }

  nextStep(): void {
    const steps = this.steps();
    const idx = steps.indexOf(this._currentStep());
    if (idx < steps.length - 1) this._currentStep.set(steps[idx + 1]);
  }

  prevStep(): void {
    const steps = this.steps();
    const idx = steps.indexOf(this._currentStep());
    if (idx > 0) this._currentStep.set(steps[idx - 1]);
  }

  setSelectedSeats(ids: string[]): void  { this._selectedSeatIds.set(ids); }
  setPassengers(p: PassengerForm[]): void { this._passengers.set(p); }
  setPaymentMethod(m: PaymentMethod): void { this._paymentMethod.set(m); }

  canProceed(): boolean {
    const step = this._currentStep();
    if (step === 1) return true;
    if (step === 2) return this._selectedSeatIds().length > 0;
    if (step === 3) return this._passengers().length > 0 && this._passengers().every(
      p => p.fullName.trim().length >= 2 && p.nationality.trim().length >= 2 && p.idNumber.trim().length >= 5
    );
    if (step === 4) return this._paymentMethod() !== null;
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-flow|FAIL|PASS" | head -10`
Expected: all BookingFlowService tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/bookings/services/booking-flow.service.ts src/app/features/rider/bookings/services/booking-flow.service.spec.ts
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add BookingFlowService (scoped stepper state)"
```

---

## Task 8: Profile Layer (Models + Repository + Service)

**Files:**
- Create: `src/app/features/rider/profile/models/rider-profile.model.ts`
- Create: `src/app/features/rider/profile/data/profile.repository.ts`
- Create: `src/app/features/rider/profile/data/profile.repository.spec.ts`
- Create: `src/app/features/rider/profile/services/profile.service.ts`
- Create: `src/app/features/rider/profile/services/profile.service.spec.ts`

**Note on backend:** `PATCH /api/v1/users/me` does not exist in the backend yet. The profile page reads from `AuthService.currentUser()` (no HTTP call needed). The `updateName()` call will fail with a 404 until the backend endpoint is added. The UI will show a toast error in that case. This is acceptable for Phase 2 — the read path works fully.

- [ ] **Step 1: Create rider-profile model**

```typescript
// src/app/features/rider/profile/models/rider-profile.model.ts
export interface RiderProfile {
  id:          string;
  fullName:    string;
  email:       string;
  phone:       string;
  nationality: string;
  idNumber:    string;
}
```

- [ ] **Step 2: Write failing test for ProfileRepository**

```typescript
// src/app/features/rider/profile/data/profile.repository.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProfileRepository } from './profile.repository';

describe('ProfileRepository', () => {
  let repo: ProfileRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProfileRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(ProfileRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should PATCH /users/me with fullName', async () => {
    const promise = repo.updateName('علي محمد').toPromise();
    const req = http.expectOne(r => r.url.includes('/users/me') && r.method === 'PATCH');
    expect(req.request.body).toEqual({ fullName: 'علي محمد' });
    req.flush({ id: 'u1', fullName: 'علي محمد', email: 'a@b.com', phone: '050', nationality: 'Saudi', idNumber: '123' });
    const result = await promise;
    expect(result!.fullName).toBe('علي محمد');
  });
});
```

- [ ] **Step 3: Implement ProfileRepository**

```typescript
// src/app/features/rider/profile/data/profile.repository.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { RiderProfile } from '../models/rider-profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileRepository {
  private api = inject(ApiService);

  updateName(fullName: string): Observable<RiderProfile> {
    return this.api.patch<RiderProfile>('/users/me', { fullName });
  }
}
```

- [ ] **Step 4: Run repository test**

Run: `npx ng test --watch=false 2>&1 | grep -E "profile.repository|FAIL|PASS" | head -5`
Expected: PASS

- [ ] **Step 5: Write failing test for ProfileService**

```typescript
// src/app/features/rider/profile/services/profile.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfileService } from './profile.service';
import { ProfileRepository } from '../data/profile.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RiderProfile } from '../models/rider-profile.model';

const mockProfile: RiderProfile = {
  id: 'u1', fullName: 'أحمد محمد', email: 'a@b.com',
  phone: '0501234567', nationality: 'Saudi', idNumber: '1234567890',
};

describe('ProfileService', () => {
  let service: ProfileService;
  let repo: { updateName: ReturnType<typeof vi.fn> };
  let auth: { currentUser: ReturnType<typeof vi.fn>; updateFullName: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = { updateName: vi.fn().mockReturnValue(of(mockProfile)) };
    auth = { currentUser: vi.fn().mockReturnValue(null), updateFullName: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: ProfileRepository, useValue: repo },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(ProfileService);
  });

  it('should call updateFullName on AuthService after successful save', () => {
    service.updateName('علي');
    expect(repo.updateName).toHaveBeenCalledWith('علي');
    expect(auth.updateFullName).toHaveBeenCalledWith('علي');
    expect(toast.success).toHaveBeenCalled();
    expect(service.saving()).toBe(false);
  });

  it('should toast error and keep saving=false on failure', () => {
    repo.updateName.mockReturnValue(throwError(() => new Error('net')));
    service.updateName('علي');
    expect(service.saving()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Implement ProfileService**

```typescript
// src/app/features/rider/profile/services/profile.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { ProfileRepository } from '../data/profile.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private repo  = inject(ProfileRepository);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  private _saving = signal(false);

  readonly saving  = this._saving.asReadonly();
  readonly profile = this.auth.currentUser; // Signal<User | null>

  updateName(fullName: string): void {
    this._saving.set(true);
    this.repo.updateName(fullName).subscribe({
      next: () => {
        this.auth.updateFullName(fullName);
        this._saving.set(false);
        this.toast.success('تم تحديث الاسم بنجاح');
      },
      error: () => {
        this._saving.set(false);
        this.toast.error('فشل تحديث الاسم');
      },
    });
  }
}
```

- [ ] **Step 7: Run all profile tests**

Run: `npx ng test --watch=false 2>&1 | grep -E "profile|FAIL|PASS" | head -10`
Expected: all profile tests PASS

- [ ] **Step 8: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/profile/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add profile layer (models, repository, service)"
```

---

## Task 9: Update Routes and App Config

**Files:**
- Modify: `src/app/features/rider/rider.routes.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Add ConfirmationService to app.config.ts**

In `src/app/app.config.ts`, add `ConfirmationService` import and provider:

```typescript
// Add import at top:
import { ConfirmationService, MessageService } from 'primeng/api';

// In providers array, add ConfirmationService after MessageService:
providers: [
  // ...existing providers...
  MessageService,
  ConfirmationService,   // ← add this
],
```

- [ ] **Step 2: Replace rider.routes.ts**

```typescript
// src/app/features/rider/rider.routes.ts
import { Routes } from '@angular/router';

export const RIDER_ROUTES: Routes = [
  {
    path: 'trips',
    loadComponent: () =>
      import('./trips/components/trip-search/trip-search.component').then(m => m.TripSearchComponent),
  },
  {
    path: 'trips/:id',
    loadComponent: () =>
      import('./trips/components/trip-detail/trip-detail.component').then(m => m.TripDetailComponent),
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import('./bookings/components/booking-list/booking-list.component').then(m => m.BookingListComponent),
  },
  {
    path: 'bookings/:id',
    loadComponent: () =>
      import('./bookings/components/booking-detail/booking-detail.component').then(m => m.BookingDetailComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/components/profile/profile.component').then(m => m.ProfileComponent),
  },
  { path: 'home', redirectTo: 'trips', pathMatch: 'full' },
  { path: '', redirectTo: 'trips', pathMatch: 'full' },
];
```

Note: `trip-results` is NOT a separate route — it renders inside `trip-search` when query params are present. The search form and results live on `/rider/trips`.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`
Expected: errors only for missing component files (expected at this stage — they don't exist yet)

- [ ] **Step 4: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/rider.routes.ts src/app/app.config.ts
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): update routes to real components, add ConfirmationService"
```

---

## Task 10: Trip Search + Results Component

This single component handles both the search form (always visible) and the results list (shown after a search). The URL `/rider/trips` shows the form; adding query params triggers a search on init.

**Files:**
- Create: `src/app/features/rider/trips/components/trip-search/trip-search.component.ts`
- Create: `src/app/features/rider/trips/components/trip-search/trip-search.component.html`
- Create: `src/app/features/rider/trips/components/trip-search/trip-search.component.scss`
- Create: `src/app/features/rider/trips/components/trip-search/trip-search.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/components/trip-search/trip-search.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TripSearchComponent } from './trip-search.component';
import { TripService } from '../../services/trip.service';

const mockTripService = {
  destinations:  signal([]),
  searchResults: signal([]),
  loading:       signal(false),
  loadDestinations: vi.fn(),
  searchTrips:   vi.fn(),
};

describe('TripSearchComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripSearchComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: TripService, useValue: mockTripService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TripSearchComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call loadDestinations on init', () => {
    TestBed.createComponent(TripSearchComponent);
    expect(mockTripService.loadDestinations).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip-search|TripSearch|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Create TripSearchComponent TypeScript**

```typescript
// src/app/features/rider/trips/components/trip-search/trip-search.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TripService } from '../../services/trip.service';
import { AppLoadingComponent, AppEmptyStateComponent, AppCardComponent, TripCardComponent } from '../../../../../shared/index';
import type { TripCardData } from '../../../../../shared/index';
import type { TripSummary, BookingMode, CarType } from '../../models/trip.model';

@Component({
  selector: 'app-trip-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    AppLoadingComponent,
    AppEmptyStateComponent,
    AppCardComponent,
    TripCardComponent,
  ],
  templateUrl: './trip-search.component.html',
  styleUrl: './trip-search.component.scss',
})
export class TripSearchComponent implements OnInit {
  protected tripService = inject(TripService);
  private fb    = inject(FormBuilder);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  readonly today = new Date();

  readonly bookingModeOptions = [
    { label: 'الكل', value: '' },
    { label: 'مقاعد فردية', value: 'per_seat' },
    { label: 'سيارة كاملة', value: 'whole_car' },
  ];

  readonly carTypeOptions = [
    { label: 'الكل', value: '' },
    { label: 'سيدان', value: 'sedan' },
    { label: 'عائلي', value: 'family' },
    { label: 'VIP', value: 'vip' },
    { label: 'ليموزين', value: 'limousine' },
    { label: 'ميني باص', value: 'minibus' },
    { label: 'باص', value: 'bus' },
  ];

  form = this.fb.group({
    originId:      ['', Validators.required],
    destinationId: ['', Validators.required],
    departureDate: [null as Date | null, Validators.required],
    bookingMode:   [''],
    carType:       [''],
  });

  searched = false;

  ngOnInit(): void {
    this.tripService.loadDestinations();
    this.route.queryParams.subscribe(params => {
      if (params['originId'] && params['destinationId'] && params['departureDate']) {
        // Find destination objects to pre-select (needed for p-select bound to full object)
        this.form.patchValue({
          originId:     params['originId'],
          destinationId: params['destinationId'],
          departureDate: new Date(params['departureDate']),
          bookingMode:  params['bookingMode'] ?? '',
          carType:      params['carType'] ?? '',
        });
        this.runSearch();
      }
    });
  }

  onSearch(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const date = v.departureDate ? this.formatDate(v.departureDate) : '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        originId: v.originId,
        destinationId: v.destinationId,
        departureDate: date,
        ...(v.bookingMode ? { bookingMode: v.bookingMode } : {}),
        ...(v.carType ? { carType: v.carType } : {}),
      },
      queryParamsHandling: 'merge',
    });
    this.runSearch();
  }

  goToTrip(tripId: string): void {
    this.router.navigate(['/rider/trips', tripId]);
  }

  toTripCardData(trip: TripSummary): TripCardData {
    return {
      id: trip.id,
      originName: trip.origin.nameAr,
      destinationName: trip.destination.nameAr,
      departureTime: trip.departureAt,
      availableSeats: trip.availableSeats ?? 0,
      totalSeats: trip.availableSeats ?? 0,
      price: trip.pricePerSeat ?? trip.priceWholeCar ?? 0,
      status: trip.status,
      driverName: trip.driverName,
      carType: trip.carType,
    };
  }

  private runSearch(): void {
    const v = this.form.getRawValue();
    const date = v.departureDate ? this.formatDate(v.departureDate) : '';
    this.searched = true;
    this.tripService.searchTrips({
      originId: v.originId!,
      destinationId: v.destinationId!,
      departureDate: date,
      ...(v.bookingMode ? { bookingMode: v.bookingMode as BookingMode } : {}),
      ...(v.carType ? { carType: v.carType as CarType } : {}),
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
```

- [ ] **Step 4: Create HTML template**

```html
<!-- src/app/features/rider/trips/components/trip-search/trip-search.component.html -->
<div class="search-page">
  <app-card styleClass="search-card">
    <form [formGroup]="form" (ngSubmit)="onSearch()">
      <div class="search-fields">
        <div class="field">
          <label>من</label>
          <p-select
            formControlName="originId"
            [options]="tripService.destinations()"
            optionValue="id"
            optionLabel="nameAr"
            placeholder="نقطة الانطلاق"
            [fluid]="true" />
        </div>
        <div class="field">
          <label>إلى</label>
          <p-select
            formControlName="destinationId"
            [options]="tripService.destinations()"
            optionValue="id"
            optionLabel="nameAr"
            placeholder="الوجهة"
            [fluid]="true" />
        </div>
        <div class="field">
          <label>تاريخ السفر</label>
          <p-datepicker
            formControlName="departureDate"
            [minDate]="today"
            dateFormat="yy-mm-dd"
            [fluid]="true"
            placeholder="اختر التاريخ" />
        </div>
      </div>

      <div class="filter-fields">
        <div class="field">
          <label>نوع الحجز</label>
          <p-select
            formControlName="bookingMode"
            [options]="bookingModeOptions"
            optionValue="value"
            optionLabel="label"
            [fluid]="true" />
        </div>
        <div class="field">
          <label>نوع السيارة</label>
          <p-select
            formControlName="carType"
            [options]="carTypeOptions"
            optionValue="value"
            optionLabel="label"
            [fluid]="true" />
        </div>
      </div>

      <p-button
        type="submit"
        label="بحث عن رحلة"
        icon="pi pi-search"
        [loading]="tripService.loading()"
        [disabled]="form.invalid"
        [fluid]="true"
        styleClass="mt-4" />
    </form>
  </app-card>

  @if (tripService.loading()) {
    <app-loading message="جاري البحث عن الرحلات..." />
  } @else if (searched) {
    @if (tripService.searchResults().length === 0) {
      <app-empty-state
        icon="pi pi-car"
        title="لا توجد رحلات"
        message="لم نجد رحلات متاحة للمسار والتاريخ المحدد" />
    } @else {
      <div class="results-list">
        @for (trip of tripService.searchResults(); track trip.id) {
          <app-trip-card
            [trip]="toTripCardData(trip)"
            [showDetails]="true"
            (detailsClicked)="goToTrip($event)" />
        }
      </div>
    }
  }
</div>
```

- [ ] **Step 5: Create SCSS**

```scss
// src/app/features/rider/trips/components/trip-search/trip-search.component.scss
.search-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-fields,
.filter-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.filter-fields {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--govsa-primary);
  }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip-search|TripSearch|FAIL|PASS" | head -10`
Expected: both TripSearchComponent tests PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/components/trip-search/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add TripSearchComponent with inline results"
```

---

## Task 11: Seat Map Component

A sub-component used inside Trip Detail step 2. Renders a grid of seats; booked seats are gray and non-clickable.

**Files:**
- Create: `src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.ts`
- Create: `src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.scss`
- Create: `src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SeatMapComponent } from './seat-map.component';
import { SeatInfo } from '../../../models/trip.model';

const seats: SeatInfo[] = [
  { id: 's1', seatCode: 'A1', position: 'front', isBooked: false },
  { id: 's2', seatCode: 'A2', position: 'front', isBooked: true },
];

describe('SeatMapComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatMapComponent, NoopAnimationsModule],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SeatMapComponent);
    fixture.componentRef.setInput('seats', seats);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit selectionChange when an available seat is toggled', () => {
    const fixture = TestBed.createComponent(SeatMapComponent);
    fixture.componentRef.setInput('seats', seats);
    const emitted: string[][] = [];
    fixture.componentInstance.selectionChange.subscribe((v: string[]) => emitted.push(v));
    fixture.componentInstance.toggleSeat(seats[0]);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toContain('s1');
  });

  it('should NOT emit for a booked seat', () => {
    const fixture = TestBed.createComponent(SeatMapComponent);
    fixture.componentRef.setInput('seats', seats);
    const emitted: string[][] = [];
    fixture.componentInstance.selectionChange.subscribe((v: string[]) => emitted.push(v));
    fixture.componentInstance.toggleSeat(seats[1]); // booked
    expect(emitted).toHaveLength(0);
  });

  it('should deselect a seat if toggled twice', () => {
    const fixture = TestBed.createComponent(SeatMapComponent);
    fixture.componentRef.setInput('seats', seats);
    fixture.componentInstance.toggleSeat(seats[0]);
    fixture.componentInstance.toggleSeat(seats[0]);
    expect(fixture.componentInstance.selectedIds().length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "seat-map|SeatMap|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement SeatMapComponent**

```typescript
// src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.ts
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeatInfo } from '../../../models/trip.model';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seat-map">
      <div class="seat-legend">
        <span class="legend-item"><span class="seat-sample available"></span> متاح</span>
        <span class="legend-item"><span class="seat-sample selected"></span> محدد</span>
        <span class="legend-item"><span class="seat-sample booked"></span> محجوز</span>
      </div>
      <div class="seats-grid">
        @for (seat of seats; track seat.id) {
          <button
            type="button"
            class="seat"
            [class.booked]="seat.isBooked"
            [class.selected]="isSelected(seat.id)"
            [disabled]="seat.isBooked"
            (click)="toggleSeat(seat)"
            [attr.aria-label]="'مقعد ' + seat.seatCode">
            {{ seat.seatCode }}
          </button>
        }
      </div>
      <p class="selection-info">
        {{ selectedIds().length === 0 ? 'لم تختر مقاعد بعد' : 'المقاعد المختارة: ' + selectedIds().length }}
      </p>
    </div>
  `,
  styleUrl: './seat-map.component.scss',
})
export class SeatMapComponent {
  @Input({ required: true }) seats: SeatInfo[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  readonly selectedIds = signal<string[]>([]);

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSeat(seat: SeatInfo): void {
    if (seat.isBooked) return;
    const current = this.selectedIds();
    const next = current.includes(seat.id)
      ? current.filter(id => id !== seat.id)
      : [...current, seat.id];
    this.selectedIds.set(next);
    this.selectionChange.emit(next);
  }
}
```

- [ ] **Step 4: Create SCSS**

```scss
// src/app/features/rider/trips/components/trip-detail/seat-map/seat-map.component.scss
.seat-map {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.seat-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .seat-sample {
    display: inline-block;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 2px solid transparent;

    &.available { background: var(--p-surface-100); border-color: var(--p-surface-300); }
    &.selected  { background: var(--govsa-secondary, #C8A951); border-color: var(--govsa-secondary, #C8A951); }
    &.booked    { background: var(--p-surface-200); opacity: 0.5; }
  }
}

.seats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.75rem;
  max-width: 400px;
}

.seat {
  height: 60px;
  border-radius: 8px;
  border: 2px solid var(--p-surface-300);
  background: var(--p-surface-100);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--govsa-primary, #1B3A6B);
    background: var(--p-surface-50);
  }

  &.selected {
    background: var(--govsa-secondary, #C8A951);
    border-color: var(--govsa-secondary, #C8A951);
    color: #fff;
  }

  &.booked {
    background: var(--p-surface-200);
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.selection-info {
  font-size: 0.875rem;
  color: var(--p-surface-500);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "seat-map|SeatMap|FAIL|PASS" | head -10`
Expected: all 4 SeatMapComponent tests PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/components/trip-detail/seat-map/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add SeatMapComponent"
```

---

## Task 12: Passenger Form Component

Sub-component for step 3. Renders one form row per passenger (pre-fills slot 0 from the auth user profile).

**Files:**
- Create: `src/app/features/rider/trips/components/trip-detail/passenger-form/passenger-form.component.ts`
- Create: `src/app/features/rider/trips/components/trip-detail/passenger-form/passenger-form.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/components/trip-detail/passenger-form/passenger-form.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PassengerFormComponent } from './passenger-form.component';
import { AuthService } from '../../../../../../core/auth/auth.service';

const mockUser = { id: 'u1', fullName: 'أحمد محمد', email: 'a@b.com', idNumber: '1234567890', role: 'rider' as const, status: 'active' as const };

describe('PassengerFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerFormComponent, NoopAnimationsModule],
      providers: [
        MessageService,
        { provide: AuthService, useValue: { currentUser: signal(mockUser) } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PassengerFormComponent);
    fixture.componentRef.setInput('count', 2);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should pre-fill slot 0 from auth user', () => {
    const fixture = TestBed.createComponent(PassengerFormComponent);
    fixture.componentRef.setInput('count', 1);
    const passengers = fixture.componentInstance.getPassengers();
    expect(passengers[0].fullName).toBe('أحمد محمد');
    expect(passengers[0].idNumber).toBe('1234567890');
  });

  it('should emit formChange when valid', () => {
    const fixture = TestBed.createComponent(PassengerFormComponent);
    fixture.componentRef.setInput('count', 1);
    const emitted: any[] = [];
    fixture.componentInstance.formChange.subscribe((v: any) => emitted.push(v));
    fixture.componentInstance.getPassengers(); // trigger init
    fixture.componentInstance.updatePassenger(0, 'fullName', 'علي محمد');
    expect(emitted.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "passenger-form|PassengerForm|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement PassengerFormComponent**

```typescript
// src/app/features/rider/trips/components/trip-detail/passenger-form/passenger-form.component.ts
import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { PassengerForm } from '../../../../../bookings/models/booking.model';

@Component({
  selector: 'app-passenger-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule],
  template: `
    <div class="passenger-form">
      @for (group of passengerGroups.controls; track $index) {
        <div class="passenger-row" [formGroup]="getGroupAt($index)">
          <h4 class="passenger-title">الراكب {{ $index + 1 }}</h4>
          <div class="passenger-fields">
            <div class="field">
              <label>الاسم الكامل</label>
              <input pInputText formControlName="fullName" placeholder="الاسم الكامل" />
            </div>
            <div class="field">
              <label>الجنسية</label>
              <input pInputText formControlName="nationality" placeholder="السعودية" />
            </div>
            <div class="field">
              <label>رقم الهوية / الإقامة</label>
              <input pInputText formControlName="idNumber" placeholder="رقم الهوية" />
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .passenger-row { border: 1px solid var(--p-surface-200); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .passenger-title { font-size: 0.875rem; font-weight: 700; color: var(--govsa-primary); margin-bottom: 0.75rem; }
    .passenger-fields { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
    @media (min-width: 640px) { .passenger-fields { grid-template-columns: repeat(3, 1fr); } }
    .field { display: flex; flex-direction: column; gap: 0.375rem; }
    .field label { font-size: 0.75rem; font-weight: 600; color: var(--p-surface-600); }
  `],
})
export class PassengerFormComponent implements OnInit {
  @Input({ required: true }) count = 1;
  @Output() formChange = new EventEmitter<PassengerForm[]>();

  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  passengerGroups = this.fb.array<any>([]);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    for (let i = 0; i < this.count; i++) {
      const prefill = i === 0 && user
        ? { fullName: user.fullName, nationality: user.nationality ?? '', idNumber: user.idNumber ?? '' }
        : { fullName: '', nationality: '', idNumber: '' };
      this.passengerGroups.push(this.fb.group({
        fullName:    [prefill.fullName, [Validators.required, Validators.minLength(2)]],
        nationality: [prefill.nationality, [Validators.required, Validators.minLength(2)]],
        idNumber:    [prefill.idNumber, [Validators.required, Validators.minLength(5)]],
      }));
    }
    this.passengerGroups.valueChanges.subscribe(() => this.emit());
    this.emit();
  }

  getGroupAt(i: number) {
    return this.passengerGroups.at(i) as any;
  }

  getPassengers(): PassengerForm[] {
    return this.passengerGroups.value as PassengerForm[];
  }

  updatePassenger(index: number, field: keyof PassengerForm, value: string): void {
    this.passengerGroups.at(index).patchValue({ [field]: value });
  }

  private emit(): void {
    this.formChange.emit(this.passengerGroups.value as PassengerForm[]);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "passenger-form|PassengerForm|FAIL|PASS" | head -10`
Expected: all 3 PassengerFormComponent tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/components/trip-detail/passenger-form/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add PassengerFormComponent with profile pre-fill"
```

---

## Task 13: Trip Detail Component (Booking Stepper)

The main booking experience. Loads the trip, provides `BookingFlowService`, and renders a 4-step (or 3-step for `whole_car`) stepper inline.

**Files:**
- Create: `src/app/features/rider/trips/components/trip-detail/trip-detail.component.ts`
- Create: `src/app/features/rider/trips/components/trip-detail/trip-detail.component.html`
- Create: `src/app/features/rider/trips/components/trip-detail/trip-detail.component.scss`
- Create: `src/app/features/rider/trips/components/trip-detail/trip-detail.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/trips/components/trip-detail/trip-detail.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TripDetailComponent } from './trip-detail.component';
import { TripService } from '../../services/trip.service';
import { BookingService } from '../../../../bookings/services/booking.service';
import { AuthService } from '../../../../../../core/auth/auth.service';

const mockTrip = {
  id: 't1', origin: { id: 'd1', nameAr: 'الرياض', nameEn: 'Riyadh' },
  destination: { id: 'd2', nameAr: 'جدة', nameEn: 'Jeddah' },
  departureAt: '2026-05-01T08:00:00Z', bookingMode: 'per_seat' as const,
  carType: 'sedan' as const, pricePerSeat: 50, priceWholeCar: null,
  availableSeats: 3, status: 'scheduled' as const, driverName: 'خالد',
  seats: [], carBrand: 'Toyota', carModel: 'Camry', vehiclePlate: 'ABC',
};

describe('TripDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: TripService, useValue: { selectedTrip: signal(mockTrip), loading: signal(false), loadTrip: vi.fn() } },
        { provide: BookingService, useValue: { createBooking: vi.fn().mockReturnValue(of({})) } },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'u1', fullName: 'أحمد', role: 'rider', status: 'active', email: 'a@b.com' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 't1' } } } },
      ],
    }).compileComponents();
  });

  it('should create and call loadTrip', () => {
    const fixture = TestBed.createComponent(TripDetailComponent);
    const svc = TestBed.inject(TripService) as any;
    expect(fixture.componentInstance).toBeTruthy();
    expect(svc.loadTrip).toHaveBeenCalledWith('t1');
  });

  it('should start at step 1', () => {
    const fixture = TestBed.createComponent(TripDetailComponent);
    expect(fixture.componentInstance.flow.currentStep()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip-detail|TripDetail|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement TripDetailComponent TypeScript**

```typescript
// src/app/features/rider/trips/components/trip-detail/trip-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../services/trip.service';
import { BookingService } from '../../../../bookings/services/booking.service';
import { BookingFlowService } from '../../../../bookings/services/booking-flow.service';
import { SeatMapComponent } from './seat-map/seat-map.component';
import { PassengerFormComponent } from './passenger-form/passenger-form.component';
import { AppLoadingComponent, AppCardComponent, ArabicDatePipe, CurrencySarPipe } from '../../../../../shared/index';
import { PaymentMethod, PassengerForm } from '../../../../bookings/models/booking.model';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RadioButtonModule,
    AppLoadingComponent,
    AppCardComponent,
    ArabicDatePipe,
    CurrencySarPipe,
    SeatMapComponent,
    PassengerFormComponent,
  ],
  providers: [BookingFlowService],
  templateUrl: './trip-detail.component.html',
  styleUrl: './trip-detail.component.scss',
})
export class TripDetailComponent implements OnInit {
  protected tripService    = inject(TripService);
  protected bookingService = inject(BookingService);
  readonly flow            = inject(BookingFlowService);
  private router           = inject(Router);
  private route            = inject(ActivatedRoute);

  confirming = false;

  readonly paymentOptions: { label: string; value: PaymentMethod }[] = [
    { label: 'نقداً', value: 'cash' },
    { label: 'بطاقة ائتمان', value: 'card' },
    { label: 'مدى', value: 'mada' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tripService.loadTrip(id);
    // Init flow once trip loads (watch selectedTrip signal)
    const trip = this.tripService.selectedTrip();
    if (trip) this.flow.init(trip.bookingMode);
    // If trip loads asynchronously, init in template via effect — see onTripLoaded()
  }

  onTripLoaded(): void {
    const trip = this.tripService.selectedTrip();
    if (trip) this.flow.init(trip.bookingMode);
  }

  onSeatsSelected(ids: string[]): void {
    this.flow.setSelectedSeats(ids);
  }

  onPassengersChanged(passengers: PassengerForm[]): void {
    this.flow.setPassengers(passengers);
  }

  selectPayment(method: PaymentMethod): void {
    this.flow.setPaymentMethod(method);
  }

  confirmBooking(): void {
    const trip = this.tripService.selectedTrip();
    if (!trip || !this.flow.canProceed()) return;

    this.confirming = true;
    const dto = {
      tripId: trip.id,
      ...(this.flow.bookingMode() === 'per_seat' ? { seatIds: this.flow.selectedSeatIds() } : {}),
      passengers: this.flow.passengers(),
      paymentMethod: this.flow.paymentMethod()!,
    };

    this.bookingService.createBooking(dto).subscribe({
      next: () => {
        this.confirming = false;
        this.router.navigate(['/rider/bookings']);
      },
      error: (err: HttpErrorResponse) => {
        this.confirming = false;
        // toast is handled by AuthInterceptor for auth errors; show generic for others
      },
    });
  }

  getStepLabel(step: number): string {
    const labels: Record<number, string> = {
      1: 'ملخص الرحلة',
      2: 'اختيار المقاعد',
      3: 'بيانات الركاب',
      4: 'الدفع والتأكيد',
    };
    return labels[step] ?? '';
  }

  passengerCount(): number {
    return this.flow.bookingMode() === 'per_seat'
      ? this.flow.selectedSeatIds().length || 1
      : 1;
  }
}
```

- [ ] **Step 4: Create HTML template**

```html
<!-- src/app/features/rider/trips/components/trip-detail/trip-detail.component.html -->
@if (tripService.loading()) {
  <app-loading message="جاري تحميل بيانات الرحلة..." />
} @else if (tripService.selectedTrip(); as trip) {

  <!-- Step indicator -->
  <div class="step-indicator">
    @for (step of flow.steps(); track step) {
      <div class="step-dot"
           [class.active]="flow.currentStep() === step"
           [class.done]="step < flow.currentStep()">
        <span class="dot-number">{{ step }}</span>
        <span class="dot-label">{{ getStepLabel(step) }}</span>
      </div>
      @if (!$last) { <div class="step-line"></div> }
    }
  </div>

  <!-- Step 1: Trip Summary -->
  @if (flow.currentStep() === 1) {
    <app-card>
      <h2 class="trip-route">{{ trip.origin.nameAr }} ← {{ trip.destination.nameAr }}</h2>
      <div class="trip-meta">
        <div class="meta-row">
          <i class="pi pi-calendar"></i>
          <span>{{ trip.departureAt | arabicDate:'full' }}</span>
        </div>
        <div class="meta-row">
          <i class="pi pi-car"></i>
          <span>{{ trip.carType }} — {{ trip.carBrand }} {{ trip.carModel }}</span>
        </div>
        <div class="meta-row">
          <i class="pi pi-id-card"></i>
          <span>{{ trip.vehiclePlate }}</span>
        </div>
        <div class="meta-row">
          <i class="pi pi-user"></i>
          <span>السائق: {{ trip.driverName }}</span>
        </div>
        @if (trip.bookingMode === 'per_seat') {
          <div class="meta-row">
            <i class="pi pi-ticket"></i>
            <span>{{ trip.availableSeats }} مقاعد متاحة</span>
          </div>
          <div class="trip-price">{{ trip.pricePerSeat | currencySar }} / مقعد</div>
        } @else {
          <div class="trip-price">{{ trip.priceWholeCar | currencySar }} للسيارة</div>
        }
      </div>
      <p-button label="اختيار هذه الرحلة" icon="pi pi-check" [fluid]="true" (click)="flow.nextStep(); onTripLoaded()" />
    </app-card>
  }

  <!-- Step 2: Seat Map (per_seat only) -->
  @if (flow.currentStep() === 2) {
    <app-card>
      <h3 class="step-title">اختر مقاعدك</h3>
      <app-seat-map [seats]="trip.seats" (selectionChange)="onSeatsSelected($event)" />
      <div class="step-actions">
        <p-button label="رجوع" icon="pi pi-arrow-right" [text]="true" (click)="flow.prevStep()" />
        <p-button label="التالي" icon="pi pi-arrow-left" iconPos="right"
          [disabled]="!flow.canProceed()" (click)="flow.nextStep()" />
      </div>
    </app-card>
  }

  <!-- Step 3: Passenger Details -->
  @if (flow.currentStep() === 3) {
    <app-card>
      <h3 class="step-title">بيانات الركاب</h3>
      <app-passenger-form
        [count]="passengerCount()"
        (formChange)="onPassengersChanged($event)" />
      <div class="step-actions">
        <p-button label="رجوع" icon="pi pi-arrow-right" [text]="true" (click)="flow.prevStep()" />
        <p-button label="التالي" icon="pi pi-arrow-left" iconPos="right"
          [disabled]="!flow.canProceed()" (click)="flow.nextStep()" />
      </div>
    </app-card>
  }

  <!-- Step 4: Payment & Confirm -->
  @if (flow.currentStep() === 4) {
    <app-card>
      <h3 class="step-title">اختر طريقة الدفع</h3>
      <div class="payment-options">
        @for (opt of paymentOptions; track opt.value) {
          <label class="payment-option" [class.selected]="flow.paymentMethod() === opt.value">
            <p-radiobutton
              [value]="opt.value"
              [ngModel]="flow.paymentMethod()"
              (ngModelChange)="selectPayment($event)"
              name="payment" />
            <span>{{ opt.label }}</span>
          </label>
        }
      </div>

      <div class="booking-summary">
        <h4>ملخص الحجز</h4>
        <div class="summary-row">
          <span>المسار</span>
          <span>{{ trip.origin.nameAr }} ← {{ trip.destination.nameAr }}</span>
        </div>
        <div class="summary-row">
          <span>التاريخ</span>
          <span>{{ trip.departureAt | arabicDate:'short' }}</span>
        </div>
        @if (trip.bookingMode === 'per_seat') {
          <div class="summary-row">
            <span>عدد المقاعد</span>
            <span>{{ flow.selectedSeatIds().length }}</span>
          </div>
          <div class="summary-row total">
            <span>الإجمالي</span>
            <span>{{ (trip.pricePerSeat! * flow.selectedSeatIds().length) | currencySar }}</span>
          </div>
        } @else {
          <div class="summary-row total">
            <span>الإجمالي</span>
            <span>{{ trip.priceWholeCar | currencySar }}</span>
          </div>
        }
      </div>

      <div class="step-actions">
        <p-button label="رجوع" icon="pi pi-arrow-right" [text]="true" (click)="flow.prevStep()" />
        <p-button
          label="تأكيد الحجز"
          icon="pi pi-check"
          iconPos="right"
          [loading]="confirming"
          [disabled]="!flow.canProceed()"
          (click)="confirmBooking()" />
      </div>
    </app-card>
  }

} @else {
  <app-loading message="جاري التحميل..." />
}
```

- [ ] **Step 5: Create SCSS**

```scss
// src/app/features/rider/trips/components/trip-detail/trip-detail.component.scss
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding: 0.5rem;
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 70px;

  .dot-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--p-surface-200);
    color: var(--p-surface-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .dot-label {
    font-size: 0.7rem;
    color: var(--p-surface-500);
    white-space: nowrap;
  }

  &.active .dot-number {
    background: var(--govsa-primary, #1B3A6B);
    color: #fff;
  }

  &.done .dot-number {
    background: #4caf50;
    color: #fff;
  }
}

.step-line {
  height: 2px;
  flex: 1;
  background: var(--p-surface-200);
  margin: 0 0.25rem;
  margin-bottom: 1.5rem;
  min-width: 20px;
}

.trip-route {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin-bottom: 1.5rem;
}

.trip-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;

  i { color: var(--govsa-secondary, #C8A951); }
}

.trip-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin: 1rem 0;
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin-bottom: 1.5rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 1rem;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid var(--p-surface-200);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
  font-size: 0.9rem;

  &.selected {
    border-color: var(--govsa-primary, #1B3A6B);
    background: var(--p-surface-50);
  }
}

.booking-summary {
  background: var(--p-surface-50);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;

  h4 { font-weight: 700; margin-bottom: 1rem; color: var(--govsa-primary); }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-surface-200);
  font-size: 0.875rem;

  &.total {
    font-weight: 700;
    font-size: 1rem;
    border-bottom: none;
    color: var(--govsa-primary);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "trip-detail|TripDetail|FAIL|PASS" | head -10`
Expected: both TripDetailComponent tests PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/trips/components/trip-detail/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add TripDetailComponent with 4-step booking stepper"
```

---

## Task 14: Booking List Component

**Files:**
- Create: `src/app/features/rider/bookings/components/booking-list/booking-list.component.ts`
- Create: `src/app/features/rider/bookings/components/booking-list/booking-list.component.html`
- Create: `src/app/features/rider/bookings/components/booking-list/booking-list.component.scss`
- Create: `src/app/features/rider/bookings/components/booking-list/booking-list.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/bookings/components/booking-list/booking-list.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BookingListComponent } from './booking-list.component';
import { BookingService } from '../../services/booking.service';

const mockBookingService = {
  myBookings: signal([]),
  loading:    signal(false),
  loadMyBookings: vi.fn(),
};

describe('BookingListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: BookingService, useValue: mockBookingService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BookingListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call loadMyBookings on init', () => {
    TestBed.createComponent(BookingListComponent);
    expect(mockBookingService.loadMyBookings).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-list|BookingList|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement BookingListComponent**

```typescript
// src/app/features/rider/bookings/components/booking-list/booking-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { AppLoadingComponent, AppEmptyStateComponent, BookingCardComponent } from '../../../../../shared/index';
import type { BookingCardData } from '../../../../../shared/index';
import type { BookingSummary } from '../../models/booking.model';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, AppLoadingComponent, AppEmptyStateComponent, BookingCardComponent],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.scss',
})
export class BookingListComponent implements OnInit {
  protected bookingService = inject(BookingService);
  private router = inject(Router);

  ngOnInit(): void {
    this.bookingService.loadMyBookings();
  }

  goToBooking(id: string): void {
    this.router.navigate(['/rider/bookings', id]);
  }

  toCardData(b: BookingSummary): BookingCardData {
    return {
      id: b.id,
      originName: b.originNameAr,
      destinationName: b.destinationNameAr,
      departureTime: b.departureAt,
      totalPrice: b.totalPrice,
      status: b.status,
      paymentStatus: b.paymentStatus,
      seatsCount: b.seatCount ?? 1,
    };
  }
}
```

- [ ] **Step 4: Create HTML template**

```html
<!-- src/app/features/rider/bookings/components/booking-list/booking-list.component.html -->
<div class="bookings-page">
  <h2 class="page-title">حجوزاتي</h2>

  @if (bookingService.loading()) {
    <app-loading message="جاري تحميل الحجوزات..." />
  } @else if (bookingService.myBookings().length === 0) {
    <app-empty-state
      icon="pi pi-ticket"
      title="لا توجد حجوزات"
      message="لم تقم بأي حجز بعد. ابحث عن رحلة وابدأ!" />
  } @else {
    <div class="bookings-list">
      @for (booking of bookingService.myBookings(); track booking.id) {
        <app-booking-card
          [booking]="toCardData(booking)"
          (detailsClicked)="goToBooking($event)" />
      }
    </div>
  }
</div>
```

- [ ] **Step 5: Create SCSS**

```scss
// src/app/features/rider/bookings/components/booking-list/booking-list.component.scss
.bookings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--govsa-primary);
}

.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-list|BookingList|FAIL|PASS" | head -10`
Expected: both BookingListComponent tests PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/bookings/components/booking-list/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add BookingListComponent"
```

---

## Task 15: Booking Detail Component

**Files:**
- Create: `src/app/features/rider/bookings/components/booking-detail/booking-detail.component.ts`
- Create: `src/app/features/rider/bookings/components/booking-detail/booking-detail.component.html`
- Create: `src/app/features/rider/bookings/components/booking-detail/booking-detail.component.scss`
- Create: `src/app/features/rider/bookings/components/booking-detail/booking-detail.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/bookings/components/booking-detail/booking-detail.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BookingDetailComponent } from './booking-detail.component';
import { BookingService } from '../../services/booking.service';

const mockBooking = {
  id: 'b1', originNameAr: 'الرياض', destinationNameAr: 'جدة',
  departureAt: '2026-05-01T08:00:00Z', totalPrice: 50,
  status: 'confirmed' as const, paymentStatus: 'pending' as const,
  seatCount: 1, bookingMode: 'per_seat' as const, paymentMethod: 'cash' as const,
  passengers: [{ fullName: 'أحمد', nationality: 'Saudi', idNumber: '123' }],
  seatCodes: ['A1'], driverName: 'خالد', driverPhone: '050', vehiclePlate: 'ABC',
  cancellationReason: null, createdAt: '2026-05-01T10:00:00Z', tripId: 't1',
};

describe('BookingDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        {
          provide: BookingService,
          useValue: {
            selectedBooking: signal(mockBooking),
            loading: signal(false),
            loadBooking: vi.fn(),
            cancelBooking: vi.fn().mockReturnValue(of(mockBooking)),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b1' } } } },
      ],
    }).compileComponents();
  });

  it('should create and call loadBooking', () => {
    const fixture = TestBed.createComponent(BookingDetailComponent);
    const svc = TestBed.inject(BookingService) as any;
    expect(fixture.componentInstance).toBeTruthy();
    expect(svc.loadBooking).toHaveBeenCalledWith('b1');
  });

  it('should show cancel button for confirmed booking', () => {
    const fixture = TestBed.createComponent(BookingDetailComponent);
    expect(fixture.componentInstance.canCancel()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-detail|BookingDetail|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement BookingDetailComponent**

```typescript
// src/app/features/rider/bookings/components/booking-detail/booking-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { BookingService } from '../../services/booking.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { AppLoadingComponent, AppCardComponent, ArabicDatePipe, CurrencySarPipe } from '../../../../../shared/index';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ConfirmDialogModule,
    AppLoadingComponent,
    AppCardComponent,
    ArabicDatePipe,
    CurrencySarPipe,
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss',
})
export class BookingDetailComponent implements OnInit {
  protected bookingService  = inject(BookingService);
  private router             = inject(Router);
  private route              = inject(ActivatedRoute);
  private confirm            = inject(ConfirmationService);
  private toast              = inject(ToastService);

  cancelling = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingService.loadBooking(id);
  }

  canCancel(): boolean {
    const b = this.bookingService.selectedBooking();
    return !!b && b.status !== 'cancelled';
  }

  requestCancel(): void {
    this.confirm.confirm({
      message: 'هل أنت متأكد من إلغاء هذا الحجز؟',
      header: 'تأكيد الإلغاء',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم، إلغاء الحجز',
      rejectLabel: 'لا',
      accept: () => this.doCancel(),
    });
  }

  private doCancel(): void {
    const b = this.bookingService.selectedBooking();
    if (!b) return;
    this.cancelling = true;
    this.bookingService.cancelBooking(b.id).subscribe({
      next: () => {
        this.cancelling = false;
        this.toast.success('تم إلغاء الحجز بنجاح');
        this.router.navigate(['/rider/bookings']);
      },
      error: () => {
        this.cancelling = false;
        this.toast.error('فشل إلغاء الحجز');
      },
    });
  }

  paymentMethodLabel(method: string): string {
    const labels: Record<string, string> = { cash: 'نقداً', card: 'بطاقة ائتمان', mada: 'مدى' };
    return labels[method] ?? method;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { pending: 'قيد الانتظار', confirmed: 'مؤكد', cancelled: 'ملغى' };
    return labels[status] ?? status;
  }
}
```

- [ ] **Step 4: Create HTML template**

```html
<!-- src/app/features/rider/bookings/components/booking-detail/booking-detail.component.html -->
<p-confirmdialog />

@if (bookingService.loading()) {
  <app-loading message="جاري تحميل الحجز..." />
} @else if (bookingService.selectedBooking(); as booking) {
  <div class="detail-page">

    <div class="detail-header">
      <h2 class="route">{{ booking.originNameAr }} ← {{ booking.destinationNameAr }}</h2>
      <span class="status-label" [attr.data-status]="booking.status">
        {{ statusLabel(booking.status) }}
      </span>
    </div>

    <app-card>
      <h3 class="section-title">تفاصيل الرحلة</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">تاريخ السفر</span>
          <span>{{ booking.departureAt | arabicDate:'full' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">السائق</span>
          <span>{{ booking.driverName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">رقم اللوحة</span>
          <span>{{ booking.vehiclePlate }}</span>
        </div>
        @if (booking.seatCodes.length > 0) {
          <div class="info-row">
            <span class="info-label">المقاعد</span>
            <span>{{ booking.seatCodes.join('، ') }}</span>
          </div>
        }
      </div>
    </app-card>

    <app-card>
      <h3 class="section-title">الركاب</h3>
      @for (p of booking.passengers; track $index) {
        <div class="passenger-row">
          <div><strong>{{ p.fullName }}</strong></div>
          <div class="passenger-meta">{{ p.nationality }} · {{ p.idNumber }}</div>
        </div>
      }
    </app-card>

    <app-card>
      <h3 class="section-title">الدفع</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">طريقة الدفع</span>
          <span>{{ paymentMethodLabel(booking.paymentMethod) }}</span>
        </div>
        <div class="info-row total">
          <span class="info-label">الإجمالي</span>
          <span>{{ booking.totalPrice | currencySar }}</span>
        </div>
      </div>
    </app-card>

    @if (canCancel()) {
      <p-button
        label="إلغاء الحجز"
        icon="pi pi-times"
        severity="danger"
        [outlined]="true"
        [loading]="cancelling"
        [fluid]="true"
        (click)="requestCancel()" />
    }

  </div>
}
```

- [ ] **Step 5: Create SCSS**

```scss
// src/app/features/rider/bookings/components/booking-detail/booking-detail.component.scss
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.route {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--govsa-primary);
}

.status-label {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;

  &[data-status="confirmed"]  { background: #e8f5e9; color: #2e7d32; }
  &[data-status="pending"]    { background: #fff3e0; color: #e65100; }
  &[data-status="cancelled"]  { background: #fce4ec; color: #c62828; }
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin-bottom: 1rem;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-surface-100);
  font-size: 0.875rem;

  &.total {
    font-weight: 700;
    font-size: 1rem;
    border-bottom: none;
    color: var(--govsa-primary);
  }
}

.info-label { color: var(--p-surface-500); }

.passenger-row {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-surface-100);

  &:last-child { border-bottom: none; }
}

.passenger-meta {
  font-size: 0.8rem;
  color: var(--p-surface-400);
  margin-top: 0.25rem;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "booking-detail|BookingDetail|FAIL|PASS" | head -10`
Expected: both BookingDetailComponent tests PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/bookings/components/booking-detail/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add BookingDetailComponent with cancel flow"
```

---

## Task 16: Rider Profile Component

**Files:**
- Create: `src/app/features/rider/profile/components/profile/profile.component.ts`
- Create: `src/app/features/rider/profile/components/profile/profile.component.html`
- Create: `src/app/features/rider/profile/components/profile/profile.component.scss`
- Create: `src/app/features/rider/profile/components/profile/profile.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/rider/profile/components/profile/profile.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ProfileComponent } from './profile.component';
import { ProfileService } from '../../services/profile.service';

const mockUser = {
  id: 'u1', fullName: 'أحمد محمد', email: 'ahmed@test.com',
  phone: '0501234567', nationality: 'Saudi', idNumber: '1234567890',
  role: 'rider' as const, status: 'active' as const,
};

describe('ProfileComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, NoopAnimationsModule],
      providers: [
        MessageService,
        {
          provide: ProfileService,
          useValue: {
            profile: signal(mockUser),
            saving: signal(false),
            updateName: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize nameInput from profile fullName', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    expect(fixture.componentInstance.nameInput).toBe('أحمد محمد');
  });

  it('should call profileService.updateName on save', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    const svc = TestBed.inject(ProfileService) as any;
    fixture.componentInstance.nameInput = 'علي محمد';
    fixture.componentInstance.saveName();
    expect(svc.updateName).toHaveBeenCalledWith('علي محمد');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | grep -E "profile.component|ProfileComponent|FAIL" | head -5`
Expected: FAIL

- [ ] **Step 3: Implement ProfileComponent**

```typescript
// src/app/features/rider/profile/components/profile/profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProfileService } from '../../services/profile.service';
import { AppCardComponent } from '../../../../../shared/index';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, AppCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  protected profileService = inject(ProfileService);

  nameInput = '';

  ngOnInit(): void {
    const user = this.profileService.profile();
    if (user) this.nameInput = user.fullName;
  }

  saveName(): void {
    if (this.nameInput.trim().length < 2) return;
    this.profileService.updateName(this.nameInput.trim());
  }
}
```

- [ ] **Step 4: Create HTML template**

```html
<!-- src/app/features/rider/profile/components/profile/profile.component.html -->
@if (profileService.profile(); as user) {
  <div class="profile-page">
    <h2 class="page-title">الملف الشخصي</h2>

    <app-card>
      <div class="avatar-section">
        <div class="avatar">
          <i class="pi pi-user"></i>
        </div>
        <div>
          <div class="user-name">{{ user.fullName }}</div>
          <div class="user-role">راكب</div>
        </div>
      </div>
    </app-card>

    <app-card>
      <h3 class="section-title">تعديل الاسم</h3>
      <div class="field">
        <label>الاسم الكامل</label>
        <input pInputText [(ngModel)]="nameInput" placeholder="أدخل اسمك الكامل" />
      </div>
      <p-button
        label="حفظ الاسم"
        icon="pi pi-check"
        [loading]="profileService.saving()"
        [disabled]="nameInput.trim().length < 2"
        (click)="saveName()"
        styleClass="mt-3" />
    </app-card>

    <app-card>
      <h3 class="section-title">بيانات الحساب</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">رقم الجوال</span>
          <span>{{ user.phone }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">رقم الهوية / الإقامة</span>
          <span>{{ user.idNumber ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">البريد الإلكتروني</span>
          <span>{{ user.email }}</span>
        </div>
      </div>
      <p class="contact-note">
        <i class="pi pi-info-circle"></i>
        لتغيير رقم الجوال أو رقم الهوية، تواصل معنا
      </p>
    </app-card>
  </div>
}
```

- [ ] **Step 5: Create SCSS**

```scss
// src/app/features/rider/profile/components/profile/profile.component.scss
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--govsa-primary);
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--govsa-primary, #1B3A6B);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.user-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--govsa-primary);
}

.user-role {
  font-size: 0.8rem;
  color: var(--p-surface-500);
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin-bottom: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label { font-size: 0.875rem; font-weight: 600; color: var(--p-surface-600); }
  input { width: 100%; }
}

.info-grid {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-surface-100);
  font-size: 0.875rem;

  &:last-child { border-bottom: none; }
}

.info-label { color: var(--p-surface-500); }

.contact-note {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--p-surface-400);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  i { color: var(--govsa-secondary, #C8A951); }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | grep -E "profile.component|ProfileComponent|FAIL|PASS" | head -10`
Expected: all 3 ProfileComponent tests PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/krim/Documents/transport-frontend add src/app/features/rider/profile/
git -C /Users/krim/Documents/transport-frontend commit -m "feat(rider): add ProfileComponent"
```

---

## Task 17: Full Test Suite + Build Verification

**Files:**
- No new files — run existing tests + build

- [ ] **Step 1: Run full test suite**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: all tests PASS, no failures. If any test fails, read the error and fix it before proceeding.

Common issues to watch for:
- Missing `ConfirmationService` in a test's providers → add `ConfirmationService` to that test's providers
- `ngModel` on `p-radiobutton` needs `FormsModule` in imports → verify `FormsModule` is in the component's imports
- `CurrencySarPipe` not handling `null` → verify the pipe handles null/undefined input gracefully

- [ ] **Step 2: Production build**

Run: `npx ng build 2>&1 | tail -20`
Expected: Build successful with no errors.

Common build issues:
- Type errors from `any` casts in repositories → these are expected and acceptable
- Missing imports in component `imports[]` → add the missing PrimeNG module

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git -C /Users/krim/Documents/transport-frontend add -A
git -C /Users/krim/Documents/transport-frontend commit -m "fix(rider): resolve test and build issues from Phase 2"
```

If no fixes were needed, skip this step.

- [ ] **Step 4: Verify dev server renders correctly**

Run in a separate terminal: `cd /Users/krim/Documents/transport-frontend && npx ng serve`

Navigate to:
- `http://localhost:4200/rider/trips` — should show trip search form
- `http://localhost:4200/rider/bookings` — should show my bookings (empty state)
- `http://localhost:4200/rider/profile` — should show profile page

(Login first at `/login` if redirected by the rider guard)
