# Phase 2 — Rider Experience: Handoff & Status

**Created:** 2026-04-04  
**Updated:** 2026-04-04  
**Purpose:** Checkpoint document — paste this into a new session to resume work.

---

## Project Summary

Saudi land transport platform (inspired by smoalmosafer.sa).

- **Backend:** NestJS + Prisma + PostgreSQL — **fully built** at `/Users/krim/Documents/transport-platform`
- **Frontend:** Angular 21 — at `/Users/krim/Documents/transport-frontend`
- **Phase 1 Foundation:** ✅ COMPLETE (design system, auth, shared components, shell layouts — 70 tests, production build clean)
- **Phase 2 Rider Experience:** ✅ COMPLETE (115 tests, production build clean)

---

## Phase 2 — Final Status

**Plan file:** `/Users/krim/Documents/transport-platform/docs/superpowers/plans/2026-04-04-phase2-rider-experience.md`  
**Spec file:** `/Users/krim/Documents/transport-platform/docs/superpowers/specs/2026-04-04-phase2-rider-experience-design.md`

### All 17 tasks — COMPLETE

| # | Task | Status |
|---|------|--------|
| 1 | Trip Models | ✅ done |
| 2 | TripRepository | ✅ done |
| 3 | TripService | ✅ done |
| 4 | Booking Models + User Model Update | ✅ done |
| 5 | BookingRepository | ✅ done |
| 6 | BookingService | ✅ done |
| 7 | BookingFlowService | ✅ done |
| 8 | Profile Layer (models + repo + service) | ✅ done |
| 9 | Update rider.routes.ts + app.config.ts | ✅ done |
| 10 | TripSearchComponent (search form + results) | ✅ done |
| 11 | SeatMapComponent | ✅ done |
| 12 | PassengerFormComponent | ✅ done |
| 13 | TripDetailComponent (4-step booking stepper) | ✅ done |
| 14 | BookingListComponent | ✅ done |
| 15 | BookingDetailComponent (with cancel flow) | ✅ done |
| 16 | ProfileComponent | ✅ done |
| 17 | Full test suite + build verification | ✅ done |

**Test count:** 115 passing (29 test files)  
**Build:** Production build clean (1 budget warning — initial bundle 535 KB vs 500 KB budget, non-blocking)

---

## Git State

**Worktree:** `.worktrees/phase2-rider-experience` on branch `feature/phase2-rider-experience`  
**Base:** `main` at commit `fe4a45e`

Phase 2 commits (most recent first):
```
85ee6c2 feat(rider): add ProfileComponent
49261e6 feat(rider): add BookingDetailComponent with cancellation flow
ffb629e fix: remove unused CommonModule from BookingListComponent
b58b518 feat(rider): add BookingListComponent
47cdaae fix: TripDetailComponent — signal confirming, takeUntilDestroyed, RTL icons, remove double-init
d922b66 feat(rider): add TripDetailComponent with 4-step booking stepper
4684de0 fix(rider): PassengerFormComponent subscription cleanup and type safety
41d5ba8 feat(rider): add PassengerFormComponent with profile pre-fill
daa28f7 feat(rider): add SeatMapComponent
efb7212 feat(rider): add TripSearchComponent with inline results
```

To see full log:
```bash
git -C /Users/krim/Documents/transport-frontend/.worktrees/phase2-rider-experience log --oneline
```

---

## What Was Built

### New files created

```
src/app/features/rider/
  trips/
    models/trip.model.ts
    data/trip.repository.ts + .spec.ts
    services/trip.service.ts + .spec.ts
    components/
      trip-search/trip-search.component.{ts,html,scss,spec.ts}
      trip-detail/trip-detail.component.{ts,html,scss,spec.ts}
      trip-detail/seat-map/seat-map.component.{ts,scss,spec.ts}
      trip-detail/passenger-form/passenger-form.component.{ts,spec.ts}
  bookings/
    models/booking.model.ts
    data/booking.repository.ts + .spec.ts
    services/booking.service.ts + .spec.ts
    services/booking-flow.service.ts + .spec.ts
    components/
      booking-list/booking-list.component.{ts,html,scss,spec.ts}
      booking-detail/booking-detail.component.{ts,html,scss,spec.ts}
  profile/
    models/rider-profile.model.ts
    data/profile.repository.ts + .spec.ts
    services/profile.service.ts + .spec.ts
    components/profile/profile.component.{ts,html,scss,spec.ts}
```

### Modified files

- `src/app/features/rider/rider.routes.ts` — 5 real lazy-loaded routes
- `src/app/core/models/user.model.ts` — added `idNumber?: string`
- `src/app/core/auth/auth.service.ts` — added `updateFullName(name)` method
- `src/app/app.config.ts` — added `ConfirmationService` to providers

---

## Key Technical Decisions Made During Phase 2

### Constructor vs ngOnInit pattern
All components call service init methods (`loadTrip`, `loadBooking`, `loadMyBookings`, etc.) in the **constructor** rather than `ngOnInit`. This is required because zoneless Angular tests call `createComponent()` without `detectChanges()`, and the tests assert service calls immediately after creation.

### Signals for all mutable component state
All component state that affects the template (e.g., `confirming`, `cancelling`) uses `signal()`. Plain boolean fields silently fail to trigger change detection in zoneless apps.

### takeUntilDestroyed for subscriptions
All HTTP subscriptions inside components use `takeUntilDestroyed(this.destroyRef)` to prevent callbacks firing after navigation.

### BookingFlowService scoping
`@Injectable()` (no `providedIn: 'root'`) + `providers: [BookingFlowService]` in `TripDetailComponent`. Destroyed with the component — prevents stale booking state between trips.

### Known backend gap
`PATCH /api/v1/users/me` does not exist in the backend yet. Profile name save will 404 — accepted for Phase 2. Profile read uses `AuthService.currentUser()` signal (no HTTP).

---

## What's Next

- **Phase 3:** Driver Experience (pending)
- **Phase 4:** Admin Panel (pending)
- **Merge Phase 2:** Run `superpowers:finishing-a-development-branch` to merge `feature/phase2-rider-experience` into `main`

To start Phase 3, tell Claude:
> "Start Phase 3 Driver Experience for the Saudi transport platform Angular frontend. Backend is fully built. Phase 1 and Phase 2 are complete. Use subagent-driven development."
