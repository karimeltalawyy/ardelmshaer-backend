# Angular Frontend Design — Saudi Transport Platform
**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Phase 1 — Foundation | Phase 2 — Rider | Phase 3 — Driver | Phase 4 — Admin

---

## 1. Project Overview

A single Angular 17+ web application serving three user roles (rider, driver, admin) with role-based routing. No native mobile app — the web app is mobile-responsive and serves as the primary interface for all users, including heavy mobile browser usage.

**Backend:** NestJS API at `/api/v1/...` (existing, fully built)  
**Frontend project:** `transport-frontend/` (new, sibling to `transport-platform/`)

---

## 2. Architecture

### 2.1 Pattern: Feature-based + Clean Architecture Layers

Each feature is self-contained with internal layers that enforce separation of concerns:

```
features/<role>/
├── models/       # Domain interfaces — pure TypeScript, no Angular dependencies
├── data/         # Repositories — only layer that knows about HTTP/API shapes
├── services/     # Use-case facades — business logic, no HTTP knowledge
└── components/   # Pure UI — talk only to services, never to repositories or HTTP
```

**Data flow:** Component → Service (facade) → Repository → API  
**Testing:** Mock the repository to test services; mock the service to test components.

### 2.2 Full Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts          # Signal-based user state
│   │   │   ├── auth.interceptor.ts      # Attaches Bearer token to all requests
│   │   │   └── guards/                  # RiderGuard, DriverGuard, AdminGuard
│   │   ├── services/
│   │   │   ├── api.service.ts           # Typed HTTP wrapper, error normalization
│   │   │   ├── storage.service.ts       # localStorage abstraction (SSR-safe)
│   │   │   └── toast.service.ts         # PrimeNG Toast wrapper, Arabic messages
│   │   └── models/
│   │       └── user.model.ts            # Shared User, Role, AuthResponse types
│   ├── shared/
│   │   ├── components/
│   │   │   ├── app-button/
│   │   │   ├── app-card/
│   │   │   ├── app-badge/               # Status badges: confirmed, cancelled, pending
│   │   │   ├── app-empty-state/
│   │   │   ├── app-loading/             # Skeleton loaders (not spinners)
│   │   │   ├── app-page-header/         # Page title + breadcrumb + optional action
│   │   │   ├── trip-card/               # Trip summary card (rider + driver)
│   │   │   └── booking-card/            # Booking summary card
│   │   ├── pipes/
│   │   │   ├── arabic-date.pipe.ts      # Hijri/Gregorian date formatting
│   │   │   └── currency-sar.pipe.ts     # SAR currency formatting
│   │   └── directives/
│   │       └── skeleton.directive.ts
│   ├── layout/
│   │   ├── rider-shell/                 # Header + sidebar + bottom-nav for rider
│   │   ├── driver-shell/                # Header + sidebar + bottom-nav for driver
│   │   └── admin-shell/                 # Header + sidebar for admin
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── login/               # Shared login form
│   │   │   │   ├── register-shell/      # Role selection: راكب / سائق
│   │   │   │   ├── rider-register/      # Rider signup form
│   │   │   │   └── driver-register/     # Driver application form
│   │   │   └── data/
│   │   │       └── auth.repository.ts   # login(), register() HTTP calls
│   │   ├── rider/                       # Rider dashboard, trips, bookings, profile
│   │   ├── driver/                      # Driver dashboard, trips, earnings, profile
│   │   └── admin/                       # Admin dashboard, users, config, audit logs
│   ├── app.routes.ts                    # Root route definitions
│   ├── app.routes.server.ts             # Hybrid render modes (prerender/CSR)
│   ├── app.config.ts                    # Browser providers
│   └── app.config.server.ts            # Server providers
├── styles/
│   ├── _govsa-tokens.scss              # GOV.SA design tokens (colors, spacing)
│   ├── _primeng-theme.scss             # Custom PrimeNG theme using GOV.SA tokens
│   ├── _premium.scss                   # Shadows, transitions, premium polish layer
│   └── styles.scss                     # Global: IBM Plex Sans Arabic, RTL, resets
└── environments/
    ├── environment.ts                   # { apiUrl: 'http://localhost:3000/api/v1' }
    └── environment.prod.ts
```

---

## 3. Rendering Strategy

**Approach:** Angular SSR scaffolded (`ng new --ssr`), hybrid rendering configured per route.

```typescript
// app.routes.server.ts
export const serverRouteConfig: ServerRoute[] = [
  { path: '/',          renderMode: RenderMode.Prerender }, // landing — static HTML, SEO
  { path: '/**',        renderMode: RenderMode.Client },    // all other routes — CSR
];
```

- Landing page: **prerendered** at build time → static HTML on CDN → full SEO
- All authenticated routes: **CSR** → no server overhead, no hydration issues
- Future: trip search pages can be added as `RenderMode.Server` for SEO

**Deployment:** Angular build output served as static files via Nginx. `app.routes.server.ts` and `app.config.server.ts` are scaffolded in the project but the Nginx deployment is pure static — no Node process runs. A Node server is only required if future routes are added with `RenderMode.Server`.

---

## 4. Authentication & Routing

### 4.1 Login Flow

1. User submits email + password to `POST /api/v1/auth/login`
2. Response: `{ access_token, user: { id, role, fullName } }`
3. `StorageService` persists token; `AuthService` updates `currentUser` signal
4. Router reads `role` and redirects:
   - `rider` → `/rider/home`
   - `driver` → `/driver/home`
   - `admin` → `/admin/dashboard`

### 4.2 Route Guards

```typescript
// RiderGuard: allows role=rider only → else redirect to /rider/home or /login
// DriverGuard: allows role=driver only
// AdminGuard: allows role=admin only → admin has separate /admin/login
```

Wrong-role access redirects to the correct home for that role, not a generic error.

### 4.3 Auth State (Angular Signals)

```typescript
// core/auth/auth.service.ts
currentUser = signal<User | null>(null);
isLoggedIn  = computed(() => !!this.currentUser());
role        = computed(() => this.currentUser()?.role);
```

### 4.4 HTTP Interceptor

- Attaches `Authorization: Bearer <token>` to every outbound request
- On 401 response: clears token, redirects to `/login`
- On 403 response: surfaces a toast error ("غير مصرح لك بهذا الإجراء") — token is valid but the role is insufficient. Does not redirect; the client-side guards prevent wrong-role navigation, so a 403 indicates a direct API call attempt.

### 4.5 SSR-Safe Token Storage

```typescript
// core/services/storage.service.ts
// Uses isPlatformBrowser() — safe for future SSR activation
// Reads/writes localStorage on browser, returns null on server
```

---

## 5. Design System

### 5.1 Font

**IBM Plex Sans Arabic** — loaded via Google Fonts, weights 300/400/500/600/700.

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 5.2 GOV.SA Design Tokens

Extracted from `govsa-ds` as CSS custom properties. Bootstrap CSS is **not** imported.

```scss
// styles/_govsa-tokens.scss
:root {
  --govsa-primary:    #1B3A6B;   // deep navy
  --govsa-secondary:  #C8A951;   // gold
  --govsa-surface:    #F5F7FA;
  --govsa-text:       #1A1A2E;
  --govsa-text-muted: #64748B;
  --govsa-border:     #E2E8F0;
  --govsa-success:    #22C55E;
  --govsa-warning:    #F59E0B;
  --govsa-danger:     #EF4444;
  --govsa-radius:     8px;
  --govsa-radius-lg:  12px;
  --govsa-font:       'IBM Plex Sans Arabic', sans-serif;
  --govsa-shadow-sm:  0 1px 3px rgba(0,0,0,0.08);
  --govsa-shadow-md:  0 4px 16px rgba(0,0,0,0.10);
}
```

### 5.3 PrimeNG Theme

Custom theme built with `@primeng/themes` mapping GOV.SA tokens to PrimeNG's design token system. All PrimeNG components (DataTable, Dialog, Dropdown, Calendar, Toast, etc.) inherit the GOV.SA visual identity automatically.

### 5.4 RTL

`<html dir="rtl" lang="ar">` set in `index.html`. PrimeNG has native RTL support. All flex/grid layouts use logical properties (`margin-inline-start` etc.) for automatic RTL flipping.

### 5.5 Premium Layer

`_premium.scss` adds polish on top of GOV.SA tokens without overriding brand colors:
- Smooth `transition: all 0.2s ease` on interactive elements
- Subtle `box-shadow` on cards
- Hover lift effect on clickable cards
- Clean input focus rings using `--govsa-primary`

---

## 6. Shell Layouts

### 6.1 Desktop (≥ 768px)

```
┌─────────────────────────────────────────┐
│  Header — logo + user name + logout      │
├────────────┬────────────────────────────┤
│  Sidebar   │   <router-outlet>          │
│  (240px)   │   Page content             │
│  nav items │                            │
└────────────┴────────────────────────────┘
```

### 6.2 Mobile (< 768px)

```
┌─────────────────────────┐
│  Header (compact)        │
├─────────────────────────┤
│   <router-outlet>        │
│   Page content           │
├─────────────────────────┤
│  Bottom Nav (5 items)    │
└─────────────────────────┘
```

Bottom navigation pattern follows Saudi app conventions (Absher, Naqel, STC Pay).

---

## 7. Shared Components

| Component | Description |
|---|---|
| `AppButtonComponent` | PrimeNG Button + GOV.SA styles, supports loading state |
| `AppCardComponent` | Surface card with shadow, padding, border-radius |
| `AppBadgeComponent` | Color-coded status: confirmed (green), cancelled (red), pending (amber) |
| `AppEmptyStateComponent` | Arabic empty state with icon + message + optional CTA |
| `AppLoadingComponent` | Skeleton loaders — premium feel, no spinners |
| `AppPageHeaderComponent` | Page title (Arabic) + breadcrumb + optional action button |
| `TripCardComponent` | Reused across rider + driver — origin, destination, date, seats, price |
| `BookingCardComponent` | Booking summary — status badge, route, price, date |

### Shared Pipes

| Pipe | Purpose |
|---|---|
| `ArabicDatePipe` | Formats dates in Arabic locale (`٢٣ مارس ٢٠٢٦`) |
| `CurrencySarPipe` | Formats prices as `١٢٠ ر.س` |

---

## 8. Pages & Routes

### 8.1 Public / Auth

| Route | Component | Notes |
|---|---|---|
| `/` | `LandingComponent` | Prerendered, SEO |
| `/login` | `LoginComponent` | Shared, detects role on response |
| `/register` | `RegisterShellComponent` | Role selection: راكب / سائق |
| `/register/rider` | `RiderRegisterComponent` | |
| `/register/driver` | `DriverRegisterComponent` | |

### 8.2 Rider (`/rider/...`, guarded by RiderGuard)

| Route | Component |
|---|---|
| `/rider/home` | Trip search — origin, destination, date pickers |
| `/rider/trips` | Trip search results list |
| `/rider/trips/:id` | Trip detail — seat map, passenger form, book CTA |
| `/rider/bookings` | My bookings list |
| `/rider/bookings/:id` | Booking detail — passengers, status, documents |
| `/rider/profile` | View/edit profile |

### 8.3 Driver (`/driver/...`, guarded by DriverGuard)

| Route | Component |
|---|---|
| `/driver/home` | Upcoming trips summary cards |
| `/driver/trips` | My trips list with status filters |
| `/driver/trips/:id` | Trip detail — passenger manifest, start/complete controls, cash confirm |
| `/driver/earnings` | Earnings summary + payment history table |
| `/driver/profile` | Profile view + driver application status |

### 8.4 Admin (`/admin/...`, guarded by AdminGuard)

| Route | Component |
|---|---|
| `/admin/login` | Admin-only login (separate from public login) |
| `/admin/dashboard` | KPI cards — users, trips, bookings, revenue |
| `/admin/users` | Users table — search, filter by role/status, suspend action |
| `/admin/users/:id` | User detail — profile, bookings, driver docs, change role/status |
| `/admin/trips` | All trips — filter by status/route |
| `/admin/config` | Platform config key/value editor |
| `/admin/cancellation-policies` | Cancellation policy CRUD |
| `/admin/audit-logs` | Admin action audit trail table |

---

## 9. API Integration

All API calls go through `ApiService` which:
- Prefixes all requests with `environment.apiUrl`
- Returns typed Observables
- Normalizes errors into a consistent `ApiError` shape

Each feature's `data/` layer implements typed repository classes:

```typescript
// features/rider/data/trips.repository.ts
searchTrips(params: TripSearchParams): Observable<Trip[]>
getTripById(id: string): Observable<TripDetail>

// features/rider/data/bookings.repository.ts
createBooking(dto: CreateBookingDto): Observable<Booking>
getMyBookings(): Observable<Booking[]>
cancelBooking(id: string): Observable<Booking>
```

---

## 10. i18n

- Scaffold Angular i18n from day one: `@angular/localize`
- All Arabic strings in component templates use `i18n` attribute
- Default locale: `ar` (RTL)
- Future: add `en` locale with `ng build --localize`
- No runtime language switching in Phase 1 — locale set at build time

---

## 11. Implementation Phases

| Phase | Scope |
|---|---|
| **Phase 1** | Project setup, design system, auth, shared components, shell layouts, role guards |
| **Phase 2** | Rider experience: trip search, seat booking, my bookings, profile |
| **Phase 3** | Driver experience: my trips, manifest, cash confirmation, earnings |
| **Phase 4** | Admin dashboard: KPIs, user management, config, audit logs |

Each phase is implemented and tested independently before moving to the next.

---

## 12. Tech Stack Summary

| Concern | Choice |
|---|---|
| Framework | Angular 17+ (standalone components) |
| Rendering | SPA with SSR scaffolded; landing page prerendered |
| UI Library | PrimeNG |
| Design System | GOV.SA (`govsa-ds` tokens only, no Bootstrap CSS) |
| Font | IBM Plex Sans Arabic |
| State | Angular Signals (no NgRx) |
| Styling | SCSS + GOV.SA tokens + custom PrimeNG theme |
| HTTP | Angular `HttpClient` + typed repositories |
| i18n | `@angular/localize` (ar default, en ready) |
| Language | TypeScript strict mode |
