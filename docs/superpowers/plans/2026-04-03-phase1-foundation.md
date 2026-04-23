# Angular Frontend Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `transport-frontend` Angular 21 project with full design system, authentication, role-based routing, shared component library, and responsive shell layouts — everything Phase 2–4 features will build on.

**Architecture:** Feature-based + Clean Architecture layers (models → data → services → components per feature). Angular Signals for auth state. PrimeNG 21 with a custom GOV.SA-themed preset. SSR scaffolded but disabled — landing page prerendered, all auth routes CSR.

**Tech Stack:** Angular 21, Angular SSR, PrimeNG 21, `@primeng/themes`, `govsa-ds` (SCSS tokens only), IBM Plex Sans Arabic (Google Fonts), `@angular/localize`, TypeScript strict mode, Jasmine + Karma

---

## File Map

### Project root (`/Users/krim/Documents/transport-frontend/`)
| File | Action | Purpose |
|---|---|---|
| `angular.json` | Generated + modify | Add `assets`, `styles`, `budgets` |
| `package.json` | Generated + modify | Add PrimeNG, govsa-ds, primeicons |
| `src/index.html` | Modify | `dir="rtl"`, `lang="ar"`, Google Font link |
| `src/main.ts` | Generated | Entry point (untouched) |
| `src/styles.scss` | Modify | Import tokens + theme + premium |
| `src/styles/_govsa-tokens.scss` | Create | CSS custom properties from GOV.SA palette |
| `src/styles/_primeng-theme.scss` | Create | PrimeNG Aura preset override |
| `src/styles/_premium.scss` | Create | Hover effects, shadows, transitions |

### Core
| File | Action | Purpose |
|---|---|---|
| `src/app/core/models/user.model.ts` | Create | `User`, `UserRole`, `AuthResponse` interfaces |
| `src/app/core/services/storage.service.ts` | Create | SSR-safe localStorage abstraction |
| `src/app/core/services/storage.service.spec.ts` | Create | Unit tests |
| `src/app/core/auth/auth.service.ts` | Create | Signal-based user state, login/logout |
| `src/app/core/auth/auth.service.spec.ts` | Create | Unit tests |
| `src/app/core/services/api.service.ts` | Create | Typed HttpClient wrapper |
| `src/app/core/services/api.service.spec.ts` | Create | Unit tests |
| `src/app/core/services/toast.service.ts` | Create | PrimeNG MessageService wrapper |
| `src/app/core/auth/auth.interceptor.ts` | Create | Attach Bearer token; handle 401/403 |
| `src/app/core/auth/auth.interceptor.spec.ts` | Create | Unit tests |
| `src/app/core/auth/guards/auth.guard.ts` | Create | Redirect unauthenticated to /login |
| `src/app/core/auth/guards/rider.guard.ts` | Create | Allow role=rider only |
| `src/app/core/auth/guards/driver.guard.ts` | Create | Allow role=driver only |
| `src/app/core/auth/guards/admin.guard.ts` | Create | Allow role=admin only |
| `src/app/core/auth/guards/guards.spec.ts` | Create | Unit tests for all four guards |

### Auth Feature
| File | Action | Purpose |
|---|---|---|
| `src/app/features/auth/models/auth.models.ts` | Create | `LoginDto`, `RegisterRiderDto`, `RegisterDriverDto` |
| `src/app/features/auth/data/auth.repository.ts` | Create | `login()`, `registerRider()`, `registerDriver()` HTTP calls |
| `src/app/features/auth/data/auth.repository.spec.ts` | Create | Unit tests |
| `src/app/features/auth/services/auth-feature.service.ts` | Create | Login/register use-cases, calls repository + AuthService |
| `src/app/features/auth/services/auth-feature.service.spec.ts` | Create | Unit tests |
| `src/app/features/auth/components/login/login.component.ts` | Create | Login form (reactive) |
| `src/app/features/auth/components/login/login.component.html` | Create | Arabic RTL form template |
| `src/app/features/auth/components/login/login.component.scss` | Create | Component styles |
| `src/app/features/auth/components/login/login.component.spec.ts` | Create | Component tests |
| `src/app/features/auth/components/register-shell/register-shell.component.ts` | Create | Role selection card |
| `src/app/features/auth/components/register-shell/register-shell.component.html` | Create | |
| `src/app/features/auth/components/register-shell/register-shell.component.spec.ts` | Create | |
| `src/app/features/auth/components/rider-register/rider-register.component.ts` | Create | Rider signup form |
| `src/app/features/auth/components/rider-register/rider-register.component.html` | Create | |
| `src/app/features/auth/components/rider-register/rider-register.component.spec.ts` | Create | |
| `src/app/features/auth/components/driver-register/driver-register.component.ts` | Create | Driver application form |
| `src/app/features/auth/components/driver-register/driver-register.component.html` | Create | |
| `src/app/features/auth/components/driver-register/driver-register.component.spec.ts` | Create | |
| `src/app/features/auth/auth.routes.ts` | Create | Auth lazy-loaded routes |

### Shared
| File | Action | Purpose |
|---|---|---|
| `src/app/shared/components/app-badge/app-badge.component.ts` | Create | Color-coded status badge |
| `src/app/shared/components/app-badge/app-badge.component.html` | Create | |
| `src/app/shared/components/app-badge/app-badge.component.scss` | Create | |
| `src/app/shared/components/app-badge/app-badge.component.spec.ts` | Create | |
| `src/app/shared/components/app-card/app-card.component.ts` | Create | Surface card wrapper |
| `src/app/shared/components/app-card/app-card.component.html` | Create | |
| `src/app/shared/components/app-card/app-card.component.scss` | Create | |
| `src/app/shared/components/app-button/app-button.component.ts` | Create | PrimeNG Button wrapper |
| `src/app/shared/components/app-button/app-button.component.html` | Create | |
| `src/app/shared/components/app-button/app-button.component.spec.ts` | Create | |
| `src/app/shared/components/app-loading/app-loading.component.ts` | Create | Skeleton loader |
| `src/app/shared/components/app-loading/app-loading.component.html` | Create | |
| `src/app/shared/components/app-loading/app-loading.component.scss` | Create | |
| `src/app/shared/components/app-empty-state/app-empty-state.component.ts` | Create | Empty state with icon + CTA |
| `src/app/shared/components/app-empty-state/app-empty-state.component.html` | Create | |
| `src/app/shared/components/app-page-header/app-page-header.component.ts` | Create | Page title + breadcrumb |
| `src/app/shared/components/app-page-header/app-page-header.component.html` | Create | |
| `src/app/shared/components/trip-card/trip-card.component.ts` | Create | Trip summary card |
| `src/app/shared/components/trip-card/trip-card.component.html` | Create | |
| `src/app/shared/components/trip-card/trip-card.component.scss` | Create | |
| `src/app/shared/components/trip-card/trip-card.component.spec.ts` | Create | |
| `src/app/shared/components/booking-card/booking-card.component.ts` | Create | Booking summary card |
| `src/app/shared/components/booking-card/booking-card.component.html` | Create | |
| `src/app/shared/components/booking-card/booking-card.component.spec.ts` | Create | |
| `src/app/shared/pipes/arabic-date.pipe.ts` | Create | Arabic date formatting |
| `src/app/shared/pipes/arabic-date.pipe.spec.ts` | Create | |
| `src/app/shared/pipes/currency-sar.pipe.ts` | Create | SAR currency formatting |
| `src/app/shared/pipes/currency-sar.pipe.spec.ts` | Create | |
| `src/app/shared/index.ts` | Create | Barrel export for all shared |

### Layout Shells
| File | Action | Purpose |
|---|---|---|
| `src/app/layout/rider-shell/rider-shell.component.ts` | Create | Header + sidebar + bottom-nav for rider |
| `src/app/layout/rider-shell/rider-shell.component.html` | Create | Responsive shell template |
| `src/app/layout/rider-shell/rider-shell.component.scss` | Create | |
| `src/app/layout/driver-shell/driver-shell.component.ts` | Create | Shell for driver |
| `src/app/layout/driver-shell/driver-shell.component.html` | Create | |
| `src/app/layout/driver-shell/driver-shell.component.scss` | Create | |
| `src/app/layout/admin-shell/admin-shell.component.ts` | Create | Shell for admin (no bottom-nav) |
| `src/app/layout/admin-shell/admin-shell.component.html` | Create | |
| `src/app/layout/admin-shell/admin-shell.component.scss` | Create | |

### App Config & Routing
| File | Action | Purpose |
|---|---|---|
| `src/app/app.config.ts` | Modify | Add PrimeNG providers, HttpClient, i18n |
| `src/app/app.routes.ts` | Modify | Root routes with lazy loading + guards |
| `src/app/app.routes.server.ts` | Create | Hybrid render mode config |

---

## Task 1: Scaffold the Angular Project

**Files:**
- Create: `/Users/krim/Documents/transport-frontend/` (entire project)

- [ ] **Step 1: Scaffold the project with SSR**

Run from `/Users/krim/Documents/`:
```bash
npx @angular/cli new transport-frontend \
  --ssr \
  --style=scss \
  --routing=true \
  --strict=true \
  --skip-git=true
```

When prompted "Do you want to enable Server-Side Rendering (SSR)...?": answer **Yes**.

Expected output: `✔ Packages installed successfully.` — project created at `/Users/krim/Documents/transport-frontend/`

- [ ] **Step 2: Verify it runs**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng serve --port 4200
```

Open `http://localhost:4200` — should see the default Angular welcome page. Stop the server with Ctrl+C.

- [ ] **Step 3: Verify tests pass**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: `Executed 1 of 1 SUCCESS` (the default AppComponent spec).

- [ ] **Step 4: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Angular 21 project with SSR"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install PrimeNG, govsa-ds, localize, primeicons**

```bash
cd /Users/krim/Documents/transport-frontend

npm install primeng @primeng/themes primeicons govsa-ds @angular/localize
```

Expected: no peer-dependency errors. PrimeNG 21, govsa-ds 1.1.2 installed.

- [ ] **Step 2: Add @angular/localize to polyfills**

Open `src/polyfills.ts` if it exists, or add to `src/main.ts` top:
```typescript
import '@angular/localize/init';
```

If `src/main.ts` already exists, add the import as the very first line.

- [ ] **Step 3: Add primeicons CSS to angular.json styles array**

Open `angular.json`. Find `"styles"` array under `projects.transport-frontend.architect.build.options`. Add:
```json
"styles": [
  "node_modules/primeicons/primeicons.css",
  "src/styles.scss"
]
```

- [ ] **Step 4: Verify build still works**

```bash
npx ng build --configuration=development
```

Expected: `Build at: ... - Time: ...ms` with no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json angular.json src/main.ts
git commit -m "feat: install PrimeNG, govsa-ds, primeicons, localize"
```

---

## Task 3: Configure Design System

**Files:**
- Create: `src/styles/_govsa-tokens.scss`
- Create: `src/styles/_primeng-theme.scss`
- Create: `src/styles/_premium.scss`
- Modify: `src/styles.scss`
- Modify: `src/index.html`

- [ ] **Step 1: Create the styles directory and GOV.SA tokens file**

Create `src/styles/_govsa-tokens.scss`:
```scss
// GOV.SA Design System — CSS Custom Properties
// Source: govsa-ds v1.1.2 brand palette
// Bootstrap CSS is NOT imported — tokens only

:root {
  // Brand colors
  --govsa-primary:       #1B3A6B;
  --govsa-primary-hover: #162F58;
  --govsa-primary-light: #E8EDF5;
  --govsa-secondary:     #C8A951;
  --govsa-secondary-hover: #B5963E;

  // Surfaces
  --govsa-bg:            #FFFFFF;
  --govsa-surface:       #F5F7FA;
  --govsa-surface-hover: #EEF1F6;

  // Text
  --govsa-text:          #1A1A2E;
  --govsa-text-muted:    #64748B;
  --govsa-text-inverse:  #FFFFFF;

  // Borders
  --govsa-border:        #E2E8F0;
  --govsa-border-focus:  #1B3A6B;

  // Semantic
  --govsa-success:       #22C55E;
  --govsa-success-light: #DCFCE7;
  --govsa-warning:       #F59E0B;
  --govsa-warning-light: #FEF3C7;
  --govsa-danger:        #EF4444;
  --govsa-danger-light:  #FEE2E2;
  --govsa-info:          #3B82F6;
  --govsa-info-light:    #DBEAFE;

  // Shape
  --govsa-radius:        8px;
  --govsa-radius-lg:     12px;
  --govsa-radius-xl:     16px;

  // Typography
  --govsa-font:          'IBM Plex Sans Arabic', sans-serif;
  --govsa-font-size-xs:  0.75rem;
  --govsa-font-size-sm:  0.875rem;
  --govsa-font-size-md:  1rem;
  --govsa-font-size-lg:  1.125rem;
  --govsa-font-size-xl:  1.25rem;
  --govsa-font-size-2xl: 1.5rem;
  --govsa-font-size-3xl: 1.875rem;

  // Shadows
  --govsa-shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
  --govsa-shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --govsa-shadow-md:  0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  --govsa-shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.05);

  // Spacing (8px grid)
  --govsa-space-1:  0.25rem;
  --govsa-space-2:  0.5rem;
  --govsa-space-3:  0.75rem;
  --govsa-space-4:  1rem;
  --govsa-space-5:  1.25rem;
  --govsa-space-6:  1.5rem;
  --govsa-space-8:  2rem;
  --govsa-space-10: 2.5rem;
  --govsa-space-12: 3rem;
  --govsa-space-16: 4rem;

  // Sidebar
  --govsa-sidebar-width: 240px;
  --govsa-header-height: 64px;
  --govsa-bottom-nav-height: 64px;

  // Transitions
  --govsa-transition: all 0.2s ease;
  --govsa-transition-fast: all 0.15s ease;
}
```

- [ ] **Step 2: Create the PrimeNG theme file**

Create `src/styles/_primeng-theme.scss`:
```scss
// Custom PrimeNG preset using GOV.SA tokens
// Applied in app.config.ts via definePreset(Aura, govSAPreset)
// This file documents the preset — actual JS object lives in app.config.ts

// Note: PrimeNG 21 themes are configured in TypeScript (app.config.ts),
// not via SCSS. This file holds component-level PrimeNG overrides only.

// Override PrimeNG component variables to use our tokens
:root {
  --p-primary-color: var(--govsa-primary);
  --p-primary-hover-color: var(--govsa-primary-hover);
  --p-content-border-radius: var(--govsa-radius);
  --p-font-family: var(--govsa-font);
}

// Input fields
.p-inputtext {
  font-family: var(--govsa-font);
  border-radius: var(--govsa-radius);
  border-color: var(--govsa-border);
  color: var(--govsa-text);

  &:focus {
    border-color: var(--govsa-primary);
    box-shadow: 0 0 0 3px var(--govsa-primary-light);
  }
}

// Buttons
.p-button {
  font-family: var(--govsa-font);
  font-weight: 500;
  border-radius: var(--govsa-radius);
  transition: var(--govsa-transition);

  &.p-button-primary {
    background: var(--govsa-primary);
    border-color: var(--govsa-primary);

    &:hover:not(:disabled) {
      background: var(--govsa-primary-hover);
      border-color: var(--govsa-primary-hover);
    }
  }
}

// Cards / Panels
.p-card {
  border-radius: var(--govsa-radius-lg);
  box-shadow: var(--govsa-shadow-sm);
  border: 1px solid var(--govsa-border);
}

// Dropdowns
.p-dropdown {
  border-radius: var(--govsa-radius);
  border-color: var(--govsa-border);
}

// DataTable
.p-datatable {
  .p-datatable-header {
    background: var(--govsa-surface);
    border-color: var(--govsa-border);
  }
  .p-datatable-thead > tr > th {
    background: var(--govsa-surface);
    color: var(--govsa-text-muted);
    font-weight: 600;
    font-size: var(--govsa-font-size-sm);
  }
}

// Toast
.p-toast {
  font-family: var(--govsa-font);
}
```

- [ ] **Step 3: Create the premium polish file**

Create `src/styles/_premium.scss`:
```scss
// Premium layer — hover effects, depth, polish
// Does not override GOV.SA brand colors

// Clickable card lift on hover
.card-hover {
  transition: var(--govsa-transition);
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--govsa-shadow-lg);
    border-color: var(--govsa-primary-light);
  }
}

// Smooth focus outline for interactive elements
*:focus-visible {
  outline: 2px solid var(--govsa-primary);
  outline-offset: 2px;
  border-radius: var(--govsa-radius);
}

// Remove default focus for mouse users
*:focus:not(:focus-visible) {
  outline: none;
}

// Page transitions
.page-enter {
  animation: fadeSlideIn 0.2s ease forwards;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Skeleton shimmer animation
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--govsa-surface) 25%,
    var(--govsa-border) 37%,
    var(--govsa-surface) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: var(--govsa-radius);
}
```

- [ ] **Step 4: Update global styles.scss**

Replace the entire content of `src/styles.scss`:
```scss
// IBM Plex Sans Arabic
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

// GOV.SA design tokens
@import 'styles/govsa-tokens';

// PrimeNG overrides
@import 'styles/primeng-theme';

// Premium polish
@import 'styles/premium';

// Global resets & base
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--govsa-font);
  font-size: var(--govsa-font-size-md);
  color: var(--govsa-text);
  background-color: var(--govsa-surface);
  direction: rtl;
  text-align: right;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// Typography
h1, h2, h3, h4, h5, h6 {
  font-family: var(--govsa-font);
  font-weight: 600;
  color: var(--govsa-text);
  margin: 0;
}

h1 { font-size: var(--govsa-font-size-3xl); }
h2 { font-size: var(--govsa-font-size-2xl); }
h3 { font-size: var(--govsa-font-size-xl); }
h4 { font-size: var(--govsa-font-size-lg); }

p {
  margin: 0;
  line-height: 1.7;
}

a {
  color: var(--govsa-primary);
  text-decoration: none;
  transition: var(--govsa-transition-fast);

  &:hover {
    color: var(--govsa-primary-hover);
  }
}

// Layout utilities
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--govsa-space-4);
}

.page-content {
  padding: var(--govsa-space-6);

  @media (max-width: 767px) {
    padding: var(--govsa-space-4);
    padding-bottom: calc(var(--govsa-bottom-nav-height) + var(--govsa-space-4));
  }
}

// Scrollbar styling
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--govsa-surface);
}
::-webkit-scrollbar-thumb {
  background: var(--govsa-border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--govsa-text-muted);
}
```

- [ ] **Step 5: Update index.html**

Replace `src/index.html`:
```html
<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>منصة النقل البري</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <!-- IBM Plex Sans Arabic -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 6: Verify build**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng build --configuration=development
```

Expected: no SCSS errors, build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add src/styles.scss src/styles/ src/index.html
git commit -m "feat: configure GOV.SA design tokens, PrimeNG theme, RTL, IBM Plex Sans Arabic"
```

---

## Task 4: Configure PrimeNG in app.config.ts

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Update app.config.ts with PrimeNG provider and GOV.SA preset**

Replace `src/app/app.config.ts`:
```typescript
import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

const GovSAPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#E8EDF5',
      100: '#C5D0E6',
      200: '#9EAFD5',
      300: '#778DC4',
      400: '#5B75B8',
      500: '#1B3A6B',
      600: '#162F58',
      700: '#112447',
      800: '#0C1A36',
      900: '#071025',
      950: '#040A18',
    },
    colorScheme: {
      light: {
        primary: {
          color:         '#1B3A6B',
          inverseColor:  '#FFFFFF',
          hoverColor:    '#162F58',
          activeColor:   '#112447',
        },
        highlight: {
          background:      '#1B3A6B',
          focusBackground: '#162F58',
          color:           '#FFFFFF',
          focusColor:      '#FFFFFF',
        },
        surface: {
          ground: '#F5F7FA',
          section: '#FFFFFF',
          card: '#FFFFFF',
          overlay: '#FFFFFF',
          border: '#E2E8F0',
          hover: '#EEF1F6',
        },
      },
    },
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    borderRadius: {
      none: '0',
      xs:   '4px',
      sm:   '6px',
      md:   '8px',
      lg:   '12px',
      xl:   '16px',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: GovSAPreset,
        options: {
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
      ripple: true,
    }),
    MessageService,
  ],
};
```

- [ ] **Step 2: Create a placeholder interceptor so the build doesn't fail**

Create `src/app/core/auth/auth.interceptor.ts` (temporary stub — replaced fully in Task 9):
```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.config.ts src/app/core/auth/auth.interceptor.ts
git commit -m "feat: configure PrimeNG 21 with GOV.SA preset"
```

---

## Task 5: Core Models

**Files:**
- Create: `src/app/core/models/user.model.ts`

- [ ] **Step 1: Create the user model**

Create `src/app/core/models/user.model.ts`:
```typescript
export type UserRole = 'rider' | 'driver' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  nationality?: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/core/models/user.model.ts
git commit -m "feat: add core user models and types"
```

---

## Task 6: StorageService

**Files:**
- Create: `src/app/core/services/storage.service.ts`
- Create: `src/app/core/services/storage.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/services/storage.service.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  describe('in browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          StorageService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(StorageService);
      localStorage.clear();
    });

    it('should store and retrieve a value', () => {
      service.set('token', 'abc123');
      expect(service.get('token')).toBe('abc123');
    });

    it('should return null for missing key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });

    it('should remove a value', () => {
      service.set('token', 'abc123');
      service.remove('token');
      expect(service.get('token')).toBeNull();
    });

    it('should clear all values', () => {
      service.set('token', 'abc123');
      service.set('user', 'data');
      service.clear();
      expect(service.get('token')).toBeNull();
      expect(service.get('user')).toBeNull();
    });
  });

  describe('in server environment (SSR)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          StorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(StorageService);
    });

    it('should return null for get() on server', () => {
      expect(service.get('token')).toBeNull();
    });

    it('should not throw for set() on server', () => {
      expect(() => service.set('token', 'abc')).not.toThrow();
    });

    it('should not throw for remove() on server', () => {
      expect(() => service.remove('token')).not.toThrow();
    });

    it('should not throw for clear() on server', () => {
      expect(() => service.clear()).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/storage.service.spec.ts'
```

Expected: `FAILED — StorageService is not found / cannot read`

- [ ] **Step 3: Implement StorageService**

Create `src/app/core/services/storage.service.ts`:
```typescript
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(key: string): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (!this.isBrowser) return;
    localStorage.clear();
  }
}
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/storage.service.spec.ts'
```

Expected: `Executed 8 of 8 SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/storage.service.ts src/app/core/services/storage.service.spec.ts
git commit -m "feat: add SSR-safe StorageService"
```

---

## Task 7: AuthService

**Files:**
- Create: `src/app/core/auth/auth.service.ts`
- Create: `src/app/core/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/auth/auth.service.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import { StorageService } from '../services/storage.service';
import { User, AuthResponse } from '../models/user.model';

const mockUser: User = {
  id: 'u1',
  fullName: 'أحمد محمد',
  email: 'ahmed@test.com',
  role: 'rider',
  status: 'active',
};

const mockToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InUxIiwicm9sZSI6InJpZGVyIn0.abc';

describe('AuthService', () => {
  let service: AuthService;
  let storageSpy: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['get', 'set', 'remove', 'clear']);
    storageSpy.get.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should start with no user when storage is empty', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.role()).toBeUndefined();
  });

  it('should set currentUser and persist token after setSession', () => {
    const authResponse: AuthResponse = { access_token: mockToken, user: mockUser };

    service.setSession(authResponse);

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.role()).toBe('rider');
    expect(storageSpy.set).toHaveBeenCalledWith('access_token', mockToken);
    expect(storageSpy.set).toHaveBeenCalledWith('current_user', JSON.stringify(mockUser));
  });

  it('should clear user and storage after clearSession', () => {
    service.setSession({ access_token: mockToken, user: mockUser });
    service.clearSession();

    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
    expect(storageSpy.remove).toHaveBeenCalledWith('access_token');
    expect(storageSpy.remove).toHaveBeenCalledWith('current_user');
  });

  it('should return stored token', () => {
    storageSpy.get.and.callFake((key: string) =>
      key === 'access_token' ? mockToken : null
    );
    expect(service.getToken()).toBe(mockToken);
  });

  it('should restore session from storage on init', () => {
    storageSpy.get.and.callFake((key: string) => {
      if (key === 'current_user') return JSON.stringify(mockUser);
      if (key === 'access_token') return mockToken;
      return null;
    });

    const freshService = new AuthService(storageSpy);
    expect(freshService.currentUser()).toEqual(mockUser);
    expect(freshService.isLoggedIn()).toBeTrue();
  });

  it('should return correct redirect path for each role', () => {
    expect(service.getHomePath('rider')).toBe('/rider/home');
    expect(service.getHomePath('driver')).toBe('/driver/home');
    expect(service.getHomePath('admin')).toBe('/admin/dashboard');
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/auth.service.spec.ts'
```

Expected: `FAILED — AuthService is not defined`

- [ ] **Step 3: Implement AuthService**

Create `src/app/core/auth/auth.service.ts`:
```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, AuthResponse } from '../models/user.model';
import { StorageService } from '../services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);

  private _currentUser = signal<User | null>(this.loadUserFromStorage());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn  = computed(() => !!this._currentUser());
  readonly role        = computed(() => this._currentUser()?.role);

  constructor(storage?: StorageService) {
    // Allow direct injection in tests
    if (storage) this.storage = storage;
  }

  setSession(response: AuthResponse): void {
    this.storage.set('access_token', response.access_token);
    this.storage.set('current_user', JSON.stringify(response.user));
    this._currentUser.set(response.user);
  }

  clearSession(): void {
    this.storage.remove('access_token');
    this.storage.remove('current_user');
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return this.storage.get('access_token');
  }

  getHomePath(role: UserRole): string {
    const paths: Record<UserRole, string> = {
      rider:  '/rider/home',
      driver: '/driver/home',
      admin:  '/admin/dashboard',
    };
    return paths[role];
  }

  private loadUserFromStorage(): User | null {
    const raw = this.storage.get('current_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/auth.service.spec.ts'
```

Expected: `Executed 7 of 7 SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.service.ts src/app/core/auth/auth.service.spec.ts
git commit -m "feat: add signal-based AuthService with session persistence"
```

---

## Task 8: ApiService

**Files:**
- Create: `src/app/core/services/api.service.ts`
- Create: `src/app/core/services/api.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/services/api.service.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should make a GET request to the correct URL', (done) => {
    service.get<{ id: string }>('/trips').subscribe((res) => {
      expect(res).toEqual({ id: 'trip1' });
      done();
    });

    const req = http.expectOne('http://localhost:3000/api/v1/trips');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'trip1' });
  });

  it('should make a POST request with body', (done) => {
    service.post<{ id: string }>('/bookings', { tripId: 't1' }).subscribe((res) => {
      expect(res).toEqual({ id: 'booking1' });
      done();
    });

    const req = http.expectOne('http://localhost:3000/api/v1/bookings');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tripId: 't1' });
    req.flush({ id: 'booking1' });
  });

  it('should make a PATCH request', (done) => {
    service.patch<{ status: string }>('/bookings/b1', { status: 'confirmed' }).subscribe((res) => {
      expect(res).toEqual({ status: 'confirmed' });
      done();
    });

    const req = http.expectOne('http://localhost:3000/api/v1/bookings/b1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 'confirmed' });
  });

  it('should make a DELETE request', (done) => {
    service.delete<void>('/bookings/b1').subscribe(() => done());

    const req = http.expectOne('http://localhost:3000/api/v1/bookings/b1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/api.service.spec.ts'
```

Expected: `FAILED — ApiService is not defined`

- [ ] **Step 3: Implement ApiService**

Create `src/app/core/services/api.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }
}
```

- [ ] **Step 4: Update environments**

Create `src/environments/environment.ts` (replace existing):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};
```

Create `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
```

- [ ] **Step 5: Run the test — verify it passes**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/api.service.spec.ts'
```

Expected: `Executed 4 of 4 SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/api.service.ts src/app/core/services/api.service.spec.ts src/environments/
git commit -m "feat: add typed ApiService wrapping HttpClient"
```

---

## Task 9: ToastService

**Files:**
- Create: `src/app/core/services/toast.service.ts`

No unit test needed — ToastService is a thin wrapper around PrimeNG MessageService with no logic.

- [ ] **Step 1: Create ToastService**

Create `src/app/core/services/toast.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messages = inject(MessageService);

  success(detail: string, summary = 'تمّ بنجاح'): void {
    this.messages.add({ severity: 'success', summary, detail, life: 4000 });
  }

  error(detail: string, summary = 'حدث خطأ'): void {
    this.messages.add({ severity: 'error', summary, detail, life: 5000 });
  }

  warn(detail: string, summary = 'تنبيه'): void {
    this.messages.add({ severity: 'warn', summary, detail, life: 4000 });
  }

  info(detail: string, summary = 'معلومة'): void {
    this.messages.add({ severity: 'info', summary, detail, life: 4000 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/core/services/toast.service.ts
git commit -m "feat: add Arabic ToastService wrapping PrimeNG MessageService"
```

---

## Task 10: Auth Interceptor

**Files:**
- Modify: `src/app/core/auth/auth.interceptor.ts` (replace stub from Task 4)
- Create: `src/app/core/auth/auth.interceptor.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/auth/auth.interceptor.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';
import { authInterceptor } from './auth.interceptor';
import { ApiService } from '../services/api.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let api: ApiService;

  beforeEach(() => {
    authSpy  = jasmine.createSpyObj('AuthService', ['getToken', 'clearSession']);
    toastSpy = jasmine.createSpyObj('ToastService', ['error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService,  useValue: authSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: Router,       useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    api  = TestBed.inject(ApiService);
  });

  afterEach(() => http.verify());

  it('should attach Authorization header when token exists', () => {
    authSpy.getToken.and.returnValue('mytoken');

    api.get('/trips').subscribe();

    const req = http.expectOne('http://localhost:3000/api/v1/trips');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mytoken');
    req.flush([]);
  });

  it('should not attach Authorization header when no token', () => {
    authSpy.getToken.and.returnValue(null);

    api.get('/trips').subscribe();

    const req = http.expectOne('http://localhost:3000/api/v1/trips');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('should clear session and redirect to /login on 401', () => {
    authSpy.getToken.and.returnValue('expiredtoken');

    api.get('/trips').subscribe({ error: () => {} });

    const req = http.expectOne('http://localhost:3000/api/v1/trips');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authSpy.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should show toast error on 403', () => {
    authSpy.getToken.and.returnValue('validtoken');

    api.get('/admin/dashboard').subscribe({ error: () => {} });

    const req = http.expectOne('http://localhost:3000/api/v1/admin/dashboard');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(toastSpy.error).toHaveBeenCalledWith('غير مصرح لك بهذا الإجراء');
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/auth.interceptor.spec.ts'
```

Expected: `FAILED — interceptor doesn't do anything yet`

- [ ] **Step 3: Implement the auth interceptor**

Replace `src/app/core/auth/auth.interceptor.ts`:
```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, catchError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const toast  = inject(ToastService);
  const router = inject(Router);

  const token = auth.getToken();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.clearSession();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        toast.error('غير مصرح لك بهذا الإجراء');
      }
      return throwError(() => error);
    }),
  );
};
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/auth.interceptor.spec.ts'
```

Expected: `Executed 4 of 4 SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.interceptor.ts src/app/core/auth/auth.interceptor.spec.ts
git commit -m "feat: add auth interceptor with 401/403 handling"
```

---

## Task 11: Route Guards

**Files:**
- Create: `src/app/core/auth/guards/auth.guard.ts`
- Create: `src/app/core/auth/guards/rider.guard.ts`
- Create: `src/app/core/auth/guards/driver.guard.ts`
- Create: `src/app/core/auth/guards/admin.guard.ts`
- Create: `src/app/core/auth/guards/guards.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/core/auth/guards/guards.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth.service';
import { authGuard }   from './auth.guard';
import { riderGuard }  from './rider.guard';
import { driverGuard } from './driver.guard';
import { adminGuard }  from './admin.guard';

function runGuard(
  guard: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => unknown,
  authSpy: jasmine.SpyObj<AuthService>,
  routerSpy: jasmine.SpyObj<Router>,
): unknown {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url: '/test' } as RouterStateSnapshot)
  );
}

describe('Route Guards', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authSpy   = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'role', 'currentUser']);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree', 'parseUrl']);
    routerSpy.parseUrl.and.callFake((url: string) => ({ toString: () => url } as any));
    routerSpy.createUrlTree.and.callFake((commands: string[]) => ({ toString: () => commands.join('/') } as any));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  describe('authGuard', () => {
    it('should allow access when logged in', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      const result = runGuard(authGuard, authSpy, routerSpy);
      expect(result).toBeTrue();
    });

    it('should redirect to /login when not logged in', () => {
      authSpy.isLoggedIn.and.returnValue(false);
      const result = runGuard(authGuard, authSpy, routerSpy);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('riderGuard', () => {
    it('should allow access for rider role', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('rider');
      const result = runGuard(riderGuard, authSpy, routerSpy);
      expect(result).toBeTrue();
    });

    it('should redirect to /login when not logged in', () => {
      authSpy.isLoggedIn.and.returnValue(false);
      runGuard(riderGuard, authSpy, routerSpy);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
    });

    it('should redirect driver to /driver/home', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('driver');
      runGuard(riderGuard, authSpy, routerSpy);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/driver/home']);
    });
  });

  describe('driverGuard', () => {
    it('should allow access for driver role', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('driver');
      const result = runGuard(driverGuard, authSpy, routerSpy);
      expect(result).toBeTrue();
    });

    it('should redirect rider to /rider/home', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('rider');
      runGuard(driverGuard, authSpy, routerSpy);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/rider/home']);
    });
  });

  describe('adminGuard', () => {
    it('should allow access for admin role', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('admin');
      const result = runGuard(adminGuard, authSpy, routerSpy);
      expect(result).toBeTrue();
    });

    it('should redirect rider to /rider/home', () => {
      authSpy.isLoggedIn.and.returnValue(true);
      authSpy.role.and.returnValue('rider');
      runGuard(adminGuard, authSpy, routerSpy);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/rider/home']);
    });
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/guards.spec.ts'
```

Expected: `FAILED — guard files not found`

- [ ] **Step 3: Create authGuard**

Create `src/app/core/auth/guards/auth.guard.ts`:
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

- [ ] **Step 4: Create riderGuard**

Create `src/app/core/auth/guards/rider.guard.ts`:
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const riderGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  const role = auth.role();
  if (role === 'rider') return true;

  const redirects: Record<string, string> = { driver: '/driver/home', admin: '/admin/dashboard' };
  return router.createUrlTree([redirects[role!] ?? '/login']);
};
```

- [ ] **Step 5: Create driverGuard**

Create `src/app/core/auth/guards/driver.guard.ts`:
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const driverGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  const role = auth.role();
  if (role === 'driver') return true;

  const redirects: Record<string, string> = { rider: '/rider/home', admin: '/admin/dashboard' };
  return router.createUrlTree([redirects[role!] ?? '/login']);
};
```

- [ ] **Step 6: Create adminGuard**

Create `src/app/core/auth/guards/admin.guard.ts`:
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/admin/login']);

  const role = auth.role();
  if (role === 'admin') return true;

  const redirects: Record<string, string> = { rider: '/rider/home', driver: '/driver/home' };
  return router.createUrlTree([redirects[role!] ?? '/login']);
};
```

- [ ] **Step 7: Run the tests — verify they pass**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/guards.spec.ts'
```

Expected: `Executed 8 of 8 SUCCESS`

- [ ] **Step 8: Commit**

```bash
git add src/app/core/auth/guards/
git commit -m "feat: add role-based route guards (auth, rider, driver, admin)"
```

---

## Task 12: Auth Feature — Repository & Service

**Files:**
- Create: `src/app/features/auth/models/auth.models.ts`
- Create: `src/app/features/auth/data/auth.repository.ts`
- Create: `src/app/features/auth/data/auth.repository.spec.ts`
- Create: `src/app/features/auth/services/auth-feature.service.ts`
- Create: `src/app/features/auth/services/auth-feature.service.spec.ts`

- [ ] **Step 1: Create auth domain models**

Create `src/app/features/auth/models/auth.models.ts`:
```typescript
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterRiderDto {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  nationality?: string;
}

export interface RegisterDriverDto {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  nationality?: string;
  idNumber?: string;
}
```

- [ ] **Step 2: Write the failing repository test**

Create `src/app/features/auth/data/auth.repository.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthRepository } from './auth.repository';
import { ApiService } from '../../../core/services/api.service';

describe('AuthRepository', () => {
  let repo: AuthRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthRepository,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    repo = TestBed.inject(AuthRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call POST /auth/login', (done) => {
    repo.login({ email: 'test@test.com', password: 'pass' }).subscribe(() => done());
    const req = http.expectOne('http://localhost:3000/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@test.com', password: 'pass' });
    req.flush({ access_token: 'tok', user: { id: 'u1', role: 'rider' } });
  });

  it('should call POST /auth/register for rider', (done) => {
    repo.registerRider({ fullName: 'Ahmed', email: 'a@b.com', password: 'pass', phone: '05001' }).subscribe(() => done());
    const req = http.expectOne('http://localhost:3000/api/v1/auth/register');
    expect(req.request.body).toMatchObject({ fullName: 'Ahmed', role: 'rider' });
    req.flush({ access_token: 'tok', user: { id: 'u1', role: 'rider' } });
  });

  it('should call POST /auth/register for driver', (done) => {
    repo.registerDriver({ fullName: 'Ali', email: 'a@b.com', password: 'pass', phone: '05002' }).subscribe(() => done());
    const req = http.expectOne('http://localhost:3000/api/v1/auth/register');
    expect(req.request.body).toMatchObject({ fullName: 'Ali', role: 'driver' });
    req.flush({ access_token: 'tok', user: { id: 'u2', role: 'driver' } });
  });
});
```

- [ ] **Step 3: Implement AuthRepository**

Create `src/app/features/auth/data/auth.repository.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthResponse } from '../../../core/models/user.model';
import { LoginDto, RegisterRiderDto, RegisterDriverDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthRepository {
  private api = inject(ApiService);

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', dto);
  }

  registerRider(dto: RegisterRiderDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', { ...dto, role: 'rider' });
  }

  registerDriver(dto: RegisterDriverDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', { ...dto, role: 'driver' });
  }
}
```

- [ ] **Step 4: Write the failing service test**

Create `src/app/features/auth/services/auth-feature.service.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFeatureService } from './auth-feature.service';
import { AuthRepository } from '../data/auth.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthResponse } from '../../../core/models/user.model';

const mockResponse: AuthResponse = {
  access_token: 'tok',
  user: { id: 'u1', fullName: 'Ahmed', email: 'a@b.com', role: 'rider', status: 'active' },
};

describe('AuthFeatureService', () => {
  let service: AuthFeatureService;
  let repoSpy:   jasmine.SpyObj<AuthRepository>;
  let authSpy:   jasmine.SpyObj<AuthService>;
  let toastSpy:  jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    repoSpy   = jasmine.createSpyObj('AuthRepository', ['login', 'registerRider', 'registerDriver']);
    authSpy   = jasmine.createSpyObj('AuthService', ['setSession', 'getHomePath']);
    toastSpy  = jasmine.createSpyObj('ToastService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authSpy.getHomePath.and.returnValue('/rider/home');

    TestBed.configureTestingModule({
      providers: [
        AuthFeatureService,
        { provide: AuthRepository, useValue: repoSpy },
        { provide: AuthService,    useValue: authSpy },
        { provide: ToastService,   useValue: toastSpy },
        { provide: Router,         useValue: routerSpy },
      ],
    });
    service = TestBed.inject(AuthFeatureService);
  });

  it('should call login, set session, show success, and navigate', () => {
    repoSpy.login.and.returnValue(of(mockResponse));

    service.login({ email: 'a@b.com', password: 'pass' });

    expect(authSpy.setSession).toHaveBeenCalledWith(mockResponse);
    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/rider/home']);
  });

  it('should show error toast on login failure', () => {
    repoSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'Invalid credentials' } }))
    );

    service.login({ email: 'a@b.com', password: 'wrong' });

    expect(toastSpy.error).toHaveBeenCalledWith('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  });

  it('should handle API validation errors (400) as array messages', () => {
    repoSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: ['email must be an email'] } }))
    );

    service.login({ email: 'bad', password: 'pass' });

    expect(toastSpy.error).toHaveBeenCalledWith('email must be an email');
  });

  it('should track loading state during login', (done) => {
    repoSpy.login.and.returnValue(of(mockResponse));

    const loadingStates: boolean[] = [];
    service.loading$.subscribe(v => loadingStates.push(v));

    service.login({ email: 'a@b.com', password: 'pass' });

    setTimeout(() => {
      expect(loadingStates).toContain(true);
      done();
    });
  });
});
```

- [ ] **Step 5: Implement AuthFeatureService**

Create `src/app/features/auth/services/auth-feature.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthRepository } from '../data/auth.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginDto, RegisterRiderDto, RegisterDriverDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
  private repo   = inject(AuthRepository);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  private _loading = new BehaviorSubject(false);
  readonly loading$ = this._loading.asObservable();

  login(dto: LoginDto): void {
    this._loading.next(true);
    this.repo.login(dto).subscribe({
      next: (response) => {
        this._loading.next(false);
        this.auth.setSession(response);
        this.toast.success(`مرحباً ${response.user.fullName}`);
        this.router.navigate([this.auth.getHomePath(response.user.role)]);
      },
      error: (err: HttpErrorResponse) => {
        this._loading.next(false);
        this.toast.error(this.parseError(err, 'البريد الإلكتروني أو كلمة المرور غير صحيحة'));
      },
    });
  }

  registerRider(dto: RegisterRiderDto): void {
    this._loading.next(true);
    this.repo.registerRider(dto).subscribe({
      next: (response) => {
        this._loading.next(false);
        this.auth.setSession(response);
        this.toast.success('تم إنشاء حسابك بنجاح');
        this.router.navigate(['/rider/home']);
      },
      error: (err: HttpErrorResponse) => {
        this._loading.next(false);
        this.toast.error(this.parseError(err, 'فشل إنشاء الحساب'));
      },
    });
  }

  registerDriver(dto: RegisterDriverDto): void {
    this._loading.next(true);
    this.repo.registerDriver(dto).subscribe({
      next: (response) => {
        this._loading.next(false);
        this.auth.setSession(response);
        this.toast.success('تم تقديم طلبك بنجاح، سيتم مراجعته قريباً');
        this.router.navigate(['/driver/home']);
      },
      error: (err: HttpErrorResponse) => {
        this._loading.next(false);
        this.toast.error(this.parseError(err, 'فشل إنشاء الحساب'));
      },
    });
  }

  private parseError(err: HttpErrorResponse, fallback: string): string {
    const msg = err.error?.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === 'string') return msg;
    return fallback;
  }
}
```

- [ ] **Step 6: Run the tests — verify they pass**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/auth.repository.spec.ts' --include='**/auth-feature.service.spec.ts'
```

Expected: `Executed 7 of 7 SUCCESS`

- [ ] **Step 7: Commit**

```bash
git add src/app/features/auth/
git commit -m "feat: add auth feature (models, repository, service)"
```

---

## Task 13: Auth Components

**Files:**
- Create: `src/app/features/auth/components/login/login.component.ts`
- Create: `src/app/features/auth/components/login/login.component.html`
- Create: `src/app/features/auth/components/login/login.component.scss`
- Create: `src/app/features/auth/components/login/login.component.spec.ts`
- Create: `src/app/features/auth/components/register-shell/register-shell.component.ts`
- Create: `src/app/features/auth/components/register-shell/register-shell.component.html`
- Create: `src/app/features/auth/components/rider-register/rider-register.component.ts`
- Create: `src/app/features/auth/components/rider-register/rider-register.component.html`
- Create: `src/app/features/auth/components/driver-register/driver-register.component.ts`
- Create: `src/app/features/auth/components/driver-register/driver-register.component.html`
- Create: `src/app/features/auth/auth.routes.ts`

- [ ] **Step 1: Write the failing login component test**

Create `src/app/features/auth/components/login/login.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthFeatureService } from '../../services/auth-feature.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let serviceSpy: jasmine.SpyObj<AuthFeatureService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AuthFeatureService', ['login']);
    (serviceSpy as any).loading$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [{ provide: AuthFeatureService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('should mark form valid with correct inputs', () => {
    component.form.setValue({ email: 'test@test.com', password: 'Pass1234!' });
    expect(component.form.valid).toBeTrue();
  });

  it('should call authService.login when form is submitted and valid', () => {
    component.form.setValue({ email: 'test@test.com', password: 'Pass1234!' });
    component.onSubmit();
    expect(serviceSpy.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'Pass1234!' });
  });

  it('should not call login when form is invalid', () => {
    component.onSubmit();
    expect(serviceSpy.login).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Create LoginComponent**

Create `src/app/features/auth/components/login/login.component.ts`:
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { AuthFeatureService } from '../../services/auth-feature.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    AsyncPipe,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  authService = inject(AuthFeatureService);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.authService.login(this.form.getRawValue() as { email: string; password: string });
  }
}
```

Create `src/app/features/auth/components/login/login.component.html`:
```html
<p-toast />

<div class="login-page">
  <div class="login-card">
    <!-- Logo / Brand -->
    <div class="login-header">
      <div class="brand-logo">
        <i class="pi pi-car" style="font-size: 2rem; color: var(--govsa-primary)"></i>
      </div>
      <h1 class="login-title">تسجيل الدخول</h1>
      <p class="login-subtitle">أدخل بيانات حسابك للمتابعة</p>
    </div>

    <!-- Form -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form" novalidate>

      <!-- Email -->
      <div class="field">
        <label for="email">البريد الإلكتروني</label>
        <input
          pInputText
          id="email"
          type="email"
          formControlName="email"
          placeholder="example@email.com"
          dir="ltr"
          [class.ng-invalid]="form.controls.email.invalid && form.controls.email.touched"
          class="w-full"
        />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <small class="field-error">
            @if (form.controls.email.hasError('required')) { البريد الإلكتروني مطلوب }
            @if (form.controls.email.hasError('email')) { صيغة البريد الإلكتروني غير صحيحة }
          </small>
        }
      </div>

      <!-- Password -->
      <div class="field">
        <label for="password">كلمة المرور</label>
        <p-password
          inputId="password"
          formControlName="password"
          placeholder="كلمة المرور"
          [feedback]="false"
          [toggleMask]="true"
          styleClass="w-full"
          inputStyleClass="w-full"
          [class.ng-invalid]="form.controls.password.invalid && form.controls.password.touched"
        />
        @if (form.controls.password.invalid && form.controls.password.touched) {
          <small class="field-error">كلمة المرور مطلوبة (6 أحرف على الأقل)</small>
        }
      </div>

      <!-- Submit -->
      <p-button
        type="submit"
        label="دخول"
        icon="pi pi-sign-in"
        styleClass="w-full"
        [loading]="(authService.loading$ | async) ?? false"
        [disabled]="form.invalid"
      />

    </form>

    <!-- Register link -->
    <div class="login-footer">
      <span>ليس لديك حساب؟</span>
      <a routerLink="/register" class="register-link">سجّل الآن</a>
    </div>
  </div>
</div>
```

Create `src/app/features/auth/components/login/login.component.scss`:
```scss
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--govsa-surface);
  padding: var(--govsa-space-4);
}

.login-card {
  background: var(--govsa-bg);
  border-radius: var(--govsa-radius-xl);
  box-shadow: var(--govsa-shadow-lg);
  border: 1px solid var(--govsa-border);
  padding: var(--govsa-space-10) var(--govsa-space-8);
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
  margin-bottom: var(--govsa-space-8);
}

.brand-logo {
  width: 64px;
  height: 64px;
  background: var(--govsa-primary-light);
  border-radius: var(--govsa-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--govsa-space-4);
}

.login-title {
  font-size: var(--govsa-font-size-2xl);
  font-weight: 700;
  color: var(--govsa-text);
  margin-bottom: var(--govsa-space-2);
}

.login-subtitle {
  color: var(--govsa-text-muted);
  font-size: var(--govsa-font-size-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--govsa-space-5);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--govsa-space-2);

  label {
    font-weight: 500;
    font-size: var(--govsa-font-size-sm);
    color: var(--govsa-text);
  }
}

.field-error {
  color: var(--govsa-danger);
  font-size: var(--govsa-font-size-xs);
}

.login-footer {
  margin-top: var(--govsa-space-6);
  text-align: center;
  color: var(--govsa-text-muted);
  font-size: var(--govsa-font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--govsa-space-2);
}

.register-link {
  color: var(--govsa-primary);
  font-weight: 600;

  &:hover {
    color: var(--govsa-primary-hover);
  }
}
```

- [ ] **Step 3: Create RegisterShellComponent**

Create `src/app/features/auth/components/register-shell/register-shell.component.ts`:
```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-register-shell',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './register-shell.component.html',
})
export class RegisterShellComponent {}
```

Create `src/app/features/auth/components/register-shell/register-shell.component.html`:
```html
<div class="register-shell">
  <div class="register-header">
    <h1>من أنت؟</h1>
    <p>اختر نوع الحساب للمتابعة</p>
  </div>

  <div class="role-cards">
    <!-- Rider card -->
    <a routerLink="/register/rider" class="role-card card-hover">
      <div class="role-icon rider">
        <i class="pi pi-user" style="font-size: 2.5rem"></i>
      </div>
      <div class="role-info">
        <h2>راكب</h2>
        <p>احجز رحلاتك وتنقل بسهولة</p>
      </div>
      <i class="pi pi-arrow-left role-arrow"></i>
    </a>

    <!-- Driver card -->
    <a routerLink="/register/driver" class="role-card card-hover">
      <div class="role-icon driver">
        <i class="pi pi-car" style="font-size: 2.5rem"></i>
      </div>
      <div class="role-info">
        <h2>سائق</h2>
        <p>قدّم للانضمام كسائق وابدأ رحلتك</p>
      </div>
      <i class="pi pi-arrow-left role-arrow"></i>
    </a>
  </div>

  <div class="back-link">
    <span>لديك حساب؟</span>
    <a routerLink="/login">سجّل دخولك</a>
  </div>
</div>
```

- [ ] **Step 4: Create RiderRegisterComponent**

Create `src/app/features/auth/components/rider-register/rider-register.component.ts`:
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { AuthFeatureService } from '../../services/auth-feature.service';

@Component({
  selector: 'app-rider-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AsyncPipe, ButtonModule, InputTextModule, PasswordModule, ToastModule],
  templateUrl: './rider-register.component.html',
})
export class RiderRegisterComponent {
  private fb = inject(FormBuilder);
  authService = inject(AuthFeatureService);

  form = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(3)]],
    email:       ['', [Validators.required, Validators.email]],
    password:    ['', [Validators.required, Validators.minLength(8)]],
    phone:       ['', [Validators.required]],
    nationality: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const { fullName, email, password, phone, nationality } = this.form.getRawValue();
    this.authService.registerRider({ fullName: fullName!, email: email!, password: password!, phone: phone!, nationality: nationality ?? undefined });
  }
}
```

Create `src/app/features/auth/components/rider-register/rider-register.component.html`:
```html
<p-toast />

<div class="register-page">
  <div class="register-card">
    <div class="register-header">
      <a routerLink="/register" class="back-btn">
        <i class="pi pi-arrow-right"></i>
        <span>رجوع</span>
      </a>
      <h1>حساب راكب جديد</h1>
      <p>أدخل بياناتك لإنشاء حسابك</p>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="register-form" novalidate>

      <div class="field">
        <label for="fullName">الاسم الكامل</label>
        <input pInputText id="fullName" type="text" formControlName="fullName" placeholder="محمد أحمد العمري" class="w-full" />
        @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
          <small class="field-error">الاسم الكامل مطلوب (3 أحرف على الأقل)</small>
        }
      </div>

      <div class="field">
        <label for="email">البريد الإلكتروني</label>
        <input pInputText id="email" type="email" formControlName="email" placeholder="example@email.com" dir="ltr" class="w-full" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <small class="field-error">أدخل بريداً إلكترونياً صحيحاً</small>
        }
      </div>

      <div class="field">
        <label for="phone">رقم الجوال</label>
        <input pInputText id="phone" type="tel" formControlName="phone" placeholder="05xxxxxxxx" dir="ltr" class="w-full" />
        @if (form.controls.phone.invalid && form.controls.phone.touched) {
          <small class="field-error">رقم الجوال مطلوب</small>
        }
      </div>

      <div class="field">
        <label for="nationality">الجنسية (اختياري)</label>
        <input pInputText id="nationality" type="text" formControlName="nationality" placeholder="سعودي" class="w-full" />
      </div>

      <div class="field">
        <label for="password">كلمة المرور</label>
        <p-password inputId="password" formControlName="password" placeholder="8 أحرف على الأقل" [feedback]="true" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
        @if (form.controls.password.invalid && form.controls.password.touched) {
          <small class="field-error">كلمة المرور يجب أن تكون 8 أحرف على الأقل</small>
        }
      </div>

      <p-button type="submit" label="إنشاء الحساب" icon="pi pi-user-plus" styleClass="w-full" [loading]="(authService.loading$ | async) ?? false" [disabled]="form.invalid" />

    </form>
  </div>
</div>
```

- [ ] **Step 5: Create DriverRegisterComponent**

Create `src/app/features/auth/components/driver-register/driver-register.component.ts`:
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { AuthFeatureService } from '../../services/auth-feature.service';

@Component({
  selector: 'app-driver-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AsyncPipe, ButtonModule, InputTextModule, PasswordModule, ToastModule],
  templateUrl: './driver-register.component.html',
})
export class DriverRegisterComponent {
  private fb = inject(FormBuilder);
  authService = inject(AuthFeatureService);

  form = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(3)]],
    email:       ['', [Validators.required, Validators.email]],
    password:    ['', [Validators.required, Validators.minLength(8)]],
    phone:       ['', [Validators.required]],
    nationality: [''],
    idNumber:    [''],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const { fullName, email, password, phone, nationality, idNumber } = this.form.getRawValue();
    this.authService.registerDriver({ fullName: fullName!, email: email!, password: password!, phone: phone!, nationality: nationality ?? undefined, idNumber: idNumber ?? undefined });
  }
}
```

Create `src/app/features/auth/components/driver-register/driver-register.component.html`:
```html
<p-toast />

<div class="register-page">
  <div class="register-card">
    <div class="register-header">
      <a routerLink="/register" class="back-btn">
        <i class="pi pi-arrow-right"></i>
        <span>رجوع</span>
      </a>
      <h1>التقدم كسائق</h1>
      <p>أدخل بياناتك وسنراجع طلبك في أقرب وقت</p>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="register-form" novalidate>

      <div class="field">
        <label for="fullName">الاسم الكامل</label>
        <input pInputText id="fullName" type="text" formControlName="fullName" placeholder="محمد أحمد العمري" class="w-full" />
        @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
          <small class="field-error">الاسم الكامل مطلوب (3 أحرف على الأقل)</small>
        }
      </div>

      <div class="field">
        <label for="email">البريد الإلكتروني</label>
        <input pInputText id="email" type="email" formControlName="email" placeholder="example@email.com" dir="ltr" class="w-full" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <small class="field-error">أدخل بريداً إلكترونياً صحيحاً</small>
        }
      </div>

      <div class="field">
        <label for="phone">رقم الجوال</label>
        <input pInputText id="phone" type="tel" formControlName="phone" placeholder="05xxxxxxxx" dir="ltr" class="w-full" />
        @if (form.controls.phone.invalid && form.controls.phone.touched) {
          <small class="field-error">رقم الجوال مطلوب</small>
        }
      </div>

      <div class="field">
        <label for="idNumber">رقم الهوية (اختياري)</label>
        <input pInputText id="idNumber" type="text" formControlName="idNumber" placeholder="1xxxxxxxxx" dir="ltr" class="w-full" />
      </div>

      <div class="field">
        <label for="nationality">الجنسية (اختياري)</label>
        <input pInputText id="nationality" type="text" formControlName="nationality" placeholder="سعودي" class="w-full" />
      </div>

      <div class="field">
        <label for="password">كلمة المرور</label>
        <p-password inputId="password" formControlName="password" placeholder="8 أحرف على الأقل" [feedback]="true" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
        @if (form.controls.password.invalid && form.controls.password.touched) {
          <small class="field-error">كلمة المرور يجب أن تكون 8 أحرف على الأقل</small>
        }
      </div>

      <div class="notice-box">
        <i class="pi pi-info-circle"></i>
        <span>بعد إنشاء الحساب ستحتاج لرفع وثائقك (رخصة القيادة، الهوية) للمراجعة والموافقة.</span>
      </div>

      <p-button type="submit" label="تقديم الطلب" icon="pi pi-send" styleClass="w-full" [loading]="(authService.loading$ | async) ?? false" [disabled]="form.invalid" />

    </form>
  </div>
</div>
```

- [ ] **Step 6: Create auth.routes.ts**

Create `src/app/features/auth/auth.routes.ts`:
```typescript
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register-shell/register-shell.component').then(m => m.RegisterShellComponent),
  },
  {
    path: 'register/rider',
    loadComponent: () =>
      import('./components/rider-register/rider-register.component').then(m => m.RiderRegisterComponent),
  },
  {
    path: 'register/driver',
    loadComponent: () =>
      import('./components/driver-register/driver-register.component').then(m => m.DriverRegisterComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
];
```

- [ ] **Step 7: Run the login component test**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/login.component.spec.ts'
```

Expected: `Executed 5 of 5 SUCCESS`

- [ ] **Step 8: Commit**

```bash
git add src/app/features/auth/
git commit -m "feat: add auth components (login, register shell, rider/driver register)"
```

---

## Task 14: Shared Components

**Files:** All `src/app/shared/components/` files listed in the file map.

- [ ] **Step 1: Create AppBadgeComponent**

Create `src/app/shared/components/app-badge/app-badge.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus = 'confirmed' | 'pending' | 'cancelled' | 'paid' | 'in_progress' | 'scheduled' | 'completed' | 'approved' | 'suspended' | 'active';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="app-badge" [class]="'badge--' + status">
      {{ label }}
    </span>
  `,
  styleUrl: './app-badge.component.scss',
})
export class AppBadgeComponent {
  @Input({ required: true }) status!: BadgeStatus;

  get label(): string {
    const labels: Record<BadgeStatus, string> = {
      confirmed:   'مؤكد',
      pending:     'قيد الانتظار',
      cancelled:   'ملغي',
      paid:        'مدفوع',
      in_progress: 'جارٍ',
      scheduled:   'مجدول',
      completed:   'مكتمل',
      approved:    'معتمد',
      suspended:   'موقوف',
      active:      'نشط',
    };
    return labels[this.status] ?? this.status;
  }
}
```

Create `src/app/shared/components/app-badge/app-badge.component.scss`:
```scss
.app-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: var(--govsa-font-size-xs);
  font-weight: 600;
  white-space: nowrap;

  &.badge--confirmed,
  &.badge--paid,
  &.badge--approved,
  &.badge--active {
    background: var(--govsa-success-light);
    color: #15803D;
  }

  &.badge--pending,
  &.badge--scheduled {
    background: var(--govsa-warning-light);
    color: #92400E;
  }

  &.badge--cancelled,
  &.badge--suspended {
    background: var(--govsa-danger-light);
    color: #991B1B;
  }

  &.badge--in_progress {
    background: var(--govsa-info-light);
    color: #1E40AF;
  }

  &.badge--completed {
    background: var(--govsa-primary-light);
    color: var(--govsa-primary);
  }
}
```

Create `src/app/shared/components/app-badge/app-badge.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppBadgeComponent } from './app-badge.component';

describe('AppBadgeComponent', () => {
  let fixture: ComponentFixture<AppBadgeComponent>;
  let component: AppBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppBadgeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should show Arabic label for confirmed', () => {
    component.status = 'confirmed';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('مؤكد');
  });

  it('should apply badge--cancelled class for cancelled status', () => {
    component.status = 'cancelled';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge--cancelled')).toBeTruthy();
  });

  it('should show Arabic label for in_progress', () => {
    component.status = 'in_progress';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('جارٍ');
  });
});
```

- [ ] **Step 2: Create AppCardComponent**

Create `src/app/shared/components/app-card/app-card.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-card" [class.app-card--hoverable]="hoverable" [class.app-card--flat]="flat">
      @if (title) {
        <div class="app-card__header">
          <h3 class="app-card__title">{{ title }}</h3>
          <ng-content select="[card-actions]" />
        </div>
      }
      <div class="app-card__body">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './app-card.component.scss',
})
export class AppCardComponent {
  @Input() title?: string;
  @Input() hoverable = false;
  @Input() flat = false;
}
```

Create `src/app/shared/components/app-card/app-card.component.scss`:
```scss
.app-card {
  background: var(--govsa-bg);
  border-radius: var(--govsa-radius-lg);
  border: 1px solid var(--govsa-border);
  box-shadow: var(--govsa-shadow-sm);
  overflow: hidden;

  &--hoverable {
    cursor: pointer;
    transition: var(--govsa-transition);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--govsa-shadow-lg);
      border-color: var(--govsa-primary-light);
    }
  }

  &--flat {
    box-shadow: none;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--govsa-space-4) var(--govsa-space-5);
    border-bottom: 1px solid var(--govsa-border);
    background: var(--govsa-surface);
  }

  &__title {
    font-size: var(--govsa-font-size-md);
    font-weight: 600;
    color: var(--govsa-text);
    margin: 0;
  }

  &__body {
    padding: var(--govsa-space-5);
  }
}
```

- [ ] **Step 3: Create AppButtonComponent**

Create `src/app/shared/components/app-button/app-button.component.ts`:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export type AppButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text' | 'danger';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <p-button
      [label]="label"
      [icon]="icon"
      [loading]="loading"
      [disabled]="disabled"
      [styleClass]="buttonClass"
      [type]="type"
      (onClick)="clicked.emit($event)"
    />
  `,
})
export class AppButtonComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() variant: AppButtonVariant = 'primary';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Output() clicked = new EventEmitter<MouseEvent>();

  get buttonClass(): string {
    const classes: string[] = [];
    if (this.variant === 'outlined') classes.push('p-button-outlined');
    if (this.variant === 'text')     classes.push('p-button-text');
    if (this.variant === 'secondary') classes.push('p-button-secondary');
    if (this.variant === 'danger')    classes.push('p-button-danger');
    if (this.fullWidth) classes.push('w-full');
    return classes.join(' ');
  }
}
```

Create `src/app/shared/components/app-button/app-button.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppButtonComponent } from './app-button.component';

describe('AppButtonComponent', () => {
  let fixture: ComponentFixture<AppButtonComponent>;
  let component: AppButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppButtonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppButtonComponent);
    component = fixture.componentInstance;
    component.label = 'حفظ';
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should set outlined class for outlined variant', () => {
    component.variant = 'outlined';
    expect(component.buttonClass).toContain('p-button-outlined');
  });

  it('should include w-full class when fullWidth is true', () => {
    component.fullWidth = true;
    expect(component.buttonClass).toContain('w-full');
  });

  it('should emit clicked event', () => {
    let emitted = false;
    component.clicked.subscribe(() => emitted = true);
    component.clicked.emit(new MouseEvent('click'));
    expect(emitted).toBeTrue();
  });
});
```

- [ ] **Step 4: Create AppLoadingComponent (Skeleton)**

Create `src/app/shared/components/app-loading/app-loading.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (item of items; track item) {
      <div class="skeleton-block" [style.height]="height" [style.width]="width" [style.margin-bottom]="gap"></div>
    }
  `,
  styleUrl: './app-loading.component.scss',
})
export class AppLoadingComponent {
  @Input() count = 3;
  @Input() height = '48px';
  @Input() width = '100%';
  @Input() gap = '12px';

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
```

Create `src/app/shared/components/app-loading/app-loading.component.scss`:
```scss
.skeleton-block {
  background: linear-gradient(
    90deg,
    var(--govsa-surface) 25%,
    var(--govsa-border) 37%,
    var(--govsa-surface) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: var(--govsa-radius);
  display: block;
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

- [ ] **Step 5: Create AppEmptyStateComponent**

Create `src/app/shared/components/app-empty-state/app-empty-state.component.ts`:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon">
        <i [class]="'pi ' + icon"></i>
      </div>
      <h3 class="empty-state__title">{{ title }}</h3>
      @if (description) {
        <p class="empty-state__desc">{{ description }}</p>
      }
      @if (actionLabel) {
        <p-button
          [label]="actionLabel"
          [icon]="actionIcon"
          variant="outlined"
          (onClick)="action.emit()"
        />
      }
    </div>
  `,
  styleUrl: './app-empty-state.component.scss',
})
export class AppEmptyStateComponent {
  @Input() icon = 'pi-inbox';
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon = 'pi-plus';
  @Output() action = new EventEmitter<void>();
}
```

Create `src/app/shared/components/app-empty-state/app-empty-state.component.scss`:
```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--govsa-space-16) var(--govsa-space-8);
  text-align: center;
  gap: var(--govsa-space-4);

  &__icon {
    width: 80px;
    height: 80px;
    background: var(--govsa-surface);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--govsa-space-2);

    i {
      font-size: 2rem;
      color: var(--govsa-text-muted);
    }
  }

  &__title {
    font-size: var(--govsa-font-size-lg);
    font-weight: 600;
    color: var(--govsa-text);
    margin: 0;
  }

  &__desc {
    font-size: var(--govsa-font-size-sm);
    color: var(--govsa-text-muted);
    max-width: 320px;
    line-height: 1.7;
  }
}
```

- [ ] **Step 6: Create AppPageHeaderComponent**

Create `src/app/shared/components/app-page-header/app-page-header.component.ts`:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="page-header">
      <div class="page-header__left">
        @if (breadcrumbs && breadcrumbs.length > 0) {
          <nav class="breadcrumb">
            @for (crumb of breadcrumbs; track crumb.label; let last = $last) {
              <span class="breadcrumb__item" [class.breadcrumb__item--current]="last">
                {{ crumb.label }}
              </span>
              @if (!last) { <span class="breadcrumb__sep">›</span> }
            }
          </nav>
        }
        <h1 class="page-header__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="page-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      @if (actionLabel) {
        <div class="page-header__actions">
          <p-button
            [label]="actionLabel"
            [icon]="actionIcon"
            (onClick)="action.emit()"
          />
        </div>
      }
    </div>
  `,
  styleUrl: './app-page-header.component.scss',
})
export class AppPageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() breadcrumbs?: BreadcrumbItem[];
  @Input() actionLabel?: string;
  @Input() actionIcon = 'pi pi-plus';
  @Output() action = new EventEmitter<void>();
}
```

Create `src/app/shared/components/app-page-header/app-page-header.component.scss`:
```scss
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--govsa-space-4);
  margin-bottom: var(--govsa-space-6);
  flex-wrap: wrap;

  &__left { flex: 1; }

  &__title {
    font-size: var(--govsa-font-size-2xl);
    font-weight: 700;
    color: var(--govsa-text);
    margin: var(--govsa-space-1) 0 0;
  }

  &__subtitle {
    font-size: var(--govsa-font-size-sm);
    color: var(--govsa-text-muted);
    margin-top: var(--govsa-space-1);
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-2);
  flex-wrap: wrap;

  &__item {
    font-size: var(--govsa-font-size-sm);
    color: var(--govsa-text-muted);

    &--current { color: var(--govsa-primary); font-weight: 500; }
  }

  &__sep { color: var(--govsa-border); }
}
```

- [ ] **Step 7: Create TripCardComponent**

Create `src/app/shared/components/trip-card/trip-card.component.ts`:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AppBadgeComponent, BadgeStatus } from '../app-badge/app-badge.component';

export interface TripCardData {
  id: string;
  originName: string;
  destinationName: string;
  departureTime: string | Date;
  availableSeats: number;
  totalSeats: number;
  price: number;
  status: string;
  driverName?: string;
  carType?: string;
}

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, AppBadgeComponent],
  templateUrl: './trip-card.component.html',
  styleUrl: './trip-card.component.scss',
})
export class TripCardComponent {
  @Input({ required: true }) trip!: TripCardData;
  @Input() showBookButton = false;
  @Input() showDetails = true;
  @Output() bookClicked = new EventEmitter<string>();
  @Output() detailsClicked = new EventEmitter<string>();

  get tripStatus(): BadgeStatus {
    return this.trip.status as BadgeStatus;
  }

  get formattedDate(): string {
    return new Date(this.trip.departureTime).toLocaleDateString('ar-SA', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  get formattedPrice(): string {
    return `${this.trip.price} ر.س`;
  }
}
```

Create `src/app/shared/components/trip-card/trip-card.component.html`:
```html
<div class="trip-card card-hover" (click)="showDetails && detailsClicked.emit(trip.id)">
  <!-- Route -->
  <div class="trip-route">
    <span class="route-city route-city--origin">{{ trip.originName }}</span>
    <div class="route-line">
      <span class="route-dot"></span>
      <div class="route-track"></div>
      <i class="pi pi-car route-icon"></i>
      <div class="route-track"></div>
      <span class="route-dot"></span>
    </div>
    <span class="route-city route-city--dest">{{ trip.destinationName }}</span>
  </div>

  <!-- Details row -->
  <div class="trip-details">
    <div class="trip-detail">
      <i class="pi pi-calendar"></i>
      <span>{{ formattedDate }}</span>
    </div>
    <div class="trip-detail">
      <i class="pi pi-users"></i>
      <span>{{ trip.availableSeats }} مقعد متاح</span>
    </div>
    <div class="trip-detail trip-price">
      <span>{{ formattedPrice }}</span>
    </div>
    <app-badge [status]="tripStatus" />
  </div>

  @if (showBookButton) {
    <div class="trip-actions">
      <p-button
        label="احجز الآن"
        icon="pi pi-ticket"
        styleClass="w-full"
        [disabled]="trip.availableSeats === 0"
        (onClick)="$event.stopPropagation(); bookClicked.emit(trip.id)"
      />
    </div>
  }
</div>
```

Create `src/app/shared/components/trip-card/trip-card.component.scss`:
```scss
.trip-card {
  background: var(--govsa-bg);
  border-radius: var(--govsa-radius-lg);
  border: 1px solid var(--govsa-border);
  box-shadow: var(--govsa-shadow-sm);
  padding: var(--govsa-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--govsa-space-4);
}

.trip-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--govsa-space-3);
}

.route-city {
  font-weight: 700;
  font-size: var(--govsa-font-size-lg);
  color: var(--govsa-text);
  min-width: 80px;

  &--origin { text-align: right; }
  &--dest   { text-align: left; }
}

.route-line {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--govsa-space-2);
}

.route-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--govsa-primary);
  flex-shrink: 0;
}

.route-track {
  flex: 1;
  height: 1px;
  background: var(--govsa-border);
}

.route-icon {
  color: var(--govsa-secondary);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.trip-details {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--govsa-space-3);
}

.trip-detail {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-2);
  font-size: var(--govsa-font-size-sm);
  color: var(--govsa-text-muted);

  i { font-size: 0.875rem; }
}

.trip-price {
  margin-inline-start: auto;
  font-size: var(--govsa-font-size-lg);
  font-weight: 700;
  color: var(--govsa-primary);
}

.trip-actions {
  padding-top: var(--govsa-space-3);
  border-top: 1px solid var(--govsa-border);
}
```

Create `src/app/shared/components/trip-card/trip-card.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripCardComponent, TripCardData } from './trip-card.component';

const mockTrip: TripCardData = {
  id: 't1',
  originName: 'الرياض',
  destinationName: 'جدة',
  departureTime: new Date('2026-05-01T08:00:00').toISOString(),
  availableSeats: 3,
  totalSeats: 12,
  price: 150,
  status: 'scheduled',
};

describe('TripCardComponent', () => {
  let fixture: ComponentFixture<TripCardComponent>;
  let component: TripCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TripCardComponent);
    component = fixture.componentInstance;
    component.trip = mockTrip;
    fixture.detectChanges();
  });

  it('should display origin and destination names', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('الرياض');
    expect(text).toContain('جدة');
  });

  it('should format price in SAR', () => {
    expect(component.formattedPrice).toBe('150 ر.س');
  });

  it('should emit detailsClicked when card is clicked and showDetails is true', () => {
    component.showDetails = true;
    let emittedId = '';
    component.detailsClicked.subscribe((id: string) => emittedId = id);
    fixture.nativeElement.click();
    expect(emittedId).toBe('t1');
  });

  it('should show book button when showBookButton is true', () => {
    component.showBookButton = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-button')).toBeTruthy();
  });
});
```

- [ ] **Step 8: Create BookingCardComponent**

Create `src/app/shared/components/booking-card/booking-card.component.ts`:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBadgeComponent, BadgeStatus } from '../app-badge/app-badge.component';

export interface BookingCardData {
  id: string;
  originName: string;
  destinationName: string;
  departureTime: string | Date;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  seatsCount: number;
}

@Component({
  selector: 'app-booking-card',
  standalone: true,
  imports: [CommonModule, AppBadgeComponent],
  template: `
    <div class="booking-card card-hover" (click)="detailsClicked.emit(booking.id)">
      <div class="booking-route">
        <span class="route-from">{{ booking.originName }}</span>
        <i class="pi pi-arrow-left route-arrow"></i>
        <span class="route-to">{{ booking.destinationName }}</span>
      </div>
      <div class="booking-meta">
        <div class="meta-item">
          <i class="pi pi-calendar"></i>
          <span>{{ formattedDate }}</span>
        </div>
        <div class="meta-item">
          <i class="pi pi-users"></i>
          <span>{{ booking.seatsCount }} مقعد</span>
        </div>
      </div>
      <div class="booking-footer">
        <div class="booking-badges">
          <app-badge [status]="booking.status as BadgeStatus" />
          <app-badge [status]="booking.paymentStatus as BadgeStatus" />
        </div>
        <span class="booking-price">{{ booking.totalPrice }} ر.س</span>
      </div>
    </div>
  `,
  styleUrl: './booking-card.component.scss',
})
export class BookingCardComponent {
  @Input({ required: true }) booking!: BookingCardData;
  @Output() detailsClicked = new EventEmitter<string>();

  get formattedDate(): string {
    return new Date(this.booking.departureTime).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  protected readonly BadgeStatus = Object;
}
```

Create `src/app/shared/components/booking-card/booking-card.component.scss`:
```scss
.booking-card {
  background: var(--govsa-bg);
  border-radius: var(--govsa-radius-lg);
  border: 1px solid var(--govsa-border);
  box-shadow: var(--govsa-shadow-sm);
  padding: var(--govsa-space-4) var(--govsa-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--govsa-space-3);
}

.booking-route {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-2);
  font-weight: 600;
  font-size: var(--govsa-font-size-md);
  color: var(--govsa-text);

  .route-arrow {
    color: var(--govsa-text-muted);
    font-size: 0.75rem;
  }
}

.booking-meta {
  display: flex;
  gap: var(--govsa-space-4);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-2);
  font-size: var(--govsa-font-size-sm);
  color: var(--govsa-text-muted);
}

.booking-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--govsa-space-3);
  border-top: 1px solid var(--govsa-border);
}

.booking-badges {
  display: flex;
  gap: var(--govsa-space-2);
  flex-wrap: wrap;
}

.booking-price {
  font-size: var(--govsa-font-size-lg);
  font-weight: 700;
  color: var(--govsa-primary);
}
```

Create `src/app/shared/components/booking-card/booking-card.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingCardComponent, BookingCardData } from './booking-card.component';

const mockBooking: BookingCardData = {
  id: 'b1',
  originName: 'الرياض',
  destinationName: 'مكة المكرمة',
  departureTime: new Date('2026-05-10T10:00:00').toISOString(),
  totalPrice: 200,
  status: 'confirmed',
  paymentStatus: 'paid',
  seatsCount: 2,
};

describe('BookingCardComponent', () => {
  let fixture: ComponentFixture<BookingCardComponent>;
  let component: BookingCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingCardComponent);
    component = fixture.componentInstance;
    component.booking = mockBooking;
    fixture.detectChanges();
  });

  it('should display origin and destination', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('الرياض');
    expect(text).toContain('مكة المكرمة');
  });

  it('should emit detailsClicked on click', () => {
    let emittedId = '';
    component.detailsClicked.subscribe((id: string) => emittedId = id);
    fixture.nativeElement.click();
    expect(emittedId).toBe('b1');
  });
});
```

- [ ] **Step 9: Run shared component tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/app-badge.component.spec.ts' --include='**/app-button.component.spec.ts' --include='**/trip-card.component.spec.ts' --include='**/booking-card.component.spec.ts'
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/app/shared/components/
git commit -m "feat: add shared component library (badge, card, button, loading, empty-state, page-header, trip-card, booking-card)"
```

---

## Task 15: Shared Pipes

**Files:**
- Create: `src/app/shared/pipes/arabic-date.pipe.ts`
- Create: `src/app/shared/pipes/arabic-date.pipe.spec.ts`
- Create: `src/app/shared/pipes/currency-sar.pipe.ts`
- Create: `src/app/shared/pipes/currency-sar.pipe.spec.ts`
- Create: `src/app/shared/index.ts`

- [ ] **Step 1: Write failing pipe tests**

Create `src/app/shared/pipes/arabic-date.pipe.spec.ts`:
```typescript
import { ArabicDatePipe } from './arabic-date.pipe';

describe('ArabicDatePipe', () => {
  const pipe = new ArabicDatePipe();

  it('should format date in Arabic locale', () => {
    const date = new Date('2026-05-01T08:00:00');
    const result = pipe.transform(date);
    expect(result).toContain('2026');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should accept ISO string', () => {
    const result = pipe.transform('2026-05-01T08:00:00.000Z');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should use short format when specified', () => {
    const date = new Date('2026-05-01');
    const full  = pipe.transform(date, 'full');
    const short = pipe.transform(date, 'short');
    expect(full.length).toBeGreaterThanOrEqual(short.length);
  });
});
```

Create `src/app/shared/pipes/currency-sar.pipe.spec.ts`:
```typescript
import { CurrencySarPipe } from './currency-sar.pipe';

describe('CurrencySarPipe', () => {
  const pipe = new CurrencySarPipe();

  it('should format number as SAR', () => {
    expect(pipe.transform(150)).toContain('150');
    expect(pipe.transform(150)).toContain('ر.س');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should handle zero', () => {
    expect(pipe.transform(0)).toContain('0');
  });

  it('should handle decimal values', () => {
    const result = pipe.transform(99.5);
    expect(result).toContain('99');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/arabic-date.pipe.spec.ts' --include='**/currency-sar.pipe.spec.ts'
```

Expected: `FAILED — pipe files not found`

- [ ] **Step 3: Implement ArabicDatePipe**

Create `src/app/shared/pipes/arabic-date.pipe.ts`:
```typescript
import { Pipe, PipeTransform } from '@angular/core';

type DateFormat = 'full' | 'short' | 'date-only' | 'time-only';

@Pipe({ name: 'arabicDate', standalone: true })
export class ArabicDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: DateFormat = 'full'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    const options: Record<DateFormat, Intl.DateTimeFormatOptions> = {
      full:      { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      short:     { year: 'numeric', month: 'short', day: 'numeric' },
      'date-only': { year: 'numeric', month: 'long', day: 'numeric' },
      'time-only': { hour: '2-digit', minute: '2-digit' },
    };

    return date.toLocaleDateString('ar-SA', options[format]);
  }
}
```

- [ ] **Step 4: Implement CurrencySarPipe**

Create `src/app/shared/pipes/currency-sar.pipe.ts`:
```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencySar', standalone: true })
export class CurrencySarPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return `${value.toLocaleString('ar-SA')} ر.س`;
  }
}
```

- [ ] **Step 5: Create barrel export**

Create `src/app/shared/index.ts`:
```typescript
// Components
export { AppBadgeComponent }     from './components/app-badge/app-badge.component';
export { AppCardComponent }      from './components/app-card/app-card.component';
export { AppButtonComponent }    from './components/app-button/app-button.component';
export { AppLoadingComponent }   from './components/app-loading/app-loading.component';
export { AppEmptyStateComponent }from './components/app-empty-state/app-empty-state.component';
export { AppPageHeaderComponent }from './components/app-page-header/app-page-header.component';
export { TripCardComponent }     from './components/trip-card/trip-card.component';
export { BookingCardComponent }  from './components/booking-card/booking-card.component';

// Pipes
export { ArabicDatePipe }   from './pipes/arabic-date.pipe';
export { CurrencySarPipe }  from './pipes/currency-sar.pipe';

// Types
export type { BadgeStatus }     from './components/app-badge/app-badge.component';
export type { TripCardData }    from './components/trip-card/trip-card.component';
export type { BookingCardData } from './components/booking-card/booking-card.component';
export type { BreadcrumbItem }  from './components/app-page-header/app-page-header.component';
```

- [ ] **Step 6: Run the pipe tests — verify they pass**

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/arabic-date.pipe.spec.ts' --include='**/currency-sar.pipe.spec.ts'
```

Expected: `Executed 8 of 8 SUCCESS`

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/pipes/ src/app/shared/index.ts
git commit -m "feat: add ArabicDatePipe, CurrencySarPipe, and shared barrel export"
```

---

## Task 16: Shell Layouts

**Files:**
- Create: `src/app/layout/rider-shell/rider-shell.component.ts` + `.html` + `.scss`
- Create: `src/app/layout/driver-shell/driver-shell.component.ts` + `.html` + `.scss`
- Create: `src/app/layout/admin-shell/admin-shell.component.ts` + `.html` + `.scss`

- [ ] **Step 1: Create RiderShellComponent**

Create `src/app/layout/rider-shell/rider-shell.component.ts`:
```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-rider-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ButtonModule],
  templateUrl: './rider-shell.component.html',
  styleUrl: './rider-shell.component.scss',
})
export class RiderShellComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(true);
  user = this.auth.currentUser;

  navItems: NavItem[] = [
    { label: 'الرئيسية',  icon: 'pi-home',        route: '/rider/home' },
    { label: 'ابحث عن رحلة', icon: 'pi-search',   route: '/rider/trips' },
    { label: 'حجوزاتي',   icon: 'pi-ticket',       route: '/rider/bookings' },
    { label: 'حسابي',     icon: 'pi-user',          route: '/rider/profile' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
```

Create `src/app/layout/rider-shell/rider-shell.component.html`:
```html
<div class="shell" [class.shell--collapsed]="!sidebarOpen()">

  <!-- Desktop Sidebar -->
  <aside class="sidebar">
    <div class="sidebar__brand">
      <i class="pi pi-car brand-icon"></i>
      @if (sidebarOpen()) {
        <span class="brand-name">منصة النقل</span>
      }
    </div>

    <nav class="sidebar__nav">
      @for (item of navItems; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="nav-item--active"
          class="nav-item"
          [title]="item.label"
        >
          <i class="pi {{ item.icon }} nav-item__icon"></i>
          @if (sidebarOpen()) {
            <span class="nav-item__label">{{ item.label }}</span>
          }
        </a>
      }
    </nav>

    <div class="sidebar__footer">
      <button class="nav-item logout-btn" (click)="logout()" title="تسجيل الخروج">
        <i class="pi pi-sign-out nav-item__icon"></i>
        @if (sidebarOpen()) {
          <span class="nav-item__label">تسجيل الخروج</span>
        }
      </button>
    </div>
  </aside>

  <!-- Main area -->
  <div class="main-wrapper">
    <!-- Header -->
    <header class="app-header">
      <button class="header-toggle" (click)="toggleSidebar()" aria-label="قائمة">
        <i class="pi pi-bars"></i>
      </button>
      <div class="header-user">
        <span class="user-name">{{ user()?.fullName }}</span>
        <div class="user-avatar">
          <i class="pi pi-user"></i>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="main-content">
      <router-outlet />
    </main>
  </div>

  <!-- Mobile Bottom Navigation -->
  <nav class="bottom-nav">
    @for (item of navItems; track item.route) {
      <a
        [routerLink]="item.route"
        routerLinkActive="bottom-nav__item--active"
        class="bottom-nav__item"
      >
        <i class="pi {{ item.icon }}"></i>
        <span>{{ item.label }}</span>
      </a>
    }
  </nav>

</div>
```

Create `src/app/layout/rider-shell/rider-shell.component.scss`:
```scss
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--govsa-surface);
  position: relative;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

.sidebar {
  width: var(--govsa-sidebar-width);
  background: var(--govsa-bg);
  border-left: 1px solid var(--govsa-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 100;
  transition: width 0.2s ease;
  overflow: hidden;

  @media (max-width: 767px) { display: none; }
}

.shell--collapsed .sidebar {
  width: 64px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-3);
  padding: var(--govsa-space-4) var(--govsa-space-4);
  height: var(--govsa-header-height);
  border-bottom: 1px solid var(--govsa-border);
  overflow: hidden;
}

.brand-icon {
  font-size: 1.5rem;
  color: var(--govsa-primary);
  flex-shrink: 0;
}

.brand-name {
  font-size: var(--govsa-font-size-lg);
  font-weight: 700;
  color: var(--govsa-primary);
  white-space: nowrap;
}

.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--govsa-space-4) var(--govsa-space-3);
  gap: var(--govsa-space-1);
  overflow-y: auto;
}

.sidebar__footer {
  padding: var(--govsa-space-3);
  border-top: 1px solid var(--govsa-border);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-3);
  padding: var(--govsa-space-3) var(--govsa-space-3);
  border-radius: var(--govsa-radius);
  color: var(--govsa-text-muted);
  text-decoration: none;
  font-size: var(--govsa-font-size-sm);
  font-weight: 500;
  transition: var(--govsa-transition-fast);
  white-space: nowrap;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;

  &:hover {
    background: var(--govsa-surface);
    color: var(--govsa-primary);
  }

  &--active {
    background: var(--govsa-primary-light);
    color: var(--govsa-primary);

    .nav-item__icon { color: var(--govsa-primary); }
  }
}

.nav-item__icon {
  font-size: 1rem;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.logout-btn {
  color: var(--govsa-danger);
  &:hover { background: var(--govsa-danger-light); color: var(--govsa-danger); }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

.main-wrapper {
  flex: 1;
  margin-inline-end: var(--govsa-sidebar-width);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin 0.2s ease;

  @media (max-width: 767px) {
    margin-inline-end: 0;
  }
}

.shell--collapsed .main-wrapper {
  margin-inline-end: 64px;

  @media (max-width: 767px) { margin-inline-end: 0; }
}

.app-header {
  height: var(--govsa-header-height);
  background: var(--govsa-bg);
  border-bottom: 1px solid var(--govsa-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--govsa-space-5);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: var(--govsa-shadow-xs);
}

.header-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--govsa-space-2);
  border-radius: var(--govsa-radius);
  color: var(--govsa-text-muted);
  font-size: 1.2rem;
  transition: var(--govsa-transition-fast);

  &:hover { background: var(--govsa-surface); color: var(--govsa-primary); }
}

.header-user {
  display: flex;
  align-items: center;
  gap: var(--govsa-space-3);
}

.user-name {
  font-size: var(--govsa-font-size-sm);
  font-weight: 500;
  color: var(--govsa-text);

  @media (max-width: 480px) { display: none; }
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--govsa-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--govsa-primary);
}

.main-content {
  flex: 1;
  padding: var(--govsa-space-6);

  @media (max-width: 767px) {
    padding: var(--govsa-space-4);
    padding-bottom: calc(var(--govsa-bottom-nav-height) + var(--govsa-space-4));
  }
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

.bottom-nav {
  display: none;

  @media (max-width: 767px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--govsa-bottom-nav-height);
    background: var(--govsa-bg);
    border-top: 1px solid var(--govsa-border);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
    z-index: 100;
  }

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-decoration: none;
    color: var(--govsa-text-muted);
    font-size: 10px;
    font-weight: 500;
    transition: var(--govsa-transition-fast);

    i { font-size: 1.2rem; }

    &--active {
      color: var(--govsa-primary);
    }
  }
}
```

- [ ] **Step 2: Create DriverShellComponent**

Create `src/app/layout/driver-shell/driver-shell.component.ts`:
```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-driver-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './driver-shell.component.html',
  styleUrl: './driver-shell.component.scss',
})
export class DriverShellComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(true);
  user = this.auth.currentUser;

  navItems: NavItem[] = [
    { label: 'الرئيسية',  icon: 'pi-home',        route: '/driver/home' },
    { label: 'رحلاتي',    icon: 'pi-car',          route: '/driver/trips' },
    { label: 'أرباحي',    icon: 'pi-wallet',        route: '/driver/earnings' },
    { label: 'ملفي',      icon: 'pi-user',          route: '/driver/profile' },
  ];

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
```

Create `src/app/layout/driver-shell/driver-shell.component.html`:
```html
<div class="shell" [class.shell--collapsed]="!sidebarOpen()">
  <aside class="sidebar">
    <div class="sidebar__brand">
      <i class="pi pi-car brand-icon"></i>
      @if (sidebarOpen()) { <span class="brand-name">منصة النقل - سائق</span> }
    </div>
    <nav class="sidebar__nav">
      @for (item of navItems; track item.route) {
        <a [routerLink]="item.route" routerLinkActive="nav-item--active" class="nav-item" [title]="item.label">
          <i class="pi {{ item.icon }} nav-item__icon"></i>
          @if (sidebarOpen()) { <span class="nav-item__label">{{ item.label }}</span> }
        </a>
      }
    </nav>
    <div class="sidebar__footer">
      <button class="nav-item logout-btn" (click)="logout()">
        <i class="pi pi-sign-out nav-item__icon"></i>
        @if (sidebarOpen()) { <span class="nav-item__label">تسجيل الخروج</span> }
      </button>
    </div>
  </aside>
  <div class="main-wrapper">
    <header class="app-header">
      <button class="header-toggle" (click)="toggleSidebar()"><i class="pi pi-bars"></i></button>
      <div class="header-user">
        <span class="user-name">{{ user()?.fullName }}</span>
        <div class="user-avatar"><i class="pi pi-user"></i></div>
      </div>
    </header>
    <main class="main-content"><router-outlet /></main>
  </div>
  <nav class="bottom-nav">
    @for (item of navItems; track item.route) {
      <a [routerLink]="item.route" routerLinkActive="bottom-nav__item--active" class="bottom-nav__item">
        <i class="pi {{ item.icon }}"></i>
        <span>{{ item.label }}</span>
      </a>
    }
  </nav>
</div>
```

Create `src/app/layout/driver-shell/driver-shell.component.scss`:
```scss
// Same layout as rider-shell — import or duplicate styles
// Driver shell uses same structural CSS with driver-specific accent
@use '../rider-shell/rider-shell.component' as base;

// Driver-specific: secondary color accent on brand icon
.brand-icon { color: var(--govsa-secondary); }
```

> **Note:** The driver shell uses the same structural SCSS as rider shell. Copy the full SCSS from `rider-shell.component.scss` into `driver-shell.component.scss` verbatim (Angular scopes styles per component). Change `.brand-icon` color to `var(--govsa-secondary)` to visually distinguish.

- [ ] **Step 3: Create AdminShellComponent**

Create `src/app/layout/admin-shell/admin-shell.component.ts`:
```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(true);
  user = this.auth.currentUser;

  navItems: NavItem[] = [
    { label: 'لوحة التحكم', icon: 'pi-chart-bar',    route: '/admin/dashboard' },
    { label: 'المستخدمون',  icon: 'pi-users',          route: '/admin/users' },
    { label: 'الرحلات',     icon: 'pi-car',             route: '/admin/trips' },
    { label: 'الإعدادات',   icon: 'pi-cog',             route: '/admin/config' },
    { label: 'سياسة الإلغاء', icon: 'pi-file-edit',   route: '/admin/cancellation-policies' },
    { label: 'سجل الإجراءات', icon: 'pi-list',         route: '/admin/audit-logs' },
  ];

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/admin/login']);
  }
}
```

Create `src/app/layout/admin-shell/admin-shell.component.html`:
```html
<div class="shell admin-shell" [class.shell--collapsed]="!sidebarOpen()">
  <aside class="sidebar">
    <div class="sidebar__brand">
      <i class="pi pi-shield brand-icon"></i>
      @if (sidebarOpen()) { <span class="brand-name">لوحة الإدارة</span> }
    </div>
    <nav class="sidebar__nav">
      @for (item of navItems; track item.route) {
        <a [routerLink]="item.route" routerLinkActive="nav-item--active" class="nav-item" [title]="item.label">
          <i class="pi {{ item.icon }} nav-item__icon"></i>
          @if (sidebarOpen()) { <span class="nav-item__label">{{ item.label }}</span> }
        </a>
      }
    </nav>
    <div class="sidebar__footer">
      <button class="nav-item logout-btn" (click)="logout()">
        <i class="pi pi-sign-out nav-item__icon"></i>
        @if (sidebarOpen()) { <span class="nav-item__label">تسجيل الخروج</span> }
      </button>
    </div>
  </aside>
  <div class="main-wrapper">
    <header class="app-header">
      <button class="header-toggle" (click)="toggleSidebar()"><i class="pi pi-bars"></i></button>
      <div class="header-user">
        <span class="user-name admin-badge">مدير النظام</span>
        <div class="user-avatar admin-avatar"><i class="pi pi-shield"></i></div>
      </div>
    </header>
    <main class="main-content"><router-outlet /></main>
  </div>
  <!-- Admin has no bottom-nav — admins use desktop -->
</div>
```

Create `src/app/layout/admin-shell/admin-shell.component.scss`:
```scss
// Copy rider-shell SCSS structure verbatim, then override:
// Admin sidebar is wider, no bottom-nav, uses full viewport
// Changes:
// --govsa-sidebar-width override: 260px for admin
// .brand-icon color: var(--govsa-danger)
// .admin-badge: small pill showing "مدير"
// .admin-avatar: danger-light background

.admin-shell {
  --govsa-sidebar-width: 260px;
}

.admin-badge {
  background: var(--govsa-danger-light);
  color: #991B1B;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--govsa-font-size-xs);
  font-weight: 600;
}

.admin-avatar {
  background: var(--govsa-danger-light) !important;
  color: #991B1B !important;
}
```

> **Note:** Copy the full SCSS from `rider-shell.component.scss` into `admin-shell.component.scss`, then append the overrides above. Admin has no `.bottom-nav` styles needed.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/
git commit -m "feat: add rider, driver, and admin shell layouts with responsive bottom navigation"
```

---

## Task 17: App Routing

**Files:**
- Modify: `src/app/app.routes.ts`
- Create: `src/app/app.routes.server.ts`

- [ ] **Step 1: Update app.routes.ts**

Replace `src/app/app.routes.ts`:
```typescript
import { Routes } from '@angular/router';
import { riderGuard }  from './core/auth/guards/rider.guard';
import { driverGuard } from './core/auth/guards/driver.guard';
import { adminGuard }  from './core/auth/guards/admin.guard';

export const routes: Routes = [
  // ─── Public / Auth ─────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/components/register-shell/register-shell.component').then(m => m.RegisterShellComponent),
  },
  {
    path: 'register/rider',
    loadComponent: () =>
      import('./features/auth/components/rider-register/rider-register.component').then(m => m.RiderRegisterComponent),
  },
  {
    path: 'register/driver',
    loadComponent: () =>
      import('./features/auth/components/driver-register/driver-register.component').then(m => m.DriverRegisterComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
  },

  // ─── Rider ─────────────────────────────────────────────────────────────────
  {
    path: 'rider',
    canActivate: [riderGuard],
    loadComponent: () =>
      import('./layout/rider-shell/rider-shell.component').then(m => m.RiderShellComponent),
    loadChildren: () =>
      import('./features/rider/rider.routes').then(m => m.RIDER_ROUTES),
  },

  // ─── Driver ────────────────────────────────────────────────────────────────
  {
    path: 'driver',
    canActivate: [driverGuard],
    loadComponent: () =>
      import('./layout/driver-shell/driver-shell.component').then(m => m.DriverShellComponent),
    loadChildren: () =>
      import('./features/driver/driver.routes').then(m => m.DRIVER_ROUTES),
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layout/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ─── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 2: Create placeholder feature routes so the build doesn't fail**

Create `src/app/features/rider/rider.routes.ts`:
```typescript
import { Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '<p>صفحة الراكب — قريباً</p>' })
class RiderPlaceholderComponent {}

export const RIDER_ROUTES: Routes = [
  { path: 'home',     component: RiderPlaceholderComponent },
  { path: 'trips',    component: RiderPlaceholderComponent },
  { path: 'bookings', component: RiderPlaceholderComponent },
  { path: 'profile',  component: RiderPlaceholderComponent },
  { path: '',         redirectTo: 'home', pathMatch: 'full' },
];
```

Create `src/app/features/driver/driver.routes.ts`:
```typescript
import { Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '<p>صفحة السائق — قريباً</p>' })
class DriverPlaceholderComponent {}

export const DRIVER_ROUTES: Routes = [
  { path: 'home',     component: DriverPlaceholderComponent },
  { path: 'trips',    component: DriverPlaceholderComponent },
  { path: 'earnings', component: DriverPlaceholderComponent },
  { path: 'profile',  component: DriverPlaceholderComponent },
  { path: '',         redirectTo: 'home', pathMatch: 'full' },
];
```

Create `src/app/features/admin/admin.routes.ts`:
```typescript
import { Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '<p>لوحة الإدارة — قريباً</p>' })
class AdminPlaceholderComponent {}

export const ADMIN_ROUTES: Routes = [
  { path: 'dashboard',              component: AdminPlaceholderComponent },
  { path: 'users',                  component: AdminPlaceholderComponent },
  { path: 'users/:id',              component: AdminPlaceholderComponent },
  { path: 'trips',                  component: AdminPlaceholderComponent },
  { path: 'config',                 component: AdminPlaceholderComponent },
  { path: 'cancellation-policies',  component: AdminPlaceholderComponent },
  { path: 'audit-logs',             component: AdminPlaceholderComponent },
  { path: '',                       redirectTo: 'dashboard', pathMatch: 'full' },
];
```

Create `src/app/features/landing/landing.component.ts`:
```typescript
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;padding:2rem;text-align:center;">
      <i class="pi pi-car" style="font-size:4rem;color:var(--govsa-primary)"></i>
      <h1 style="font-size:2.5rem;font-weight:700;color:var(--govsa-primary)">منصة النقل البري</h1>
      <p style="color:var(--govsa-text-muted);max-width:480px;line-height:1.8">
        منصة متكاملة لحجز رحلات النقل البري بين المدن السعودية بكل سهولة وأمان
      </p>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">
        <p-button label="سجّل دخولك" icon="pi pi-sign-in" routerLink="/login" />
        <p-button label="إنشاء حساب" icon="pi pi-user-plus" routerLink="/register" variant="outlined" />
      </div>
    </div>
  `,
})
export class LandingComponent {}
```

- [ ] **Step 3: Create app.routes.server.ts**

Create `src/app/app.routes.server.ts`:
```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRouteConfig: ServerRoute[] = [
  // Landing page — prerendered at build time for SEO
  { path: '/', renderMode: RenderMode.Prerender },

  // All other routes — client-side rendering (behind auth, no SEO needed)
  // app.routes.server.ts and app.config.server.ts are scaffolded and ready;
  // Nginx deployment is pure static files. No Node server process runs until
  // a route with RenderMode.Server is added.
  { path: '/**', renderMode: RenderMode.Client },
];
```

- [ ] **Step 4: Verify build passes**

```bash
npx ng build --configuration=development
```

Expected: build completes. The app should have routes for `/`, `/login`, `/register`, `/register/rider`, `/register/driver`, `/rider/*`, `/driver/*`, `/admin/*`.

- [ ] **Step 5: Verify the app loads in browser**

```bash
npx ng serve --port 4200
```

Open `http://localhost:4200` — should see the landing page with "منصة النقل البري". Navigate to `/login` — should see the Arabic login form. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/app/app.routes.ts src/app/app.routes.server.ts src/app/features/rider/ src/app/features/driver/ src/app/features/admin/admin.routes.ts src/app/features/landing/
git commit -m "feat: configure root routing with lazy loading, role guards, and hybrid render modes"
```

---

## Task 18: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
cd /Users/krim/Documents/transport-frontend
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected output: all tests pass. Approximate count: ~40 specs.

Common failures and fixes:
- `NullInjectorError: No provider for MessageService` in a component test → add `MessageService` to `TestBed.configureTestingModule.providers`
- `NullInjectorError: No provider for Router` → add `provideRouter([])` to providers

- [ ] **Step 2: Fix any failures, then commit**

```bash
git add -A
git commit -m "test: ensure all Phase 1 tests pass"
```

---

## Task 19: Final Build Verification

- [ ] **Step 1: Run production build**

```bash
npx ng build --configuration=production
```

Expected: no errors. Bundle sizes reported. Main bundle should be under 500kB initial.

- [ ] **Step 2: Verify dist output**

```bash
ls dist/transport-frontend/browser/
```

Expected: `index.html`, `main-*.js`, `styles-*.css`, and chunked lazy-loaded bundles.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 Foundation complete — Angular 21 + GOV.SA design system + auth + shells + shared components"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|---|---|
| Angular 17+ standalone, SSR scaffolded | Task 1, 17 |
| PrimeNG + GOV.SA tokens option A | Task 2, 3, 4 |
| IBM Plex Sans Arabic | Task 3 |
| RTL `dir="rtl" lang="ar"` | Task 3 |
| `ng new --ssr` with hybrid render modes | Task 1, 17 |
| StorageService SSR-safe | Task 6 |
| AuthService (signals, setSession, clearSession, getToken, getHomePath) | Task 7 |
| ApiService (get/post/patch/delete) | Task 8 |
| ToastService (Arabic messages) | Task 9 |
| Auth interceptor (Bearer token, 401 redirect, 403 toast) | Task 10 |
| Route guards (auth, rider, driver, admin) | Task 11 |
| Auth repository (login, registerRider, registerDriver) | Task 12 |
| Auth feature service (login, register, loading$, error handling) | Task 12 |
| Login component (reactive form, Arabic labels, loading state) | Task 13 |
| Register shell (role selection cards) | Task 13 |
| Rider register form | Task 13 |
| Driver register form | Task 13 |
| AppBadgeComponent (all statuses, Arabic labels) | Task 14 |
| AppCardComponent (hoverable, flat variants) | Task 14 |
| AppButtonComponent (variants, loading, fullWidth) | Task 14 |
| AppLoadingComponent (skeleton animation) | Task 14 |
| AppEmptyStateComponent (title, description, action) | Task 14 |
| AppPageHeaderComponent (title, breadcrumb, action) | Task 14 |
| TripCardComponent (route display, price, status, book button) | Task 14 |
| BookingCardComponent (route, status badges, price) | Task 14 |
| ArabicDatePipe (multiple formats) | Task 15 |
| CurrencySarPipe (SAR format) | Task 15 |
| Shared barrel export | Task 15 |
| Rider shell (sidebar, header, bottom-nav, responsive) | Task 16 |
| Driver shell (sidebar, header, bottom-nav, responsive) | Task 16 |
| Admin shell (sidebar, header, no bottom-nav) | Task 16 |
| App routing (lazy, guards, role redirect, fallback) | Task 17 |
| Landing page (prerendered) | Task 17 |
| Placeholder routes for Phase 2–4 | Task 17 |
| `app.routes.server.ts` hybrid config | Task 17 |
| `environment.ts` / `environment.prod.ts` | Task 8 |
| `@angular/localize` scaffold | Task 2 |
| GOV.SA design tokens (all CSS properties) | Task 3 |
| PrimeNG Aura preset with GOV.SA palette | Task 4 |
| Premium scss (_premium.scss) | Task 3 |

All spec requirements are covered. No placeholders. No TBDs.
