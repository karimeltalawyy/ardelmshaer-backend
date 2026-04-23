# Admin-First Execution Checklist (Production-Like, No Seed Data)
**Date:** 2026-04-05  
**Owner:** Admin + QA  
**Environment:** `transport-platform` API + `transport-frontend` web app  

---

## Rules
- No dummy/seed business data.
- Use real API calls from the frontend only.
- Mark each item as `PASS` or `FAIL` with evidence.

Legend:
- `[ ]` Pending
- `[x]` Pass
- `[-]` Fail

---

## 1) Access & Auth
- [ ] Login as admin with `ad@ad.sa / 0000` → lands on `/admin/dashboard`
- [ ] Register rider account → lands on `/rider/home`
- [ ] Register driver account → lands on `/driver/home`
- [ ] Role guards block cross-role routes (`/admin/*`, `/driver/*`, `/rider/*`)

Evidence:
- Result:
- Notes:

---

## 2) Admin Bootstrap Data (Required Before Bookings)
- [ ] Create at least 2 destinations
- [ ] Create at least 1 route between destinations
- [ ] Add route pricing for at least one car type
- [ ] Create at least 1 active season
- [ ] Approve at least 1 driver in admin driver approvals

Evidence:
- Result:
- Notes:

---

## 3) Driver Supply Setup
- [ ] Admin adds car and assigns it to an approved driver
- [ ] Admin sets seat map for `per_seat` type (if minibus/bus)
- [ ] Admin can see car type + seat map in `/admin/cars`
- [ ] Admin sees occupancy values tied to trip data (not static)

Evidence:
- Result:
- Notes:

---

## 4) Trip Publishing (Admin)
- [ ] Admin creates trip with selected car + route + departure
- [ ] Trip appears in `/admin/trips` with correct status
- [ ] Trip appears in rider trip search

Evidence:
- Result:
- Notes:

---

## 5) Booking Flow (Rider)
- [ ] Rider searches trips and opens trip detail
- [ ] Rider can select seats (per-seat mode) and submit booking
- [ ] Booking appears in rider booking list/detail
- [ ] Booking affects admin cars occupancy/seat map

Evidence:
- Result:
- Notes:

---

## 6) Driver Operations
- [ ] Driver sees assigned trip
- [ ] Driver sees passenger manifest entries from real bookings
- [ ] Driver can collect COD payment per booking
- [ ] Payment status updates are reflected in UI

Evidence:
- Result:
- Notes:

---

## 7) Admin Operations & Controls
- [ ] Dashboard KPIs reflect DB records (users, drivers, trips, bookings, revenue)
- [ ] User management update status/role works
- [ ] Cancellation policy CRUD works
- [ ] Platform config CRUD works
- [ ] Audit logs load and filter works

Evidence:
- Result:
- Notes:

---

## 8) Final Release Gate
- [ ] `npx ng build` passes
- [ ] `npx ng test --watch=false` passes
- [ ] `npm run build` (API) passes
- [ ] No seed dependency required to run core flow

Evidence:
- Result:
- Notes:

---

## Current Snapshot (2026-04-05)
- Frontend build: PASS
- Frontend tests: PASS (115/115)
- Backend build: PASS
- Database: reset and empty, schema applied
- Admin account: `ad@ad.sa` active

---

## Implementation Status Update (2026-04-06)

### Verified by command (today)
- Frontend tests: PASS (`npx ng test --watch=false`) → `115/115`
- Frontend production build: PASS (`npx ng build`)
- Backend build: PASS (`npm run build`)

### Implemented in code (feature-complete, pending QA evidence run)
- Admin routes/pages: dashboard, bookings, documents, trips, cars, branches, drivers, destinations, routes, seasons, users, config, cancellation policies, audit logs.
- Rider flow: trip search, trip detail booking flow, bookings list/detail, profile.
- Driver flow: home, trips, trip detail, cars, documents, profile.
- Role-based shells/guards and role-aware navigation paths.
- Document generation moved under Documents page with management actions.
- Dashboard upgraded with calendar/activity section and bookings table parity.

### Remaining to close this checklist fully
- Execute one full end-to-end manual QA run and mark each checklist item `PASS/FAIL` with evidence under sections 1→7.
- Record evidence snapshots for:
  - auth/role routing
  - bootstrap data creation
  - car assignment + seat/occupancy behavior
  - publish/search/book flow
  - driver COD collection reflection
  - admin ops (config/policies/audit)
- Optional hardening (non-blocking): reduce bundle/style budget warnings.
