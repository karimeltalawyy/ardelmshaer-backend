# Phase 3 — Driver Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full driver-facing experience: home dashboard, assigned trips with passenger manifest + COD payment, document upload, and driver profile.

**Architecture:** Signal-based clean architecture (models → repository → service → component), mirroring Phase 2's rider layer. `DriverTripService` is shared between Home and Trip screens. Document upload uses multipart via a new `ApiService.postFile()` helper. All mutable component state uses `signal()` — required for zoneless change detection.

**Tech Stack:** Angular 21 (standalone, zoneless, signals, `inject()`), PrimeNG 21, GOV.SA CSS variables (`--govsa-primary: #1B3A6B`, `--govsa-secondary: #C8A951`), Vitest (`npx ng test --watch=false`), NestJS backend at `http://localhost:3000/api/v1`

---

## Codebase Context

**Frontend working directory:** `/Users/krim/Documents/transport-frontend`  
**Backend working directory:** `/Users/krim/Documents/transport-platform`

**Key existing files:**
- `src/app/core/services/api.service.ts` — `ApiService` with `.get<T>()`, `.post<T>()`, `.patch<T>()`, `.delete<T>()`. Task 4 adds `.postFile<T>()`.
- `src/app/core/services/toast.service.ts` — `ToastService` with `.success()`, `.error()`.
- `src/app/core/auth/auth.service.ts` — `AuthService` with `clearSession()` method.
- `src/app/shared/index.ts` — re-exports `AppLoadingComponent`, `AppEmptyStateComponent`, `AppCardComponent`, `AppPageHeaderComponent`, `ArabicDatePipe`, `CurrencySarPipe`.
- `src/app/layout/driver-shell/driver-shell.component.ts` — driver nav shell with 4 tabs. Task 6 updates it.
- `src/app/features/driver/driver.routes.ts` — placeholder routes. Task 6 replaces them.

**Angular patterns (REQUIRED — do not deviate):**
- `@Injectable({ providedIn: 'root' })` on every repository and service
- `inject()` for all dependencies — never constructor injection
- `signal()` for ALL mutable state (plain booleans are invisible to zoneless CD)
- `asReadonly()` for all public signals on services
- Constructor init — call `loadXxx()` in constructor, NOT in `ngOnInit`
- `takeUntilDestroyed(this.destroyRef)` on all HTTP subscriptions in components
- `@if` / `@for` control flow — no `NgIf`, no `NgFor`, no `CommonModule`

**Test runner:** `npx ng test --watch=false` — Vitest globals are enabled, `vi`, `describe`, `it`, `expect`, `beforeEach` are global (no import needed).

**Backend enum values:**
- `TripStatus`: `scheduled` | `in_progress` | `completed` | `cancelled`
- `BookingMode`: `per_seat` | `whole_car`
- `PaymentStatus`: `pending` | `paid` | `refunded`
- `DriverApprovalStatus`: `pending` | `approved` | `rejected`
- `DocumentType`: `national_id` | `license` | `car_registration` | `car_photo`
- `DocumentStatus`: `pending` | `approved` | `rejected`

**Backend response shapes (what repositories must map FROM):**

`GET /trips/my` and `GET /trips/:id` (TRIP_INCLUDE shape):
```
raw.id, raw.departureAt (ISO string), raw.status (TripStatus), raw.bookingMode,
raw.totalSeats (number|null), raw.availableSeats (number|null),
raw.route.estimatedDurationMin (number),
raw.route.origin.{ nameAr, nameEn },
raw.route.destination.{ nameAr, nameEn },
raw.car.{ brand, model, plateNumber, carType }

GET /trips/:id additionally:
raw.bookings[].{
  id, paymentStatus, totalPrice (Decimal string), bookingMode,
  passengers[].{ fullName, nationality, idNumber },       ← after backend fix
  bookingSeats[].{
    carSeat.{ seatCode },                                  ← after backend fix
    passenger.{ fullName, nationality, idNumber }          ← after backend fix
  }
}
```

`GET /drivers/me`:
```
raw.id, raw.licenseNumber, raw.approvalStatus (DriverApprovalStatus), raw.rejectionReason (string|null),
raw.user.{ fullName, email, phone, idNumber },      ← idNumber after backend fix
raw.cars[].{ id, carType, brand, model, year, plateNumber, totalSeats },  ← after backend fix
raw.documents[].{ id, docType, fileUrl, status, uploadedAt }
```

`PATCH /payments/bookings/:bookingId/collect` — body: `{}` (note optional), response: payment object

---

## File Map

**Backend changes (Task 1):**
```
transport-platform/src/modules/trips/trips.service.ts   — extend findOne query
transport-platform/src/modules/drivers/drivers.service.ts — extend getMyProfile query
```

**Frontend new files:**
```
src/app/core/services/api.service.ts                   — add postFile() method (Task 4)

src/app/features/driver/
  home/components/home/
    home.component.ts + html + scss + spec.ts           (Task 7)

  trips/
    models/driver-trip.model.ts                         (Task 2)
    data/driver-trip.repository.ts + spec.ts            (Task 2)
    services/driver-trip.service.ts + spec.ts           (Task 3)
    components/
      trip-list/trip-list.component.ts + html + scss + spec.ts   (Task 8)
      trip-detail/trip-detail.component.ts + html + scss + spec.ts  (Task 10)
      trip-detail/passenger-manifest/
        passenger-manifest.component.ts + html + scss + spec.ts  (Task 9)

  documents/
    models/driver-document.model.ts                     (Task 4)
    data/document.repository.ts + spec.ts               (Task 4)
    services/document.service.ts + spec.ts              (Task 4)
    components/documents/
      documents.component.ts + html + scss + spec.ts    (Task 11)

  profile/
    models/driver-profile.model.ts                      (Task 5)
    data/driver-profile.repository.ts + spec.ts         (Task 5)
    services/driver-profile.service.ts + spec.ts        (Task 5)
    components/profile/
      profile.component.ts + html + scss + spec.ts      (Task 12)
```

**Frontend modified files:**
```
src/app/layout/driver-shell/driver-shell.component.ts   (Task 6)
src/app/features/driver/driver.routes.ts                (Task 6)
```

---

## Task 1: Backend Prerequisite Changes

**Files:**
- Modify: `transport-platform/src/modules/trips/trips.service.ts`
- Modify: `transport-platform/src/modules/drivers/drivers.service.ts`

> These backend changes are required before the frontend passenger manifest and profile will work. No frontend tests needed here — just edit and save.

- [ ] **Step 1: Extend `findOne` in trips.service.ts**

In `transport-platform/src/modules/trips/trips.service.ts`, replace the `findOne` method (lines ~152–173):

```typescript
async findOne(tripId: string) {
  const trip = await this.prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      ...TRIP_INCLUDE,
      car: {
        include: {
          seats: { orderBy: { seatCode: 'asc' } },
        },
      },
      bookings: {
        where: { status: { not: 'cancelled' } },
        include: {
          passengers: true,
          bookingSeats: {
            include: {
              carSeat: { select: { seatCode: true } },
              passenger: { select: { fullName: true, nationality: true, idNumber: true } },
            },
          },
        },
      },
    },
  });

  if (!trip) throw new NotFoundException('Trip not found');
  return trip;
}
```

- [ ] **Step 2: Extend `getMyProfile` in drivers.service.ts**

In `transport-platform/src/modules/drivers/drivers.service.ts`, replace the `getMyProfile` method (lines ~46–54):

```typescript
async getMyProfile(userId: string) {
  const profile = await this.prisma.driverProfile.findUnique({
    where: { userId },
    include: {
      documents: true,
      cars: true,
      user: { select: { fullName: true, email: true, phone: true, idNumber: true } },
    },
  });

  if (!profile) throw new NotFoundException('Driver profile not found');
  return profile;
}
```

- [ ] **Step 3: Verify backend starts without TypeScript errors**

```bash
cd /Users/krim/Documents/transport-platform && npm run build 2>&1 | tail -20
```

Expected: build completes without errors (or existing errors only — no new ones).

- [ ] **Step 4: Commit**

```bash
cd /Users/krim/Documents/transport-frontend
git add -A
git commit -m "fix(backend): extend findOne and getMyProfile queries for driver Phase 3"
```

> Note: the backend directory is not a git repo, so commit from the frontend worktree if files are tracked there, otherwise skip the git step and just verify the build passes.

---

## Task 2: Driver Trip Models + DriverTripRepository

**Files:**
- Create: `src/app/features/driver/trips/models/driver-trip.model.ts`
- Create: `src/app/features/driver/trips/data/driver-trip.repository.ts`
- Create: `src/app/features/driver/trips/data/driver-trip.repository.spec.ts`

- [ ] **Step 1: Write the failing repository test**

Create `src/app/features/driver/trips/data/driver-trip.repository.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DriverTripRepository } from './driver-trip.repository';

describe('DriverTripRepository', () => {
  let repo: DriverTripRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DriverTripRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(DriverTripRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const rawSummary = {
    id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
    bookingMode: 'per_seat', totalSeats: 10, availableSeats: 7,
    route: {
      estimatedDurationMin: 120,
      origin: { nameAr: 'الرياض', nameEn: 'Riyadh' },
      destination: { nameAr: 'جدة', nameEn: 'Jeddah' },
    },
    car: { brand: 'Toyota', model: 'Camry', plateNumber: 'ABC123', carType: 'sedan' },
    driver: { user: { fullName: 'خالد', phone: '0501234567' } },
    season: null,
  };

  it('should map trip summaries from findMyTrips', async () => {
    const promise = repo.findMyTrips().toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/my'));
    req.flush([rawSummary]);
    const result = await promise;
    expect(result![0].id).toBe('t1');
    expect(result![0].route.origin.nameAr).toBe('الرياض');
    expect(result![0].bookingMode).toBe('per_seat');
    expect(result![0].totalSeats).toBe(10);
  });

  it('should map per_seat trip detail with passenger manifest', async () => {
    const rawDetail = {
      ...rawSummary,
      bookings: [{
        id: 'b1', paymentStatus: 'pending', totalPrice: '150.00', bookingMode: 'per_seat',
        passengers: [{ fullName: 'Ahmed', nationality: 'Saudi', idNumber: '1234' }],
        bookingSeats: [{
          carSeat: { seatCode: '3A' },
          passenger: { fullName: 'Ahmed', nationality: 'Saudi', idNumber: '1234' },
        }],
      }],
    };
    const promise = repo.findById('t1').toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/t1'));
    req.flush(rawDetail);
    const result = await promise;
    expect(result!.passengers).toHaveLength(1);
    expect(result!.passengers[0].seatCode).toBe('3A');
    expect(result!.passengers[0].passengerName).toBe('Ahmed');
    expect(result!.passengers[0].paymentStatus).toBe('pending');
    expect(result!.passengers[0].totalPrice).toBe(150);
  });

  it('should map whole_car booking to passengers with seat code dash', async () => {
    const rawDetail = {
      ...rawSummary,
      bookingMode: 'whole_car',
      bookings: [{
        id: 'b2', paymentStatus: 'pending', totalPrice: '800.00', bookingMode: 'whole_car',
        passengers: [
          { fullName: 'Khalid', nationality: 'Saudi', idNumber: '5678' },
          { fullName: 'Omar', nationality: 'Saudi', idNumber: '9012' },
        ],
        bookingSeats: [],
      }],
    };
    const promise = repo.findById('t1').toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/t1'));
    req.flush(rawDetail);
    const result = await promise;
    expect(result!.passengers).toHaveLength(2);
    expect(result!.passengers[0].seatCode).toBe('—');
    expect(result!.passengers[0].passengerName).toBe('Khalid');
  });

  it('should call PATCH /payments/bookings/:id/collect', async () => {
    const promise = repo.collectPayment('b1').toPromise();
    const req = http.expectOne(r => r.url.includes('/payments/bookings/b1/collect'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'p1', paymentStatus: 'paid' });
    await promise;
  });

  it('should call PATCH /trips/:id/status', async () => {
    const promise = repo.updateStatus('t1', 'in_progress').toPromise();
    const req = http.expectOne(r => r.url.includes('/trips/t1/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'in_progress' });
    req.flush({ id: 't1', status: 'in_progress' });
    await promise;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng test --watch=false 2>&1 | grep -A 5 "DriverTripRepository"
```

Expected: FAIL — `DriverTripRepository` not found.

- [ ] **Step 3: Create driver-trip.model.ts**

Create `src/app/features/driver/trips/models/driver-trip.model.ts`:

```typescript
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingMode = 'per_seat' | 'whole_car';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface DriverTripSummary {
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
}

export interface PassengerManifestEntry {
  bookingId: string;
  seatCode: string;
  passengerName: string;
  nationality: string;
  idNumber: string;
  paymentStatus: PaymentStatus;
  totalPrice: number;
}

export interface DriverTripDetail extends DriverTripSummary {
  car: {
    brand: string;
    model: string;
    plateNumber: string;
    carType: string;
  };
  passengers: PassengerManifestEntry[];
}
```

- [ ] **Step 4: Create driver-trip.repository.ts**

Create `src/app/features/driver/trips/data/driver-trip.repository.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import {
  DriverTripSummary, DriverTripDetail, PassengerManifestEntry, TripStatus,
} from '../models/driver-trip.model';

@Injectable({ providedIn: 'root' })
export class DriverTripRepository {
  private api = inject(ApiService);

  findMyTrips(): Observable<DriverTripSummary[]> {
    return this.api.get<any[]>('/trips/my').pipe(
      map(items => items.map(t => this.mapSummary(t)))
    );
  }

  findById(id: string): Observable<DriverTripDetail> {
    return this.api.get<any>(`/trips/${id}`).pipe(
      map(t => this.mapDetail(t))
    );
  }

  updateStatus(tripId: string, status: TripStatus): Observable<any> {
    return this.api.patch<any>(`/trips/${tripId}/status`, { status });
  }

  collectPayment(bookingId: string): Observable<any> {
    return this.api.patch<any>(`/payments/bookings/${bookingId}/collect`, {});
  }

  private mapSummary(raw: any): DriverTripSummary {
    return {
      id: raw.id,
      departureAt: raw.departureAt,
      status: raw.status,
      bookingMode: raw.bookingMode,
      totalSeats: raw.totalSeats ?? null,
      availableSeats: raw.availableSeats ?? null,
      route: {
        estimatedDurationMin: raw.route?.estimatedDurationMin ?? 0,
        origin: { nameAr: raw.route?.origin?.nameAr ?? '', nameEn: raw.route?.origin?.nameEn ?? '' },
        destination: { nameAr: raw.route?.destination?.nameAr ?? '', nameEn: raw.route?.destination?.nameEn ?? '' },
      },
    };
  }

  private mapDetail(raw: any): DriverTripDetail {
    return {
      ...this.mapSummary(raw),
      car: {
        brand: raw.car?.brand ?? '',
        model: raw.car?.model ?? '',
        plateNumber: raw.car?.plateNumber ?? '',
        carType: raw.car?.carType ?? '',
      },
      passengers: this.mapPassengers(raw.bookings ?? []),
    };
  }

  private mapPassengers(bookings: any[]): PassengerManifestEntry[] {
    const entries: PassengerManifestEntry[] = [];
    for (const booking of bookings) {
      if ((booking.bookingSeats ?? []).length === 0) {
        // whole_car booking — one row per passenger, no seat code
        for (const p of booking.passengers ?? []) {
          entries.push({
            bookingId: booking.id,
            seatCode: '—',
            passengerName: p.fullName ?? '',
            nationality: p.nationality ?? '',
            idNumber: p.idNumber ?? '',
            paymentStatus: booking.paymentStatus,
            totalPrice: Number(booking.totalPrice),
          });
        }
      } else {
        // per_seat booking — one row per booking seat
        for (const bs of booking.bookingSeats) {
          entries.push({
            bookingId: booking.id,
            seatCode: bs.carSeat?.seatCode ?? '',
            passengerName: bs.passenger?.fullName ?? '',
            nationality: bs.passenger?.nationality ?? '',
            idNumber: bs.passenger?.idNumber ?? '',
            paymentStatus: booking.paymentStatus,
            totalPrice: Number(booking.totalPrice),
          });
        }
      }
    }
    return entries;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverTripRepository)"
```

Expected: `DriverTripRepository` tests all passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/driver/trips/
git commit -m "feat(driver): add DriverTripRepository and trip models"
```

---

## Task 3: DriverTripService

**Files:**
- Create: `src/app/features/driver/trips/services/driver-trip.service.ts`
- Create: `src/app/features/driver/trips/services/driver-trip.service.spec.ts`

- [ ] **Step 1: Write the failing service test**

Create `src/app/features/driver/trips/services/driver-trip.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DriverTripService } from './driver-trip.service';
import { DriverTripRepository } from '../data/driver-trip.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverTripSummary, DriverTripDetail } from '../models/driver-trip.model';

const mockSummary: DriverTripSummary = {
  id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
  bookingMode: 'per_seat', totalSeats: 10, availableSeats: 7,
  route: {
    estimatedDurationMin: 120,
    origin: { nameAr: 'الرياض', nameEn: 'Riyadh' },
    destination: { nameAr: 'جدة', nameEn: 'Jeddah' },
  },
};

const mockDetail: DriverTripDetail = {
  ...mockSummary,
  car: { brand: 'Toyota', model: 'Camry', plateNumber: 'ABC', carType: 'sedan' },
  passengers: [{
    bookingId: 'b1', seatCode: '3A', passengerName: 'Ahmed',
    nationality: 'Saudi', idNumber: '1234', paymentStatus: 'pending', totalPrice: 150,
  }],
};

describe('DriverTripService', () => {
  let service: DriverTripService;
  let repo: any;
  let toast: any;

  beforeEach(() => {
    repo = {
      findMyTrips: vi.fn().mockReturnValue(of([mockSummary])),
      findById: vi.fn().mockReturnValue(of(mockDetail)),
      updateStatus: vi.fn().mockReturnValue(of({ status: 'in_progress' })),
      collectPayment: vi.fn().mockReturnValue(of({ paymentStatus: 'paid' })),
    };
    toast = { error: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DriverTripService,
        { provide: DriverTripRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(DriverTripService);
  });

  it('should load trips into signal', () => {
    service.loadMyTrips();
    expect(service.trips()).toHaveLength(1);
    expect(service.trips()[0].id).toBe('t1');
    expect(service.loading()).toBe(false);
  });

  it('should set loading false and toast on loadMyTrips error', () => {
    repo.findMyTrips.mockReturnValue(throwError(() => new Error('network')));
    service.loadMyTrips();
    expect(service.loading()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('should load trip detail into selectedTrip signal', () => {
    service.loadTrip('t1');
    expect(service.selectedTrip()?.id).toBe('t1');
    expect(service.selectedTrip()?.passengers).toHaveLength(1);
    expect(service.loading()).toBe(false);
  });

  it('should markPassengerPaid — updates paymentStatus in selectedTrip signal', () => {
    service.loadTrip('t1');
    service.markPassengerPaid('b1');
    expect(service.selectedTrip()!.passengers[0].paymentStatus).toBe('paid');
  });

  it('should return Observable from updateStatus', () => {
    let result: any;
    service.updateStatus('t1', 'in_progress').subscribe(r => result = r);
    expect(repo.updateStatus).toHaveBeenCalledWith('t1', 'in_progress');
  });

  it('should return Observable from collectPayment', () => {
    service.collectPayment('b1').subscribe();
    expect(repo.collectPayment).toHaveBeenCalledWith('b1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverTripService)"
```

Expected: FAIL — `DriverTripService` not found.

- [ ] **Step 3: Create driver-trip.service.ts**

Create `src/app/features/driver/trips/services/driver-trip.service.ts`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DriverTripRepository } from '../data/driver-trip.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverTripSummary, DriverTripDetail, TripStatus } from '../models/driver-trip.model';

@Injectable({ providedIn: 'root' })
export class DriverTripService {
  private repo  = inject(DriverTripRepository);
  private toast = inject(ToastService);

  private _trips        = signal<DriverTripSummary[]>([]);
  private _selectedTrip = signal<DriverTripDetail | null>(null);
  private _loading      = signal(false);

  readonly trips        = this._trips.asReadonly();
  readonly selectedTrip = this._selectedTrip.asReadonly();
  readonly loading      = this._loading.asReadonly();

  loadMyTrips(): void {
    this._loading.set(true);
    this.repo.findMyTrips().subscribe({
      next: list => { this._trips.set(list); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل الرحلات'); },
    });
  }

  loadTrip(id: string): void {
    this._loading.set(true);
    this._selectedTrip.set(null);
    this.repo.findById(id).subscribe({
      next: t => { this._selectedTrip.set(t); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل بيانات الرحلة'); },
    });
  }

  updateStatus(tripId: string, status: TripStatus): Observable<any> {
    return this.repo.updateStatus(tripId, status);
  }

  collectPayment(bookingId: string): Observable<any> {
    return this.repo.collectPayment(bookingId);
  }

  markPassengerPaid(bookingId: string): void {
    const trip = this._selectedTrip();
    if (!trip) return;
    this._selectedTrip.set({
      ...trip,
      passengers: trip.passengers.map(p =>
        p.bookingId === bookingId ? { ...p, paymentStatus: 'paid' } : p
      ),
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverTripService)"
```

Expected: all `DriverTripService` tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/driver/trips/services/
git commit -m "feat(driver): add DriverTripService with signals"
```

---

## Task 4: Document Layer (ApiService extension + models + repo + service)

**Files:**
- Modify: `src/app/core/services/api.service.ts`
- Create: `src/app/features/driver/documents/models/driver-document.model.ts`
- Create: `src/app/features/driver/documents/data/document.repository.ts`
- Create: `src/app/features/driver/documents/data/document.repository.spec.ts`
- Create: `src/app/features/driver/documents/services/document.service.ts`
- Create: `src/app/features/driver/documents/services/document.service.spec.ts`

- [ ] **Step 1: Add `postFile` to ApiService**

In `src/app/core/services/api.service.ts`, add after the `put<T>()` method:

```typescript
postFile<T>(path: string, formData: FormData): Observable<T> {
  return this.http.post<T>(`${this.base}${path}`, formData);
}
```

- [ ] **Step 2: Create driver-document.model.ts**

Create `src/app/features/driver/documents/models/driver-document.model.ts`:

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

export const DOCUMENT_LABELS: Record<DriverDocumentType, string> = {
  national_id: 'الهوية الوطنية',
  license: 'رخصة القيادة',
  car_registration: 'استمارة السيارة',
  car_photo: 'صورة السيارة',
};

export const ALL_DOC_TYPES: DriverDocumentType[] = [
  'national_id', 'license', 'car_registration', 'car_photo',
];
```

- [ ] **Step 3: Write the failing document repository test**

Create `src/app/features/driver/documents/data/document.repository.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DocumentRepository } from './document.repository';

describe('DocumentRepository', () => {
  let repo: DocumentRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DocumentRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(DocumentRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const rawProfile = {
    id: 'dp1', licenseNumber: 'LIC123', approvalStatus: 'pending', rejectionReason: null,
    user: { fullName: 'خالد', email: 'k@test.com', phone: '0501234567', idNumber: '1234567890' },
    cars: [],
    documents: [
      { id: 'd1', docType: 'national_id', fileUrl: 'http://s3/id.jpg', status: 'pending', uploadedAt: '2026-04-01T00:00:00Z' },
    ],
  };

  it('should load and map documents from GET /drivers/me', async () => {
    const promise = repo.loadDocuments().toPromise();
    const req = http.expectOne(r => r.url.includes('/drivers/me'));
    req.flush(rawProfile);
    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result![0].docType).toBe('national_id');
    expect(result![0].status).toBe('pending');
  });

  it('should POST multipart form to /drivers/documents', async () => {
    const file = new File(['data'], 'id.jpg', { type: 'image/jpeg' });
    const promise = repo.uploadDocument('national_id', file).toPromise();
    const req = http.expectOne(r => r.url.includes('/drivers/documents'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ id: 'd2', docType: 'national_id', fileUrl: 'http://s3/id2.jpg', status: 'pending', uploadedAt: '2026-04-04T00:00:00Z' });
    const result = await promise;
    expect(result!.docType).toBe('national_id');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DocumentRepository)"
```

Expected: FAIL.

- [ ] **Step 5: Create document.repository.ts**

Create `src/app/features/driver/documents/data/document.repository.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { DriverDocument, DriverDocumentType } from '../models/driver-document.model';

@Injectable({ providedIn: 'root' })
export class DocumentRepository {
  private api = inject(ApiService);

  loadDocuments(): Observable<DriverDocument[]> {
    return this.api.get<any>('/drivers/me').pipe(
      map(raw => (raw.documents ?? []).map((d: any) => this.mapDocument(d)))
    );
  }

  uploadDocument(docType: DriverDocumentType, file: File): Observable<DriverDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    return this.api.postFile<any>('/drivers/documents', formData).pipe(
      map(d => this.mapDocument(d))
    );
  }

  private mapDocument(d: any): DriverDocument {
    return {
      id: d.id,
      docType: d.docType,
      fileUrl: d.fileUrl,
      status: d.status,
      uploadedAt: d.uploadedAt,
    };
  }
}
```

- [ ] **Step 6: Write the failing document service test**

Create `src/app/features/driver/documents/services/document.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DocumentService } from './document.service';
import { DocumentRepository } from '../data/document.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverDocument } from '../models/driver-document.model';

const mockDoc: DriverDocument = {
  id: 'd1', docType: 'national_id', fileUrl: 'http://s3/id.jpg',
  status: 'pending', uploadedAt: '2026-04-01T00:00:00Z',
};

describe('DocumentService', () => {
  let service: DocumentService;
  let repo: any;
  let toast: any;

  beforeEach(() => {
    repo = {
      loadDocuments: vi.fn().mockReturnValue(of([mockDoc])),
      uploadDocument: vi.fn().mockReturnValue(of({ ...mockDoc, id: 'd2', status: 'pending' })),
    };
    toast = { error: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DocumentService,
        { provide: DocumentRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(DocumentService);
  });

  it('should load documents into signal', () => {
    service.loadDocuments();
    expect(service.documents()).toHaveLength(1);
    expect(service.documents()[0].docType).toBe('national_id');
  });

  it('should set loading false and toast on loadDocuments error', () => {
    repo.loadDocuments.mockReturnValue(throwError(() => new Error('err')));
    service.loadDocuments();
    expect(toast.error).toHaveBeenCalled();
  });

  it('should return Observable from uploadDocument', () => {
    const file = new File([''], 'id.jpg');
    let result: any;
    service.uploadDocument('national_id', file).subscribe(r => result = r);
    expect(repo.uploadDocument).toHaveBeenCalledWith('national_id', file);
  });
});
```

- [ ] **Step 7: Create document.service.ts**

Create `src/app/features/driver/documents/services/document.service.ts`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DocumentRepository } from '../data/document.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverDocument, DriverDocumentType } from '../models/driver-document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private repo  = inject(DocumentRepository);
  private toast = inject(ToastService);

  private _documents = signal<DriverDocument[]>([]);
  private _loading   = signal(false);

  readonly documents = this._documents.asReadonly();
  readonly loading   = this._loading.asReadonly();

  loadDocuments(): void {
    this._loading.set(true);
    this.repo.loadDocuments().subscribe({
      next: docs => { this._documents.set(docs); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل الوثائق'); },
    });
  }

  uploadDocument(docType: DriverDocumentType, file: File): Observable<DriverDocument> {
    return this.repo.uploadDocument(docType, file);
  }

  replaceDocument(updated: DriverDocument): void {
    this._documents.update(docs => {
      const idx = docs.findIndex(d => d.docType === updated.docType);
      if (idx === -1) return [...docs, updated];
      const next = [...docs];
      next[idx] = updated;
      return next;
    });
  }
}
```

- [ ] **Step 8: Run tests to verify all pass**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|Document)"
```

Expected: `DocumentRepository` and `DocumentService` tests passing.

- [ ] **Step 9: Commit**

```bash
git add src/app/core/services/api.service.ts src/app/features/driver/documents/
git commit -m "feat(driver): add document layer + ApiService.postFile"
```

---

## Task 5: Driver Profile Layer

**Files:**
- Create: `src/app/features/driver/profile/models/driver-profile.model.ts`
- Create: `src/app/features/driver/profile/data/driver-profile.repository.ts`
- Create: `src/app/features/driver/profile/data/driver-profile.repository.spec.ts`
- Create: `src/app/features/driver/profile/services/driver-profile.service.ts`
- Create: `src/app/features/driver/profile/services/driver-profile.service.spec.ts`

- [ ] **Step 1: Create driver-profile.model.ts**

Create `src/app/features/driver/profile/models/driver-profile.model.ts`:

```typescript
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
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  licenseNumber: string;
  approvalStatus: DriverApprovalStatus;
  rejectionReason: string | null;
  cars: CarInfo[];
}
```

- [ ] **Step 2: Write the failing repository test**

Create `src/app/features/driver/profile/data/driver-profile.repository.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DriverProfileRepository } from './driver-profile.repository';

describe('DriverProfileRepository', () => {
  let repo: DriverProfileRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DriverProfileRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(DriverProfileRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const rawProfile = {
    id: 'dp1', licenseNumber: 'LIC123', approvalStatus: 'approved', rejectionReason: null,
    user: { fullName: 'خالد', email: 'k@test.com', phone: '0501234567', idNumber: '1234567890' },
    cars: [{ id: 'c1', carType: 'sedan', brand: 'Toyota', model: 'Camry', year: 2022, plateNumber: 'ABC123', totalSeats: 4 }],
    documents: [],
  };

  it('should load and map driver profile', async () => {
    const promise = repo.loadProfile().toPromise();
    const req = http.expectOne(r => r.url.includes('/drivers/me'));
    req.flush(rawProfile);
    const result = await promise;
    expect(result!.fullName).toBe('خالد');
    expect(result!.idNumber).toBe('1234567890');
    expect(result!.approvalStatus).toBe('approved');
    expect(result!.cars).toHaveLength(1);
    expect(result!.cars[0].plateNumber).toBe('ABC123');
  });
});
```

- [ ] **Step 3: Create driver-profile.repository.ts**

Create `src/app/features/driver/profile/data/driver-profile.repository.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { DriverProfile, CarInfo } from '../models/driver-profile.model';

@Injectable({ providedIn: 'root' })
export class DriverProfileRepository {
  private api = inject(ApiService);

  loadProfile(): Observable<DriverProfile> {
    return this.api.get<any>('/drivers/me').pipe(
      map(raw => ({
        id: raw.id,
        fullName: raw.user?.fullName ?? '',
        email: raw.user?.email ?? '',
        phone: raw.user?.phone ?? '',
        idNumber: raw.user?.idNumber ?? '',
        licenseNumber: raw.licenseNumber ?? '',
        approvalStatus: raw.approvalStatus,
        rejectionReason: raw.rejectionReason ?? null,
        cars: (raw.cars ?? []).map((c: any): CarInfo => ({
          id: c.id,
          carType: c.carType,
          brand: c.brand,
          model: c.model,
          year: c.year,
          plateNumber: c.plateNumber,
          totalSeats: c.totalSeats,
        })),
      }))
    );
  }
}
```

- [ ] **Step 4: Write the failing service test**

Create `src/app/features/driver/profile/services/driver-profile.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DriverProfileService } from './driver-profile.service';
import { DriverProfileRepository } from '../data/driver-profile.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverProfile } from '../models/driver-profile.model';

const mockProfile: DriverProfile = {
  id: 'dp1', fullName: 'خالد', email: 'k@test.com', phone: '0501234567',
  idNumber: '1234567890', licenseNumber: 'LIC123',
  approvalStatus: 'approved', rejectionReason: null, cars: [],
};

describe('DriverProfileService', () => {
  let service: DriverProfileService;
  let repo: any;
  let toast: any;

  beforeEach(() => {
    repo = { loadProfile: vi.fn().mockReturnValue(of(mockProfile)) };
    toast = { error: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DriverProfileService,
        { provide: DriverProfileRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(DriverProfileService);
  });

  it('should load profile into signal', () => {
    service.loadProfile();
    expect(service.profile()?.fullName).toBe('خالد');
    expect(service.profile()?.approvalStatus).toBe('approved');
    expect(service.loading()).toBe(false);
  });

  it('should toast and reset loading on error', () => {
    repo.loadProfile.mockReturnValue(throwError(() => new Error('err')));
    service.loadProfile();
    expect(service.loading()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Create driver-profile.service.ts**

Create `src/app/features/driver/profile/services/driver-profile.service.ts`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { DriverProfileRepository } from '../data/driver-profile.repository';
import { ToastService } from '../../../../core/services/toast.service';
import { DriverProfile } from '../models/driver-profile.model';

@Injectable({ providedIn: 'root' })
export class DriverProfileService {
  private repo  = inject(DriverProfileRepository);
  private toast = inject(ToastService);

  private _profile = signal<DriverProfile | null>(null);
  private _loading = signal(false);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();

  loadProfile(): void {
    this._loading.set(true);
    this.repo.loadProfile().subscribe({
      next: p => { this._profile.set(p); this._loading.set(false); },
      error: () => { this._loading.set(false); this.toast.error('فشل تحميل الملف الشخصي'); },
    });
  }
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverProfile)"
```

Expected: `DriverProfileRepository` and `DriverProfileService` passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/profile/
git commit -m "feat(driver): add driver profile layer"
```

---

## Task 6: Update Shell + Routes

**Files:**
- Modify: `src/app/layout/driver-shell/driver-shell.component.ts`
- Modify: `src/app/features/driver/driver.routes.ts`

- [ ] **Step 1: Update driver-shell.component.ts**

Replace the full content of `src/app/layout/driver-shell/driver-shell.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-driver-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './driver-shell.component.html',
  styleUrl: './driver-shell.component.scss',
})
export class DriverShellComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'الرئيسية', icon: 'pi pi-home',  route: '/driver/home' },
    { label: 'رحلاتي',   icon: 'pi pi-car',   route: '/driver/trips' },
    { label: 'وثائقي',   icon: 'pi pi-file',  route: '/driver/documents' },
    { label: 'حسابي',    icon: 'pi pi-user',  route: '/driver/profile' },
  ];

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 2: Update driver.routes.ts**

Replace the full content of `src/app/features/driver/driver.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const DRIVER_ROUTES: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/components/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'trips',
    loadComponent: () =>
      import('./trips/components/trip-list/trip-list.component').then(m => m.TripListComponent),
  },
  {
    path: 'trips/:id',
    loadComponent: () =>
      import('./trips/components/trip-detail/trip-detail.component').then(m => m.TripDetailComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./documents/components/documents/documents.component').then(m => m.DocumentsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/components/profile/profile.component').then(m => m.DriverProfileComponent),
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
```

- [ ] **Step 3: Run tests to verify nothing is broken**

```bash
npx ng test --watch=false 2>&1 | tail -10
```

Expected: existing tests still passing (new routes will fail to compile until Tasks 7-12 are done — that's expected at this stage).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/driver-shell/driver-shell.component.ts src/app/features/driver/driver.routes.ts
git commit -m "feat(driver): update shell nav and routes for Phase 3"
```

---

## Task 7: HomeComponent

**Files:**
- Create: `src/app/features/driver/home/components/home/home.component.ts`
- Create: `src/app/features/driver/home/components/home/home.component.html`
- Create: `src/app/features/driver/home/components/home/home.component.scss`
- Create: `src/app/features/driver/home/components/home/home.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/driver/home/components/home/home.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { DriverTripService } from '../../../trips/services/driver-trip.service';
import { DriverProfileService } from '../../../profile/services/driver-profile.service';
import { DriverTripSummary } from '../../../trips/models/driver-trip.model';
import { DriverProfile } from '../../../profile/models/driver-profile.model';

const mockTrip: DriverTripSummary = {
  id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
  bookingMode: 'per_seat', totalSeats: 10, availableSeats: 7,
  route: {
    estimatedDurationMin: 120,
    origin: { nameAr: 'الرياض', nameEn: 'Riyadh' },
    destination: { nameAr: 'جدة', nameEn: 'Jeddah' },
  },
};

const mockProfile: DriverProfile = {
  id: 'dp1', fullName: 'خالد', email: 'k@test.com', phone: '0501234567',
  idNumber: '1234567890', licenseNumber: 'LIC123',
  approvalStatus: 'approved', rejectionReason: null, cars: [],
};

const mockTripService = {
  trips: signal<DriverTripSummary[]>([mockTrip]),
  loading: signal(false),
  loadMyTrips: vi.fn(),
};

const mockProfileService = {
  profile: signal<DriverProfile | null>(mockProfile),
  loading: signal(false),
  loadProfile: vi.fn(),
};

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: DriverTripService, useValue: mockTripService },
        { provide: DriverProfileService, useValue: mockProfileService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call loadMyTrips and loadProfile in constructor', () => {
    TestBed.createComponent(HomeComponent);
    expect(mockTripService.loadMyTrips).toHaveBeenCalled();
    expect(mockProfileService.loadProfile).toHaveBeenCalled();
  });

  it('should return the next scheduled trip', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.nextTrip()?.id).toBe('t1');
  });

  it('should show approval banner for pending profile', () => {
    mockProfileService.profile.set({ ...mockProfile, approvalStatus: 'pending' });
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.showApprovalBanner()).toBe(true);
    mockProfileService.profile.set(mockProfile);
  });

  it('should NOT show approval banner for approved profile', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.showApprovalBanner()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|HomeComponent)"
```

Expected: FAIL.

- [ ] **Step 3: Create home.component.ts**

Create `src/app/features/driver/home/components/home/home.component.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DriverTripService } from '../../../trips/services/driver-trip.service';
import { DriverProfileService } from '../../../profile/services/driver-profile.service';
import { AppLoadingComponent, AppEmptyStateComponent, ArabicDatePipe } from '../../../../../shared/index';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ButtonModule, AppLoadingComponent, AppEmptyStateComponent, ArabicDatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected tripService    = inject(DriverTripService);
  protected profileService = inject(DriverProfileService);

  readonly nextTrip = computed(() =>
    this.tripService.trips()
      .filter(t => t.status === 'scheduled')
      .sort((a, b) => new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime())[0] ?? null
  );

  readonly showApprovalBanner = computed(() => {
    const profile = this.profileService.profile();
    return !!profile && profile.approvalStatus !== 'approved';
  });

  readonly bannerRejected = computed(() =>
    this.profileService.profile()?.approvalStatus === 'rejected'
  );

  constructor() {
    this.tripService.loadMyTrips();
    this.profileService.loadProfile();
  }
}
```

- [ ] **Step 4: Create home.component.html**

Create `src/app/features/driver/home/components/home/home.component.html`:

```html
<div class="home-page">
  @if (showApprovalBanner()) {
    <div class="approval-banner" [class.rejected]="bannerRejected()">
      @if (bannerRejected()) {
        <i class="pi pi-times-circle"></i>
        <span>تم رفض طلبك — يرجى التواصل مع الإدارة</span>
      } @else {
        <i class="pi pi-clock"></i>
        <span>حسابك قيد المراجعة — يرجى رفع وثائقك المطلوبة</span>
        <a routerLink="/driver/documents" class="banner-link">رفع الوثائق</a>
      }
    </div>
  }

  <h2 class="section-title">رحلتك القادمة</h2>

  @if (tripService.loading()) {
    <app-loading />
  } @else if (!nextTrip()) {
    <app-empty-state message="لا توجد رحلات قادمة" />
  } @else {
    <a [routerLink]="['/driver/trips', nextTrip()!.id]" class="next-trip-card">
      <div class="route">
        <span class="city">{{ nextTrip()!.route.origin.nameAr }}</span>
        <i class="pi pi-arrow-left"></i>
        <span class="city">{{ nextTrip()!.route.destination.nameAr }}</span>
      </div>
      <div class="departure">{{ nextTrip()!.departureAt | arabicDate }}</div>
      @if (nextTrip()!.bookingMode === 'per_seat') {
        <div class="seats">
          {{ (nextTrip()!.totalSeats ?? 0) - (nextTrip()!.availableSeats ?? 0) }} / {{ nextTrip()!.totalSeats }} مقاعد محجوزة
        </div>
      }
      <span class="status-chip scheduled">قادمة</span>
    </a>
  }
</div>
```

- [ ] **Step 5: Create home.component.scss**

Create `src/app/features/driver/home/components/home/home.component.scss`:

```scss
.home-page {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.approval-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: #fff8e1;
  border: 1px solid var(--govsa-secondary);
  color: #7a5c00;
  font-size: 0.9rem;

  &.rejected {
    background: #fdecea;
    border-color: #e53935;
    color: #b71c1c;
  }

  .banner-link {
    margin-right: auto;
    color: var(--govsa-primary);
    font-weight: 600;
    text-decoration: none;
  }
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin: 0;
}

.next-trip-card {
  display: block;
  padding: 1.25rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-decoration: none;
  color: inherit;

  .route {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--govsa-primary);
    margin-bottom: 0.5rem;
  }

  .departure {
    color: #64748b;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .seats {
    font-size: 0.85rem;
    color: #475569;
    margin-bottom: 0.75rem;
  }

  .status-chip {
    display: inline-block;
    padding: 0.2rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    background: #e8f5e9;
    color: #2e7d32;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|HomeComponent)"
```

Expected: all `HomeComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/home/
git commit -m "feat(driver): add HomeComponent with approval banner and next trip"
```

---

## Task 8: TripListComponent

**Files:**
- Create: `src/app/features/driver/trips/components/trip-list/trip-list.component.ts`
- Create: `src/app/features/driver/trips/components/trip-list/trip-list.component.html`
- Create: `src/app/features/driver/trips/components/trip-list/trip-list.component.scss`
- Create: `src/app/features/driver/trips/components/trip-list/trip-list.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/driver/trips/components/trip-list/trip-list.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { TripListComponent } from './trip-list.component';
import { DriverTripService } from '../../services/driver-trip.service';
import { DriverTripSummary } from '../../models/driver-trip.model';

const trip1: DriverTripSummary = {
  id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
  bookingMode: 'per_seat', totalSeats: 10, availableSeats: 7,
  route: { estimatedDurationMin: 120, origin: { nameAr: 'الرياض', nameEn: 'Riyadh' }, destination: { nameAr: 'جدة', nameEn: 'Jeddah' } },
};
const trip2: DriverTripSummary = { ...trip1, id: 't2', status: 'completed' };

const mockTripService = {
  trips: signal<DriverTripSummary[]>([trip1, trip2]),
  loading: signal(false),
  loadMyTrips: vi.fn(),
};

describe('TripListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: DriverTripService, useValue: mockTripService },
      ],
    }).compileComponents();
  });

  it('should create and call loadMyTrips', () => {
    const fixture = TestBed.createComponent(TripListComponent);
    expect(fixture.componentInstance).toBeTruthy();
    expect(mockTripService.loadMyTrips).toHaveBeenCalled();
  });

  it('filteredTrips() returns all trips when filter is all', () => {
    const fixture = TestBed.createComponent(TripListComponent);
    const comp = fixture.componentInstance;
    comp.setFilter('all');
    expect(comp.filteredTrips()).toHaveLength(2);
  });

  it('filteredTrips() filters by status', () => {
    const fixture = TestBed.createComponent(TripListComponent);
    const comp = fixture.componentInstance;
    comp.setFilter('scheduled');
    expect(comp.filteredTrips()).toHaveLength(1);
    expect(comp.filteredTrips()[0].id).toBe('t1');
  });

  it('statusLabel returns Arabic label', () => {
    const fixture = TestBed.createComponent(TripListComponent);
    expect(fixture.componentInstance.statusLabel('scheduled')).toBe('قادمة');
    expect(fixture.componentInstance.statusLabel('in_progress')).toBe('جارية');
    expect(fixture.componentInstance.statusLabel('completed')).toBe('مكتملة');
    expect(fixture.componentInstance.statusLabel('cancelled')).toBe('ملغاة');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|TripListComponent)"
```

Expected: FAIL.

- [ ] **Step 3: Create trip-list.component.ts**

Create `src/app/features/driver/trips/components/trip-list/trip-list.component.ts`:

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DriverTripService } from '../../services/driver-trip.service';
import { TripStatus } from '../../models/driver-trip.model';
import { AppLoadingComponent, AppEmptyStateComponent, ArabicDatePipe } from '../../../../../shared/index';

type FilterValue = 'all' | TripStatus;

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [AppLoadingComponent, AppEmptyStateComponent, ArabicDatePipe],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent {
  protected tripService = inject(DriverTripService);
  private router = inject(Router);

  activeFilter = signal<FilterValue>('all');

  readonly filterChips: { label: string; value: FilterValue }[] = [
    { label: 'الكل', value: 'all' },
    { label: 'قادمة', value: 'scheduled' },
    { label: 'جارية', value: 'in_progress' },
    { label: 'مكتملة', value: 'completed' },
    { label: 'ملغاة', value: 'cancelled' },
  ];

  readonly filteredTrips = computed(() => {
    const filter = this.activeFilter();
    const trips = this.tripService.trips();
    return filter === 'all' ? trips : trips.filter(t => t.status === filter);
  });

  constructor() {
    this.tripService.loadMyTrips();
  }

  setFilter(value: FilterValue): void {
    this.activeFilter.set(value);
  }

  openTrip(id: string): void {
    this.router.navigate(['/driver/trips', id]);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'قادمة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة',
    };
    return labels[status] ?? status;
  }

  seatsLabel(trip: { totalSeats: number | null; availableSeats: number | null }): string {
    if (trip.totalSeats == null) return '';
    const booked = (trip.totalSeats) - (trip.availableSeats ?? 0);
    return `${booked} / ${trip.totalSeats} مقاعد`;
  }
}
```

- [ ] **Step 4: Create trip-list.component.html**

Create `src/app/features/driver/trips/components/trip-list/trip-list.component.html`:

```html
<div class="trip-list-page">
  <div class="filter-chips">
    @for (chip of filterChips; track chip.value) {
      <button
        class="chip"
        [class.active]="activeFilter() === chip.value"
        (click)="setFilter(chip.value)">
        {{ chip.label }}
      </button>
    }
  </div>

  @if (tripService.loading()) {
    <app-loading />
  } @else if (filteredTrips().length === 0) {
    <app-empty-state message="لا توجد رحلات في هذه الفئة" />
  } @else {
    <div class="trips-list">
      @for (trip of filteredTrips(); track trip.id) {
        <div class="trip-card" (click)="openTrip(trip.id)">
          <div class="trip-card__route">
            <span>{{ trip.route.origin.nameAr }}</span>
            <i class="pi pi-arrow-left"></i>
            <span>{{ trip.route.destination.nameAr }}</span>
          </div>
          <div class="trip-card__meta">
            <span class="departure">{{ trip.departureAt | arabicDate }}</span>
            @if (trip.bookingMode === 'per_seat') {
              <span class="seats">{{ seatsLabel(trip) }}</span>
            }
          </div>
          <span class="status-chip status-{{ trip.status }}">{{ statusLabel(trip.status) }}</span>
        </div>
      }
    </div>
  }
</div>
```

- [ ] **Step 5: Create trip-list.component.scss**

Create `src/app/features/driver/trips/components/trip-list/trip-list.component.scss`:

```scss
.trip-list-page {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  .chip {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    border: 1px solid #cbd5e1;
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    color: #475569;
    transition: all 0.15s;

    &.active {
      background: var(--govsa-primary);
      border-color: var(--govsa-primary);
      color: #fff;
    }
  }
}

.trips-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trip-card {
  padding: 1rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  &__route {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--govsa-primary);
  }

  &__meta {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: #64748b;
  }

  .status-chip {
    align-self: flex-start;
    padding: 0.15rem 0.6rem;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 600;

    &.status-scheduled   { background: #e8f5e9; color: #2e7d32; }
    &.status-in_progress { background: #fff3e0; color: #e65100; }
    &.status-completed   { background: #e3f2fd; color: #1565c0; }
    &.status-cancelled   { background: #fce4ec; color: #c62828; }
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|TripListComponent)"
```

Expected: all `TripListComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/trips/components/trip-list/
git commit -m "feat(driver): add TripListComponent with status filtering"
```

---

## Task 9: PassengerManifestComponent

**Files:**
- Create: `src/app/features/driver/trips/components/trip-detail/passenger-manifest/passenger-manifest.component.ts`
- Create: `src/app/features/driver/trips/components/trip-detail/passenger-manifest/passenger-manifest.component.html`
- Create: `src/app/features/driver/trips/components/trip-detail/passenger-manifest/passenger-manifest.component.scss`
- Create: `src/app/features/driver/trips/components/trip-detail/passenger-manifest/passenger-manifest.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `.../passenger-manifest/passenger-manifest.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { PassengerManifestComponent } from './passenger-manifest.component';
import { DriverTripService } from '../../../services/driver-trip.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { PassengerManifestEntry } from '../../../models/driver-trip.model';

const pending: PassengerManifestEntry = {
  bookingId: 'b1', seatCode: '3A', passengerName: 'Ahmed',
  nationality: 'Saudi', idNumber: '1234', paymentStatus: 'pending', totalPrice: 150,
};
const paid: PassengerManifestEntry = {
  ...pending, bookingId: 'b2', seatCode: '4B', paymentStatus: 'paid',
};

const mockTripService = {
  collectPayment: vi.fn(),
  markPassengerPaid: vi.fn(),
};
const mockToast = { error: vi.fn(), success: vi.fn() };

describe('PassengerManifestComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerManifestComponent, NoopAnimationsModule],
      providers: [
        { provide: DriverTripService, useValue: mockTripService },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();
  });

  it('should create with passengers input', () => {
    const fixture = TestBed.createComponent(PassengerManifestComponent);
    fixture.componentInstance.passengers = [pending];
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('isCollecting returns true only for in-flight bookingId', () => {
    const fixture = TestBed.createComponent(PassengerManifestComponent);
    fixture.componentInstance.passengers = [pending];
    fixture.componentInstance['collecting'].set('b1');
    expect(fixture.componentInstance.isCollecting('b1')).toBe(true);
    expect(fixture.componentInstance.isCollecting('b2')).toBe(false);
  });

  it('paymentStatusLabel returns correct Arabic', () => {
    const fixture = TestBed.createComponent(PassengerManifestComponent);
    expect(fixture.componentInstance.paymentStatusLabel('paid')).toBe('مدفوع');
    expect(fixture.componentInstance.paymentStatusLabel('pending')).toBe('غير مدفوع');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|PassengerManifest)"
```

Expected: FAIL.

- [ ] **Step 3: Create passenger-manifest.component.ts**

Create `.../passenger-manifest/passenger-manifest.component.ts`:

```typescript
import { Component, Input, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DriverTripService } from '../../../services/driver-trip.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { PassengerManifestEntry } from '../../../models/driver-trip.model';
import { AppEmptyStateComponent, CurrencySarPipe } from '../../../../../../shared/index';

@Component({
  selector: 'app-passenger-manifest',
  standalone: true,
  imports: [ButtonModule, AppEmptyStateComponent, CurrencySarPipe],
  templateUrl: './passenger-manifest.component.html',
  styleUrl: './passenger-manifest.component.scss',
})
export class PassengerManifestComponent {
  @Input() passengers: PassengerManifestEntry[] = [];

  private tripService = inject(DriverTripService);
  private toast       = inject(ToastService);
  private destroyRef  = inject(DestroyRef);

  protected collecting = signal<string | null>(null);

  isCollecting(bookingId: string): boolean {
    return this.collecting() === bookingId;
  }

  collect(entry: PassengerManifestEntry): void {
    this.collecting.set(entry.bookingId);
    this.tripService.collectPayment(entry.bookingId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.tripService.markPassengerPaid(entry.bookingId);
        this.collecting.set(null);
        this.toast.success('تم تسجيل الدفع بنجاح');
      },
      error: () => {
        this.collecting.set(null);
        this.toast.error('فشل تسجيل الدفع');
      },
    });
  }

  paymentStatusLabel(status: string): string {
    return status === 'paid' ? 'مدفوع' : 'غير مدفوع';
  }
}
```

- [ ] **Step 4: Create passenger-manifest.component.html**

Create `.../passenger-manifest/passenger-manifest.component.html`:

```html
<div class="manifest-section">
  <h3 class="manifest-title">كشف الركاب</h3>

  @if (passengers.length === 0) {
    <app-empty-state message="لا يوجد ركاب مسجلون" />
  } @else {
    <div class="manifest-table-wrapper">
      <table class="manifest-table">
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الجنسية</th>
            <th>رقم الهوية</th>
            <th>المقعد</th>
            <th>الدفع</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (entry of passengers; track entry.bookingId + entry.seatCode; let i = $index) {
            <tr>
              <td>{{ i + 1 }}</td>
              <td>{{ entry.passengerName }}</td>
              <td>{{ entry.nationality }}</td>
              <td>{{ entry.idNumber }}</td>
              <td>{{ entry.seatCode }}</td>
              <td>
                <span class="payment-badge" [class.paid]="entry.paymentStatus === 'paid'">
                  @if (entry.paymentStatus === 'paid') {
                    <i class="pi pi-check-circle"></i>
                  }
                  {{ paymentStatusLabel(entry.paymentStatus) }}
                </span>
              </td>
              <td>
                @if (entry.paymentStatus !== 'paid') {
                  <button
                    pButton
                    label="استلمت الدفع"
                    size="small"
                    severity="success"
                    [loading]="isCollecting(entry.bookingId)"
                    [disabled]="isCollecting(entry.bookingId)"
                    (click)="collect(entry)">
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>
```

- [ ] **Step 5: Create passenger-manifest.component.scss**

Create `.../passenger-manifest/passenger-manifest.component.scss`:

```scss
.manifest-section {
  margin-top: 1.5rem;
}

.manifest-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin: 0 0 1rem 0;
}

.manifest-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.manifest-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: right;

  th {
    background: #f8fafc;
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.payment-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #fff3e0;
  color: #e65100;

  &.paid {
    background: #e8f5e9;
    color: #2e7d32;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|PassengerManifest)"
```

Expected: all `PassengerManifestComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/trips/components/trip-detail/passenger-manifest/
git commit -m "feat(driver): add PassengerManifestComponent with COD payment"
```

---

## Task 10: TripDetailComponent

**Files:**
- Create: `src/app/features/driver/trips/components/trip-detail/trip-detail.component.ts`
- Create: `src/app/features/driver/trips/components/trip-detail/trip-detail.component.html`
- Create: `src/app/features/driver/trips/components/trip-detail/trip-detail.component.scss`
- Create: `src/app/features/driver/trips/components/trip-detail/trip-detail.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/driver/trips/components/trip-detail/trip-detail.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { TripDetailComponent } from './trip-detail.component';
import { DriverTripService } from '../../services/driver-trip.service';
import { DriverTripDetail } from '../../models/driver-trip.model';

const mockTrip: DriverTripDetail = {
  id: 't1', departureAt: '2026-05-01T08:00:00Z', status: 'scheduled',
  bookingMode: 'per_seat', totalSeats: 10, availableSeats: 7,
  route: { estimatedDurationMin: 120, origin: { nameAr: 'الرياض', nameEn: 'Riyadh' }, destination: { nameAr: 'جدة', nameEn: 'Jeddah' } },
  car: { brand: 'Toyota', model: 'Camry', plateNumber: 'ABC123', carType: 'sedan' },
  passengers: [],
};

const mockTripService = {
  selectedTrip: signal<DriverTripDetail | null>(mockTrip),
  loading: signal(false),
  loadTrip: vi.fn(),
  updateStatus: vi.fn().mockReturnValue(of({ status: 'in_progress' })),
  collectPayment: vi.fn(),
  markPassengerPaid: vi.fn(),
};

describe('TripDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: DriverTripService, useValue: mockTripService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 't1' } } },
        },
      ],
    }).compileComponents();
  });

  it('should create and call loadTrip', () => {
    const fixture = TestBed.createComponent(TripDetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
    expect(mockTripService.loadTrip).toHaveBeenCalledWith('t1');
  });

  it('canStart returns true for scheduled trip', () => {
    const fixture = TestBed.createComponent(TripDetailComponent);
    expect(fixture.componentInstance.canStart()).toBe(true);
  });

  it('canComplete returns false for scheduled trip', () => {
    const fixture = TestBed.createComponent(TripDetailComponent);
    expect(fixture.componentInstance.canComplete()).toBe(false);
  });

  it('canComplete returns true for in_progress trip', () => {
    mockTripService.selectedTrip.set({ ...mockTrip, status: 'in_progress' });
    const fixture = TestBed.createComponent(TripDetailComponent);
    expect(fixture.componentInstance.canComplete()).toBe(true);
    mockTripService.selectedTrip.set(mockTrip);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|TripDetailComponent)"
```

Expected: FAIL.

- [ ] **Step 3: Create trip-detail.component.ts**

Create `src/app/features/driver/trips/components/trip-detail/trip-detail.component.ts`:

```typescript
import { Component, inject, signal, DestroyRef, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DriverTripService } from '../../services/driver-trip.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { PassengerManifestComponent } from './passenger-manifest/passenger-manifest.component';
import { AppLoadingComponent, ArabicDatePipe } from '../../../../../shared/index';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    PassengerManifestComponent,
    AppLoadingComponent,
    ArabicDatePipe,
  ],
  templateUrl: './trip-detail.component.html',
  styleUrl: './trip-detail.component.scss',
})
export class TripDetailComponent {
  protected tripService = inject(DriverTripService);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  private confirm       = inject(ConfirmationService);
  private toast         = inject(ToastService);
  private destroyRef    = inject(DestroyRef);

  updatingStatus = signal(false);

  readonly canStart = computed(() =>
    this.tripService.selectedTrip()?.status === 'scheduled'
  );
  readonly canComplete = computed(() =>
    this.tripService.selectedTrip()?.status === 'in_progress'
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tripService.loadTrip(id);
  }

  requestStart(): void {
    this.confirm.confirm({
      message: 'هل أنت متأكد من بدء هذه الرحلة؟',
      header: 'تأكيد البدء',
      icon: 'pi pi-play',
      acceptLabel: 'نعم، ابدأ',
      rejectLabel: 'لا',
      accept: () => this.changeStatus('in_progress'),
    });
  }

  requestComplete(): void {
    this.confirm.confirm({
      message: 'هل أنت متأكد من إنهاء هذه الرحلة؟',
      header: 'تأكيد الإنهاء',
      icon: 'pi pi-check',
      acceptLabel: 'نعم، أنهِ',
      rejectLabel: 'لا',
      accept: () => this.changeStatus('completed'),
    });
  }

  private changeStatus(status: 'in_progress' | 'completed'): void {
    const trip = this.tripService.selectedTrip();
    if (!trip) return;
    this.updatingStatus.set(true);
    this.tripService.updateStatus(trip.id, status).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.tripService.loadTrip(trip.id);
      },
      error: () => {
        this.updatingStatus.set(false);
        this.toast.error('فشل تحديث حالة الرحلة');
      },
    });
  }
}
```

- [ ] **Step 4: Create trip-detail.component.html**

Create `src/app/features/driver/trips/components/trip-detail/trip-detail.component.html`:

```html
<p-confirmDialog />

<div class="trip-detail-page">
  @if (tripService.loading()) {
    <app-loading />
  } @else if (tripService.selectedTrip(); as trip) {
    <!-- Trip header -->
    <div class="trip-header">
      <div class="route">
        <span class="city">{{ trip.route.origin.nameAr }}</span>
        <i class="pi pi-arrow-left"></i>
        <span class="city">{{ trip.route.destination.nameAr }}</span>
      </div>
      <div class="trip-meta">
        <span><i class="pi pi-calendar"></i> {{ trip.departureAt | arabicDate }}</span>
        <span><i class="pi pi-car"></i> {{ trip.car.brand }} {{ trip.car.model }}</span>
        <span><i class="pi pi-tag"></i> {{ trip.car.plateNumber }}</span>
      </div>
    </div>

    <!-- Status action bar -->
    @if (canStart() || canComplete()) {
      <div class="status-actions">
        @if (canStart()) {
          <button
            pButton
            label="ابدأ الرحلة"
            icon="pi pi-play"
            severity="success"
            [loading]="updatingStatus()"
            [disabled]="updatingStatus()"
            (click)="requestStart()">
          </button>
        }
        @if (canComplete()) {
          <button
            pButton
            label="أنهِ الرحلة"
            icon="pi pi-check"
            severity="primary"
            [loading]="updatingStatus()"
            [disabled]="updatingStatus()"
            (click)="requestComplete()">
          </button>
        }
      </div>
    }

    <!-- Passenger manifest -->
    <app-passenger-manifest [passengers]="trip.passengers" />
  }
</div>
```

- [ ] **Step 5: Create trip-detail.component.scss**

Create `src/app/features/driver/trips/components/trip-detail/trip-detail.component.scss`:

```scss
.trip-detail-page {
  padding: 1rem;
}

.trip-header {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;

  .route {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--govsa-primary);
    margin-bottom: 0.75rem;
  }

  .trip-meta {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.875rem;
    color: #64748b;

    span {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
  }
}

.status-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|TripDetailComponent)"
```

Expected: all `TripDetailComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/trips/components/trip-detail/
git commit -m "feat(driver): add TripDetailComponent with status management"
```

---

## Task 11: DocumentsComponent

**Files:**
- Create: `src/app/features/driver/documents/components/documents/documents.component.ts`
- Create: `src/app/features/driver/documents/components/documents/documents.component.html`
- Create: `src/app/features/driver/documents/components/documents/documents.component.scss`
- Create: `src/app/features/driver/documents/components/documents/documents.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `.../documents/documents.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DocumentsComponent } from './documents.component';
import { DocumentService } from '../../services/document.service';
import { DriverProfileService } from '../../../profile/services/driver-profile.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DriverDocument } from '../../models/driver-document.model';
import { DriverProfile } from '../../../profile/models/driver-profile.model';

const mockDoc: DriverDocument = {
  id: 'd1', docType: 'national_id', fileUrl: 'http://s3/id.jpg',
  status: 'pending', uploadedAt: '2026-04-01T00:00:00Z',
};
const mockProfile: DriverProfile = {
  id: 'dp1', fullName: 'خالد', email: 'k@test.com', phone: '0501234567',
  idNumber: '1234', licenseNumber: 'LIC', approvalStatus: 'pending', rejectionReason: null, cars: [],
};

const mockDocService = {
  documents: signal<DriverDocument[]>([mockDoc]),
  loading: signal(false),
  loadDocuments: vi.fn(),
  uploadDocument: vi.fn().mockReturnValue(of(mockDoc)),
  replaceDocument: vi.fn(),
};
const mockProfileService = {
  profile: signal<DriverProfile | null>(mockProfile),
  loading: signal(false),
  loadProfile: vi.fn(),
};
const mockToast = { error: vi.fn(), success: vi.fn() };

describe('DocumentsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent, NoopAnimationsModule],
      providers: [
        { provide: DocumentService, useValue: mockDocService },
        { provide: DriverProfileService, useValue: mockProfileService },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();
  });

  it('should create and call loadDocuments and loadProfile', () => {
    TestBed.createComponent(DocumentsComponent);
    expect(mockDocService.loadDocuments).toHaveBeenCalled();
    expect(mockProfileService.loadProfile).toHaveBeenCalled();
  });

  it('docFor() returns matching document or undefined', () => {
    const fixture = TestBed.createComponent(DocumentsComponent);
    const comp = fixture.componentInstance;
    expect(comp.docFor('national_id')?.id).toBe('d1');
    expect(comp.docFor('license')).toBeUndefined();
  });

  it('isUploading returns true only for in-flight docType', () => {
    const fixture = TestBed.createComponent(DocumentsComponent);
    fixture.componentInstance['uploading'].set('national_id');
    expect(fixture.componentInstance.isUploading('national_id')).toBe(true);
    expect(fixture.componentInstance.isUploading('license')).toBe(false);
  });

  it('showRejectionBanner returns true when profile is rejected', () => {
    mockProfileService.profile.set({ ...mockProfile, approvalStatus: 'rejected', rejectionReason: 'Missing docs' });
    const fixture = TestBed.createComponent(DocumentsComponent);
    expect(fixture.componentInstance.showRejectionBanner()).toBe(true);
    mockProfileService.profile.set(mockProfile);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DocumentsComponent)"
```

Expected: FAIL.

- [ ] **Step 3: Create documents.component.ts**

Create `src/app/features/driver/documents/components/documents/documents.component.ts`:

```typescript
import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DocumentService } from '../../services/document.service';
import { DriverProfileService } from '../../../profile/services/driver-profile.service';
import { ToastService } from '../../../../../core/services/toast.service';
import {
  DriverDocumentType, DOCUMENT_LABELS, ALL_DOC_TYPES,
} from '../../models/driver-document.model';
import { AppLoadingComponent } from '../../../../../shared/index';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [ButtonModule, AppLoadingComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
})
export class DocumentsComponent {
  protected docService     = inject(DocumentService);
  protected profileService = inject(DriverProfileService);
  private toast            = inject(ToastService);
  private destroyRef       = inject(DestroyRef);

  protected uploading = signal<DriverDocumentType | null>(null);

  readonly docSlots = ALL_DOC_TYPES.map(type => ({
    type,
    label: DOCUMENT_LABELS[type],
  }));

  readonly showRejectionBanner = computed(() =>
    this.profileService.profile()?.approvalStatus === 'rejected'
  );

  constructor() {
    this.docService.loadDocuments();
    this.profileService.loadProfile();
  }

  docFor(docType: DriverDocumentType) {
    return this.docService.documents().find(d => d.docType === docType);
  }

  isUploading(docType: DriverDocumentType): boolean {
    return this.uploading() === docType;
  }

  onFileSelected(event: Event, docType: DriverDocumentType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(docType);
    this.docService.uploadDocument(docType, file).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: updated => {
        this.docService.replaceDocument(updated);
        this.uploading.set(null);
        this.toast.success('تم رفع الوثيقة بنجاح');
        input.value = '';
      },
      error: () => {
        this.uploading.set(null);
        this.toast.error('فشل رفع الوثيقة');
        input.value = '';
      },
    });
  }
}
```

- [ ] **Step 4: Create documents.component.html**

Create `src/app/features/driver/documents/components/documents/documents.component.html`:

```html
<div class="documents-page">
  @if (showRejectionBanner() && profileService.profile()?.rejectionReason) {
    <div class="rejection-banner">
      <i class="pi pi-times-circle"></i>
      <span>سبب الرفض: {{ profileService.profile()!.rejectionReason }}</span>
    </div>
  }

  <h2 class="page-title">وثائقي</h2>

  @if (docService.loading()) {
    <app-loading />
  } @else {
    <div class="doc-slots">
      @for (slot of docSlots; track slot.type) {
        <div class="doc-card">
          <div class="doc-card__header">
            <i class="pi pi-file doc-icon"></i>
            <span class="doc-label">{{ slot.label }}</span>
          </div>

          @if (docFor(slot.type); as doc) {
            <div class="doc-card__info">
              <span class="upload-date">رُفع في: {{ doc.uploadedAt | slice:0:10 }}</span>
              <span class="status-badge status-{{ doc.status }}">
                @if (doc.status === 'approved') { <i class="pi pi-check-circle"></i> }
                @if (doc.status === 'rejected') { <i class="pi pi-times-circle"></i> }
                @if (doc.status === 'pending')  { <i class="pi pi-clock"></i> }
                {{ doc.status === 'approved' ? 'مقبول' : doc.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة' }}
              </span>
            </div>
          } @else {
            <p class="not-uploaded">لم يُرفع بعد</p>
          }

          <label class="upload-btn" [class.disabled]="isUploading(slot.type)">
            @if (isUploading(slot.type)) {
              <i class="pi pi-spin pi-spinner"></i> جاري الرفع...
            } @else {
              <i class="pi pi-upload"></i>
              {{ docFor(slot.type) ? 'إعادة الرفع' : 'رفع الوثيقة' }}
            }
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style="display: none"
              [disabled]="isUploading(slot.type)"
              (change)="onFileSelected($event, slot.type)" />
          </label>
        </div>
      }
    </div>
  }
</div>
```

- [ ] **Step 5: Create documents.component.scss**

Create `src/app/features/driver/documents/components/documents/documents.component.scss`:

```scss
.documents-page {
  padding: 1rem;
}

.rejection-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: #fdecea;
  border: 1px solid #e53935;
  color: #b71c1c;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin: 0 0 1rem 0;
}

.doc-slots {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.doc-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .doc-icon { font-size: 1.25rem; color: var(--govsa-primary); }
    .doc-label { font-weight: 600; color: #1e293b; }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #64748b;
  }
}

.not-uploaded {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;

  &.status-approved { background: #e8f5e9; color: #2e7d32; }
  &.status-rejected { background: #fce4ec; color: #c62828; }
  &.status-pending  { background: #fff8e1; color: #f57f17; }
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--govsa-primary);
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;
  transition: opacity 0.15s;

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DocumentsComponent)"
```

Expected: all `DocumentsComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/documents/components/
git commit -m "feat(driver): add DocumentsComponent with file upload"
```

---

## Task 12: DriverProfileComponent

**Files:**
- Create: `src/app/features/driver/profile/components/profile/profile.component.ts`
- Create: `src/app/features/driver/profile/components/profile/profile.component.html`
- Create: `src/app/features/driver/profile/components/profile/profile.component.scss`
- Create: `src/app/features/driver/profile/components/profile/profile.component.spec.ts`

> The component class is named `DriverProfileComponent` (not `ProfileComponent`) to avoid a name collision with the rider's `ProfileComponent`.

- [ ] **Step 1: Write the failing test**

Create `.../profile/profile.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { DriverProfileComponent } from './profile.component';
import { DriverProfileService } from '../../services/driver-profile.service';
import { DriverProfile } from '../../models/driver-profile.model';

const mockProfile: DriverProfile = {
  id: 'dp1', fullName: 'خالد', email: 'k@test.com', phone: '0501234567',
  idNumber: '1234567890', licenseNumber: 'LIC123',
  approvalStatus: 'approved', rejectionReason: null,
  cars: [{ id: 'c1', carType: 'sedan', brand: 'Toyota', model: 'Camry', year: 2022, plateNumber: 'ABC123', totalSeats: 4 }],
};

const mockProfileService = {
  profile: signal<DriverProfile | null>(mockProfile),
  loading: signal(false),
  loadProfile: vi.fn(),
};

describe('DriverProfileComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverProfileComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: DriverProfileService, useValue: mockProfileService },
      ],
    }).compileComponents();
  });

  it('should create and call loadProfile', () => {
    TestBed.createComponent(DriverProfileComponent);
    expect(mockProfileService.loadProfile).toHaveBeenCalled();
  });

  it('approvalLabel returns correct Arabic', () => {
    const fixture = TestBed.createComponent(DriverProfileComponent);
    const comp = fixture.componentInstance;
    expect(comp.approvalLabel('approved')).toBe('موافق عليه');
    expect(comp.approvalLabel('pending')).toBe('قيد المراجعة');
    expect(comp.approvalLabel('rejected')).toBe('مرفوض');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverProfileComponent)"
```

Expected: FAIL.

- [ ] **Step 3: Create profile.component.ts**

Create `src/app/features/driver/profile/components/profile/profile.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DriverProfileService } from '../../services/driver-profile.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppLoadingComponent } from '../../../../../shared/index';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [ButtonModule, AppLoadingComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class DriverProfileComponent {
  protected profileService = inject(DriverProfileService);
  private auth             = inject(AuthService);
  private router           = inject(Router);

  constructor() {
    this.profileService.loadProfile();
  }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }

  approvalLabel(status: string): string {
    const labels: Record<string, string> = {
      approved: 'موافق عليه',
      pending: 'قيد المراجعة',
      rejected: 'مرفوض',
    };
    return labels[status] ?? status;
  }

  carTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      sedan: 'سيدان', family: 'عائلية', vip: 'VIP',
      limousine: 'ليموزين', minibus: 'ميني باص', bus: 'حافلة',
    };
    return labels[type] ?? type;
  }
}
```

- [ ] **Step 4: Create profile.component.html**

Create `src/app/features/driver/profile/components/profile/profile.component.html`:

```html
<div class="profile-page">
  @if (profileService.loading()) {
    <app-loading />
  } @else if (profileService.profile(); as profile) {
    <!-- Approval status -->
    <div class="status-card" [class]="'status-' + profile.approvalStatus">
      <i class="pi" [class.pi-check-circle]="profile.approvalStatus === 'approved'"
                    [class.pi-clock]="profile.approvalStatus === 'pending'"
                    [class.pi-times-circle]="profile.approvalStatus === 'rejected'"></i>
      <div>
        <div class="status-label">{{ approvalLabel(profile.approvalStatus) }}</div>
        @if (profile.rejectionReason) {
          <div class="rejection-reason">{{ profile.rejectionReason }}</div>
        }
      </div>
    </div>

    <!-- Driver info -->
    <section class="info-section">
      <h3 class="section-title">المعلومات الشخصية</h3>
      <div class="info-row"><span class="label">الاسم</span><span>{{ profile.fullName }}</span></div>
      <div class="info-row"><span class="label">الجوال</span><span>{{ profile.phone }}</span></div>
      <div class="info-row"><span class="label">البريد</span><span>{{ profile.email }}</span></div>
      <div class="info-row"><span class="label">رقم الهوية</span><span>{{ profile.idNumber }}</span></div>
      <div class="info-row"><span class="label">رخصة القيادة</span><span>{{ profile.licenseNumber }}</span></div>
    </section>

    <!-- Cars -->
    @if (profile.cars.length > 0) {
      <section class="info-section">
        <h3 class="section-title">السيارة</h3>
        @for (car of profile.cars; track car.id) {
          <div class="car-card">
            <div class="info-row"><span class="label">النوع</span><span>{{ carTypeLabel(car.carType) }}</span></div>
            <div class="info-row"><span class="label">الماركة</span><span>{{ car.brand }} {{ car.model }} {{ car.year }}</span></div>
            <div class="info-row"><span class="label">رقم اللوحة</span><span>{{ car.plateNumber }}</span></div>
            <div class="info-row"><span class="label">عدد المقاعد</span><span>{{ car.totalSeats }}</span></div>
          </div>
        }
      </section>
    }

    <!-- Logout -->
    <button pButton label="تسجيل الخروج" icon="pi pi-sign-out" severity="secondary"
            class="logout-btn" (click)="logout()"></button>
  }
</div>
```

- [ ] **Step 5: Create profile.component.scss**

Create `src/app/features/driver/profile/components/profile/profile.component.scss`:

```scss
.profile-page {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.status-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid transparent;

  i { font-size: 1.5rem; margin-top: 0.1rem; }

  &.status-approved { background: #e8f5e9; border-color: #a5d6a7; color: #2e7d32; }
  &.status-pending  { background: #fff8e1; border-color: #ffe082; color: #f57f17; }
  &.status-rejected { background: #fce4ec; border-color: #f48fb1; color: #c62828; }

  .status-label { font-weight: 700; font-size: 1rem; }
  .rejection-reason { font-size: 0.85rem; margin-top: 0.2rem; opacity: 0.85; }
}

.info-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--govsa-primary);
  margin: 0 0 0.75rem 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  border-bottom: 1px solid #f1f5f9;

  &:last-child { border-bottom: none; }

  .label { color: #64748b; }
  span:last-child { font-weight: 500; color: #1e293b; }
}

.car-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.logout-btn {
  align-self: flex-start;
}
```

- [ ] **Step 6: Run tests**

```bash
npx ng test --watch=false 2>&1 | grep -E "(PASS|FAIL|DriverProfileComponent)"
```

Expected: all `DriverProfileComponent` tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/driver/profile/components/
git commit -m "feat(driver): add DriverProfileComponent"
```

---

## Task 13: Full Test Suite + Build Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng test --watch=false 2>&1 | tail -20
```

Expected: all tests passing. Note the total test count (should be 115 existing + ~30 new Phase 3 tests ≈ 145+).

If any tests fail, read the error, fix the root cause, and re-run.

- [ ] **Step 2: Run production build**

```bash
npx ng build --configuration=production 2>&1 | tail -20
```

Expected: build succeeds. A budget warning for initial bundle size is acceptable (non-blocking). TypeScript errors are NOT acceptable.

- [ ] **Step 3: Update the Phase 3 handoff doc**

Create `transport-platform/docs/superpowers/PHASE3-HANDOFF.md` (or update if it exists):

```markdown
# Phase 3 — Driver Experience: Handoff & Status

**Created:** 2026-04-04
**Phase 3:** ✅ COMPLETE

## Git State

Branch: `feature/phase3-driver-experience`
Base: `main`

## Test Count

[Fill in actual test count from Step 1 output]

## What Was Built

- Backend: Extended `findOne` (trips) and `getMyProfile` (drivers) queries
- Driver Trip layer: models, repository, service
- Document layer: models, repository, service + ApiService.postFile
- Driver Profile layer: models, repository, service
- Shell updated: Earnings tab → Documents tab
- Routes: home, trips, trips/:id, documents, profile (all lazy-loaded)
- HomeComponent: approval banner + next trip card
- TripListComponent: status filter chips + trip cards
- PassengerManifestComponent: manifest table + COD payment per row
- TripDetailComponent: status management + passenger manifest
- DocumentsComponent: 4 doc slots + file upload
- DriverProfileComponent: read-only info + car section + logout

## Next Phase

Phase 4: Admin Panel
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(driver): Phase 3 complete — driver experience"
```

---

*End of Phase 3 implementation plan.*
