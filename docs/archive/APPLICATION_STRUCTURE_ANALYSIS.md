# ProMan Application Structure Analysis

**Date**: March 29, 2026  
**Application**: Property Management Dashboard  
**Stack**: Next.js 16 + React 19 + TypeScript + Prisma + SQLite  
**Version**: 1.5.5

---

## 1. Module Organization

### 1.1 Core Directories & Purpose

#### `app/` — Next.js App Router (Frontend Pages & API Routes)

**Purpose**: Application entry point using Next.js 16 App Router with file-based routing  
**Structure**:

- `page.tsx` — Root redirect to authenticated dashboard or auth
- `layout.tsx` — Global layout with CSP nonce, fonts, root providers
- `globals.css` — Global styles and design tokens
- `api/` — API route handlers (backend)
- `auth/` — Authentication pages (signin, error)
- `tenant-portal/` — Public tenant portal access
- `[locale]/` — i18n routing wrapper for all locales (pt, en, es)

**Key Features**:

- Locale-based routing: `/pt`, `/en`, `/es`
- Grouped routes: `(main)` layout group for authenticated pages
- Admin dashboard at `[locale]/(main)/overview`

#### `lib/` — Shared Libraries & Services

**Purpose**: Core business logic, services, utilities, and hooks  
**Subdirectories**:

| Directory     | Purpose                                                        | Key Files                                                         |
| ------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `services/`   | Database, email, payment, auth services                        | `database/`, `email/`, `auth/`, `payment/`                        |
| `utils/`      | Helper functions: validation, sanitization, crypto, formatting | `validation.ts`, `sanitize.ts`, `api-client.ts`, `logger.ts`      |
| `hooks/`      | React hooks for data fetching, forms, state                    | `use-form-dialog.ts`, `use-sortable-data.ts`, `use-auto-save.tsx` |
| `middleware/` | Request processing: CSRF, rate limiting, security              | `csrf.ts`, `rate-limit.ts`, `security-headers.ts`                 |
| `schemas/`    | Zod validation schemas (centralized)                           | `property.schema.ts`, `tenant.schema.ts`, `invoice.schema.ts`     |
| `contexts/`   | React Context providers                                        | `app-context.tsx`, `csrf-context.tsx`, `theme-context.tsx`        |
| `i18n/`       | Internationalization config and setup                          | `config.ts`, `i18n.ts`                                            |
| `config/`     | Application configuration                                      | `data-mode.ts`                                                    |
| `types.ts`    | TypeScript type definitions                                    | Property, Tenant, Invoice, etc.                                   |

#### `components/` — React Components

**Purpose**: UI components organized by type and feature  
**Structure**:

- `ui/` — Atomic UI components (buttons, cards, dialogs, tables)
- `features/` — Feature-specific components grouped by domain
- `layouts/` — Layout components (sidebar, navigation)
- `shared/` — Shared utility components (error boundary, providers, banners)

#### `prisma/` — Database Layer

**Purpose**: Data model and migrations  
**Contents**:

- `schema.prisma` — 27 data models with relationships (User, Property, Tenant, Lease, Invoice, Payment, etc.)
- `schema.sqlite.prisma` — SQLite-specific variant
- `migrations/` — Database migration history

#### `e2e/` — End-to-End Tests

**Purpose**: Full user workflow testing with Playwright  
**Structure**:

- `*.spec.ts` — Playwright test suites
- `setup/` — Test configuration and fixtures
- Key test areas: auth, CRUD operations, workflows, email, payments

#### `tests/` — Unit & Integration Tests

**Purpose**: Supporting test utilities and setup  
**Contents**:

- `setup/` — Vitest configuration
- `helpers/` — Test utility functions
- Test files co-located with source files (`.test.ts`)

#### `messages/` — i18n Localization Files

**Purpose**: Translation strings for pt, en, es locales  
**Format**: JSON message catalogs per locale

#### `scripts/` — Build & Utility Scripts

**Purpose**: Development and deployment automation  
**Key Scripts**:

- `prestart.js` — Pre-flight checks
- `validate-env.js` — Environment validation
- `security-scan.js`, `zap-scan.js` — Security utilities
- `load-test.js`, `stress-test.js` — Performance testing
- `delete-user.js` — User data deletion (GDPR)

#### `docs/` — Documentation

**Purpose**: Architecture, deployment, compliance guides  
**Key Files**:

- `architecture/` — System design documentation
- `deployment/` — Deployment instructions
- `SECURITY.md`, `ACCESSIBILITY_IMPROVEMENTS.md` — Compliance docs

#### `public/` — Static Assets

**Purpose**: Favicon and static files served directly

#### `k8s/` & `helm/` — Deployment Configuration

**Purpose**: Kubernetes and Helm deployment manifests  
**For**: Production deployment to Kubernetes clusters

---

## 2. Main Entry Points & Routes

### 2.1 Application Flow

```
User Request
    ↓
Root Page (app/page.tsx) — Redirect logic
    ├→ Authenticated user → /pt/overview (dashboard)
    └→ Unauthenticated user → /pt (locale landing)
         ↓
    Login/SignIn (app/auth/signin/page.tsx)
         ↓
    NextAuth Session Check
         ↓
    Authenticated → Locale Layout (app/[locale]/layout.tsx)
         ↓
    Main Layout (app/[locale]/(main)/layout.tsx) — Sidebar + Navigation
         ↓
    Page/Feature Component
```

### 2.2 Main Routes

#### Public Routes

- `/` → Root redirect
- `/pt` / `/en` / `/es` → Locale selection/landing
- `/auth/signin` → Sign-in page
- `/auth/error` → Authentication error page
- `/tenant-portal/[token]` → Tenant payment portal (public token-based access)

#### Authenticated Routes (Protected)

- `/[locale]/(main)/overview` — Dashboard/Analytics view
- `/[locale]/(main)/tenants` — Tenant management CRUD
- `/[locale]/(main)/properties` — Property management CRUD
- `/[locale]/(main)/owners` — Owner/Investor management
- `/[locale]/(main)/leases` — Lease agreement management
- `/[locale]/(main)/financials` — Financial reporting
- `/[locale]/(main)/invoices` — Invoice generation and payment
- `/[locale]/(main)/reports` — Tax compliance reports (PT SAF-T, ES)
- `/[locale]/(main)/maintenance` — Maintenance ticket tracking
- `/[locale]/(main)/correspondence` — Email template & communication log
- `/[locale]/(main)/documents` — Document repository
- `/[locale]/(main)/contacts` — Contact management
- `/[locale]/(main)/settings` — User settings, admin tools

### 2.3 API Endpoints (RESTful)

#### Authentication

- `POST /api/auth/[...nextauth]` — NextAuth authentication endpoints
- `GET /api/csrf-token` — CSRF token generation

#### Core Data Operations

- `GET/POST /api/tenants` — List/create tenants
- `GET/PUT/DELETE /api/tenants/[id]` — Tenant CRUD
- `GET/POST /api/properties` — List/create properties
- `GET/PUT/DELETE /api/properties/[id]` — Property CRUD
- `GET/POST /api/owners` — Owner management
- `GET/POST /api/leases` — Lease operations
- `GET/POST /api/invoices` — Invoice management
- `GET/PUT /api/invoices/[id]` — Invoice detail operations
- `POST /api/invoices/[id]/initiate-payment` — Payment initiation
- `POST /api/invoices/[id]/pay` — Payment confirmation
- `GET/POST /api/receipts` — Receipt management
- `GET/POST /api/units` — Unit/apartment management

#### Communication & Correspondence

- `POST /api/email` — Send email
- `GET /api/email/metrics` — Email metrics
- `GET /api/email/logs` — Email delivery logs
- `GET/POST /api/correspondence` — Communication history
- `POST /api/correspondence/[id]` — Send template-based email

#### Webhooks

- `POST /api/webhooks/sendgrid/[event]` — SendGrid email events
- `POST /api/webhooks/stripe/[event]` — Stripe payment events

#### User & Compliance

- `POST /api/user/export-data` — GDPR data export
- `POST /api/user/delete-data` — Account deletion
- `GET /api/health` — System health check

#### Administrative

- `GET /api/admin/database` — Admin database view
- `POST /api/cron/notifications` — Scheduled notifications

---

## 3. Core Services

### 3.1 Authentication Service (`lib/services/auth/`)

**Files**: `auth.ts`, `auth-middleware.ts`, `auth-types.ts`, `tenant-portal-auth.ts`

**Responsibility**: User authentication and session management

**Key Functions**:

- `getAuthOptions()` — NextAuth configuration with providers
- `requireAuth()` — Middleware to enforce authentication
- `requireAdmin()` — Admin-only access control

**Providers**:

1. **Google OAuth** (if configured with real credentials)
2. **Credentials Provider** (demo login, dev mode)
3. **NextAuth Prisma Adapter** — Session/account persistence

**Session Strategy**: JWT with database persistence

**Features**:

- Multi-provider support (extensible for GitHub, Microsoft, etc.)
- Automatic account linking
- Demo login for development (`ENABLE_DEMO_LOGIN=true`)
- Email/password authentication in mock mode

---

### 3.2 Database Service (`lib/services/database/`)

**Files**: `database.ts`, `database.mock.ts`, `database.test.ts`, `index.ts`

**Responsibility**: All database operations and Prisma client management

**Key Exports** (Services):

```typescript
propertyService
  .getAll(userId) → Property[]
  .getById(userId, id) → Property | null
  .create(userId, data) → Property
  .update(userId, id, data) → Property
  .delete(userId, id) → void

tenantService
  .getAll(userId) → Tenant[]
  .getById(userId, id) → Tenant | null
  .create(userId, data) → Tenant
  .update(userId, id, data) → Tenant
  .delete(userId, id) → void

receiptService
  .getAll(userId) → Receipt[]
  // ... similar CRUD

invoiceService
  .getAll(userId) → Invoice[]
  // ... similar CRUD

correspondenceService
  .getAll(userId) → Correspondence[]
  // ... similar CRUD

leaseService
  invoiceService
  // ... all entities mapped
```

**Database Client**:

- Singleton Prisma client (`getPrismaClient()`)
- Lazy initialization on first use
- BetterSQLite3 adapter for development/self-hosted

**Data Modes**:

- **Mock Mode** (`isMockMode()`) — In-memory testing
- **Real Mode** — SQLite database queries

---

### 3.3 Email Service (`lib/services/email/`)

**Files**: `email-service.ts`, `index.ts`, `email-service.test.ts`

**Responsibility**: Email sending, template management, and delivery tracking

**Key Functions**:

- `sendEmail(emailData)` — Send email via SendGrid
- `getTemplate(templateId)` — Retrieve email template
- `logEmailEvent(event)` — Track email delivery

**SendGrid Integration**:

- Lazy-loaded dynamic provider
- Template ID support
- Dynamic template data substitution
- Retry logic with configurable attempt limits

**Email Templates** (Built-in):

- `rent_reminder` — Payment reminder
- `lease_expiry_notice` — Lease ending notification
- `maintenance_alert` — Maintenance issue notification
- `payment_received` — Payment confirmation
- `welcome_letter` — Tenant welcome

**Email Log Storage**:

- Tracks: recipient, subject, status, SendGrid message ID, delivery events
- Retry count and failure reasons stored
- Database model: `EmailLog`

---

### 3.4 Payment Service (`lib/services/payment/`)

**Structure**: Multi-country payment processing

**Exports**:

- `paymentService` — Central payment orchestration
- `portugalPaymentService` — Portugal payment methods
  - Multibanco (bank transfer)
  - MB Way (mobile payment)
  - Credit card (via gateway)
- `spainPaymentService` — Spain payment methods
  - Bizum (instant transfer)
  - Credit card
  - Bank transfer

**Key Flow**:

1. Create Payment Intent → Generate unique reference
2. Initiate Payment Flow → User selects method + completes
3. Process Webhook → Confirmation from payment provider
4. Update Invoice Status → Mark as paid

---

### 3.5 Middleware (`lib/middleware/`)

**CSRF Protection** (`csrf.ts`):

- Token generation and validation
- Form submission security

**Rate Limiting** (`rate-limit.ts`):

- Per-IP request throttling
- Configurable limits per endpoint
- In-memory or Redis store

**Security Headers** (`security-headers.ts`):

- CSP (Content Security Policy) with nonce
- HSTS, X-Frame-Options, X-Content-Type-Options

**Request Validation** (`request-validation.ts`):

- Input sanitization
- Schema enforcement

---

### 3.6 Supporting Services

#### Address Verification (`address-verification.ts`)

- Integrates with address lookup APIs
- Validates Portuguese and Spanish postal codes

#### Document Service (`document-service.ts`)

- File management (contracts, invoices, photos, certificates)
- Storage backend abstraction

#### Financial Reports (`financial-reports.ts`)

- Income distribution calculations
- Multi-owner income splitting
- Tax compliance reporting (Portugal SAF-T, Spain LPAD)

#### PDF Generation (`pdf-generator.ts`)

- jsPDF with autoTable for invoices and reports

#### Tax Calculator (`tax-calculator.ts`)

- Portugal: Rendimentos (rental income) tax computation
- Spain: Impuesto sobre Inmuebles calculation

#### Notifications (`lib/services/notifications/`)

- In-app notification generation
- Email notification scheduling

#### Analytics (`analytics-service.ts`)

- Dashboard metrics preparation
- Tenant payment trends, property occupancy

---

## 4. Component Structure

### 4.1 Component Organization

```
components/
├── ui/                           # Atomic/Radix UI components
│   ├── button.tsx               # Button variants (primary, secondary, icon)
│   ├── card.tsx                 # Card container, header, content
│   ├── dialog.tsx               # Modal dialogs
│   ├── alert-dialog.tsx         # Confirmation dialogs
│   ├── dropdown-menu.tsx        # Dropdown menus
│   ├── charts.tsx               # Chart components (recharts wrapper)
│   ├── dashboard-widgets.tsx    # Reusable metrics/stat cards
│   ├── bulk-action-bar.tsx      # Multi-select action bar
│   ├── accessibility.tsx        # Skip links, ARIA helpers
│   └── ...more primitives
│
├── features/                     # Feature-specific domain components
│   ├── dashboard/               # Dashboard/overview page
│   │   ├── overview-view.tsx    # Main dashboard layout
│   │   └── stat-cards.tsx       # Performance metrics display
│   ├── tenant/                  # Tenant management feature
│   │   ├── tenants-list.tsx     # Tenant table with columns
│   │   ├── tenant-form.tsx      # Create/edit form
│   │   ├── tenant-card.tsx      # Card view for tenants
│   │   └── tenant-actions.tsx   # Action dropdown
│   ├── property/                # Property management feature
│   │   ├── property-list.tsx    # Properties grid/map
│   │   ├── property-form.tsx    # Property creation form
│   │   └── property-map.tsx     # Leaflet map integration
│   ├── financial/               # Financial/invoice feature
│   │   ├── invoice-list.tsx     # Invoice management table
│   │   ├── invoice-generator.tsx # Invoice creation wizard
│   │   └── payment-form.tsx     # Payment method selector
│   ├── lease/                   # Lease agreement feature
│   │   ├── lease-list.tsx
│   │   ├── lease-generator.tsx
│   │   └── lease-template-selector.tsx
│   ├── maintenance/             # Maintenance ticket feature
│   │   ├── ticket-list.tsx
│   │   ├── ticket-form.tsx
│   │   └── status-badge.tsx
│   ├── correspondence/          # Email communication feature
│   │   ├── template-list.tsx
│   │   ├── email-composer.tsx
│   │   └── email-logs.tsx
│   ├── owner/                   # Owner/investor management
│   │   ├── owner-list.tsx
│   │   ├── owner-form.tsx
│   │   └── income-distribution.tsx
│   ├── report/                  # Tax/compliance reporting
│   │   ├── report-generator.tsx
│   │   ├── saft-pt-export.tsx
│   │   └── tax-summary.tsx
│   ├── settings/                # User settings feature
│   │   ├── settings-view.tsx
│   │   ├── admin-database-view.tsx
│   │   └── user-preferences.tsx
│   └── ...more features
│
├── layouts/                      # Layout components
│   ├── sidebar.tsx              # Side navigation (desktop)
│   └── mobile-nav.tsx           # Bottom nav (mobile)
│
└── shared/                       # Shared utility components
    ├── client-providers.tsx     # React context providers wrapper
    ├── error-boundary.tsx       # Error boundary for crash recovery
    ├── confirmation-dialog.tsx  # Generic confirmation modal
    ├── dev-auth.tsx             # Dev mode authentication helper
    ├── dev-debug.tsx            # Debug info (dev only)
    ├── update-banner.tsx        # Version update notification
    ├── version-badge.tsx        # Version display
    └── language-selector.tsx    # i18n locale switcher
```

### 4.2 Component Patterns

#### UI Components (Radix UI + Tailwind CSS)

- **Composition**: Building blocks (Button, CardHeader, CardContent)
- **Variants**: CVA (class-variance-authority) for style variations
- **Accessibility**: ARIA labels, keyboard navigation

**Example**:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export const MyComponent = () => (
  <Card>
    <CardHeader>Title</CardHeader>
    <CardContent>
      <Button variant="primary">Click me</Button>
    </CardContent>
  </Card>
);
```

#### Feature Components (Page-level logic)

- **Client Components**: "use client" directive for interactivity
- **Data Fetching**: API calls via `useEffect` or custom hooks
- **Entity Actions**: CRUD via context (`useAppContext`)
- **Forms**: Controlled inputs with validation (Zod schemas)

**Example**:

```tsx
"use client";
import { useTenantActions } from "@/lib/hooks";

export const TenantsView = () => {
  const { tenantActions } = useAppContext();
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    tenantActions.getAll();
  }, []);

  const handleCreate = async (data: CreateTenant) => {
    const newTenant = await tenantActions.add(data);
    setTenants([...tenants, newTenant]);
  };

  return <TenantsList tenants={tenants} onAdd={handleCreate} />;
};
```

#### Forms and Dialogs

- **Dialog Hook**: `useFormDialog()` manages modal state
- **Validation**: Zod schemas with error messages
- **Submission**: Auto-close on success, error toast on failure

---

## 5. Data Flow

### 5.1 CRUD Flow (Example: Creating a Tenant)

```
User Action (Frontend)
    ↓
TenantForm Component
    ├→ Form state (controlled inputs)
    ├→ onChange handlers update local state
    └→ onSubmit → Validate with tenantSchema
        ↓
    Request Preparation
    ├→ Sanitize inputs (sanitizeForDatabase, sanitizeEmail)
    ├→ Add CSRF token from context
    ├→ Build request body
        ↓
    HTTP Request
    └→ POST /api/tenants
        ├→ Headers: Authorization, Content-Type, X-CSRF-Token
        └→ Body: { name, email, phone, ... }
            ↓
API Route Handler (app/api/tenants/route.ts)
    ├→ Extract session (requireAuth middleware)
    ├→ Validate request body (Zod schema)
    ├→ Sanitize inputs
        ↓
    Database Operation
    ├→ Call tenantService.create(userId, data)
    └→ INSERT into prisma.tenant
            create {
              userId,
              name,
              email,
              phone,
              ...
            }
        ↓
Database Response
    └→ Prisma returns fresh tenant record with ID
        ↓
API Response
    └→ 200 OK + JSON { id, userId, name, email, ... }
        ↓
Frontend (Component)
    ├→ Parse response
    ├→ Add to local state/context
    ├→ Show success toast
    ├→ Close dialog/form
        ↓
UI Update
    └→ Tenants list re-renders with new entry
```

### 5.2 Data Components in Context

**AppContext** (`lib/contexts/app-context.tsx`):

- Centralized state for all entities
- Entity actions (add, update, remove) dispatch updates
- Example state shape:
  ```typescript
  {
    properties: Property[],
    tenants: Tenant[],
    leases: Lease[],
    invoices: Invoice[],
    receipts: Receipt[],
    correspondences: Correspondence[],
    ...
  }
  ```

**Entity Actions Factory** (`lib/contexts/create-entity-actions.ts`):

- Abstracts CRUD HTTP calls
- Standardized error handling
- CSRF token injection
- Toast notifications
- State synchronization

**CSRF Context** (`lib/contexts/csrf-context.tsx`):

- Provides CSRF token to all forms
- Fetched on app initialization
- Included in all POST/PUT/DELETE requests

---

## 6. Dependencies & Key Relationships

### 6.1 Critical Imports & Module Dependencies

#### Authentication Chain

```
Page Component
    ↓ uses
session from NextAuth
    ↓ validates
requireAuth middleware
    ↓ checks
Database (User, Account, Session)
```

#### Data Access Chain

```
Feature Component (e.g., TenantsList)
    ↓ calls
useAppContext()
    ↓ dispatches
tenantActions.getAll()
    ↓ HTTP calls
POST /api/tenants
    ↓ backend calls
tenantService.getAll(userId)
    ↓ queries
Prisma client.tenant.findMany()
    ↓ queries
SQLite database
```

#### Email/Notification Chain

```
User Action (Send Email)
    ↓
API: POST /api/email
    ↓
emailService.sendEmail()
    ↓
SendGrid API (if configured)
OR Mock mode
    ↓
Log to EmailLog table
    ↓
Webhook on SendGrid event
    ↓
POST /api/webhooks/sendgrid
    ↓
Update EmailLog status
```

#### Payment Flow

```
Invoice Detail Page
    ↓
User clicks "Pay Now"
    ↓
paymentService.createPaymentIntent()
    ├→ Generate unique reference
    ├→ Store in PaymentTransaction
    └→ Return reference to tenantPortal
        ↓
Tenant Portal (Public)
    ├→ Display payment instructions
    ├→ For Portugal: Multibanco or MB Way QR
    ├→ For Spain: Bizum or card payment
        ↓
Payment Provider (External)
    ├→ Tenant completes payment
    └→ Sends webhook confirmation
        ↓
POST /api/webhooks/stripe OR sendgrid
    ↓
paymentService.processWebhook()
    ↓
Update Invoice.status = "paid"
    ↓
Send payment confirmation email
```

### 6.2 Database Model Relationships

**Core Entity Relationships**:

```
User (1)
├─→ (*) Property
├─→ (*) Tenant
├─→ (*) Owner
├─→ (*) Lease
├─→ (*) Invoice
├─→ (*) Receipt
├─→ (*) Correspondence
├─→ (*) EmailLog
└─→ (*) Document

Property (1)
├─→ (*) Tenant (many tenants can live in property over time)
├─→ (*) Lease
├─→ (*) Receipt
├─→ (*) MaintenanceTicket
├─→ (*) Unit
├─→ (*) PropertyOwner (ownership interest)
└─→ (*) Expense

Tenant (1)
├─→ (*) Lease
├─→ (*) Invoice
├─→ (*) Receipt
└─→ (*) Correspondence

Lease (1)
├─→ (1) Tenant
├─→ (1) Property
├─→ (*) Invoice
└─→ (*) Document

Invoice (1)
├─→ (1) Tenant
├─→ (*) PaymentTransaction
└─→ (*) Receipt

Owner (1)
├─→ (*) Property (via PropertyOwner join)
└─→ (*) Document

CorrespondenceTemplate (1)
├─→ (*) Correspondence
└─→ Used by: emailService
```

### 6.3 Key Configuration & Environment

**Environment Variables**:

```env
# Authentication
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Email (SendGrid)
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@example.com

# Payment Providers
STRIPE_PUBLIC_KEY=xxx
STRIPE_SECRET_KEY=xxx
BIZUM_API_KEY=xxx (Spain)
MULTIBANCO_API_KEY=xxx (Portugal)

# Database
DATABASE_URL=file:./dev.db

# Feature Flags
ENABLE_DEMO_LOGIN=true
NODE_ENV=development
NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true

# Tax/Compliance
COUNTRY_TAX_MODE=portugal  # or spain
```

### 6.4 Validation Schema Hierarchy

```
lib/schemas/ (Centralized)
├── property.schema.ts
├── tenant.schema.ts
├── lease.schema.ts
├── invoice.schema.ts
├── receipt.schema.ts
├── maintenance.schema.ts
├── payment.schema.ts
└── index.ts (barrel export)
    ↓ re-exported in
lib/utils/validation.ts
    ↓ used by
API Routes (Zod.parse)
    ↑ used by
Frontend Forms (form.watch + validation)
```

---

## 7. Key Files Reference

### 7.1 Entry Points

| File                             | Purpose                        |
| -------------------------------- | ------------------------------ |
| `app/page.tsx`                   | Root redirect logic            |
| `app/layout.tsx`                 | Global layout, CSP, fonts      |
| `app/auth/signin/page.tsx`       | Authentication page            |
| `app/[locale]/layout.tsx`        | i18n provider setup            |
| `app/[locale]/(main)/layout.tsx` | Authenticated layout + sidebar |

### 7.2 Services

| File                                  | Purpose                |
| ------------------------------------- | ---------------------- |
| `lib/services/database/database.ts`   | All CRUD services      |
| `lib/services/auth/auth.ts`           | NextAuth configuration |
| `lib/services/email/email-service.ts` | Email sending          |
| `lib/services/payment/`               | Multi-country payments |
| `lib/services/document-service.ts`    | File management        |

### 7.3 Utilities

| File                          | Purpose             |
| ----------------------------- | ------------------- |
| `lib/utils/validation.ts`     | Zod schema exports  |
| `lib/utils/sanitize.ts`       | XSS prevention      |
| `lib/utils/api-client.ts`     | HTTP client wrapper |
| `lib/utils/logger.ts`         | Structured logging  |
| `lib/utils/currency.ts`       | Currency formatting |
| `lib/utils/pii-encryption.ts` | Data encryption     |

### 7.4 Contexts & Hooks

| File                                    | Purpose             |
| --------------------------------------- | ------------------- |
| `lib/contexts/app-context.tsx`          | Global entity state |
| `lib/contexts/create-entity-actions.ts` | CRUD action factory |
| `lib/hooks/use-form-dialog.ts`          | Modal form state    |
| `lib/hooks/use-sortable-data.ts`        | Table sorting       |
| `lib/hooks/use-auto-save.tsx`           | Auto-save forms     |

### 7.5 Tests

| Path                           | Coverage            |
| ------------------------------ | ------------------- |
| `e2e/auth.setup.ts`            | Authentication flow |
| `e2e/crud-endpoints.spec.ts`   | API CRUD operations |
| `e2e/workflow-lease.spec.ts`   | Lease workflow      |
| `e2e/workflow-payment.spec.ts` | Payment flow        |
| `tests/setup/`                 | Test environment    |

---

## 8. Architecture Highlights

### 8.1 Design Patterns Used

1. **Context API + Reducer** — Global state management for entities
2. **Service Layer** — Database abstraction via `tenantService`, `propertyService`, etc.
3. **Factory Pattern** — `createEntityActions()` generates CRUD for any entity
4. **Middleware Chain** — Security (CSRF, rate limit), auth, validation
5. **Provider Pattern** — React Context providers for auth, theme, currency
6. **Error Boundary** — Crash recovery and error logging
7. **Hook Abstraction** — Custom hooks for forms, sorting, keyboard shortcuts

### 8.2 Security Measures

1. **CSRF Protection** — Token in forms, validated on backend
2. **Rate Limiting** — Per-IP request throttling
3. **Input Sanitization** — XSS prevention via DOMPurify
4. **PII Encryption** — Sensitive data encrypted at rest
5. **Authentication** — NextAuth with session/JWT
6. **Authorization** — Role-based access (USER, ADMIN)
7. **CSP Nonce** — Prevents inline script injection
8. **API Client Validation** — Zod schema enforcement
9. **Audit Logging** — Track user actions (GDPR compliance)

### 8.3 Internationalization (i18n)

- **Framework**: next-intl
- **Locales**: Portuguese (pt), English (en), Spanish (es)
- **Routing**: `/pt/*`, `/en/*`, `/es/*`
- **Messages**: Per-locale JSON catalogs in `messages/`
- **Currency**: EUR (Europe default), USD, GBP, CAD options

### 8.4 Performance Optimizations

- **Code Splitting**: Next.js automatic per-route bundling
- **Image Optimization**: next/image with lazy loading
- **Data Fetching**: Server components + Suspense boundaries
- **Caching**: HTTP cache headers, browser caching
- **Pagination**: Configurable per-endpoint (default 50 items)
- **Monitoring**: OpenTelemetry instrumentation

---

## 9. Development Mode Features

### 9.1 Demo/Dev Features

- **Demo Login**: Credentials provider for testing (non-production)
- **Mock Mode**: In-memory database for E2E tests
- **Dev Debug Panel**: Runtime inspection of state
- **Hot Reload**: Docker dev stage for local development
- **Security Scanning**: npm script for vulnerability checking

### 9.2 Testing Infrastructure

- **Unit Tests**: Vitest with coverage reporting
- **E2E Tests**: Playwright with multiple test suites
- **Test Utilities**: Fixtures, mocks, test helpers
- **Coverage Target**: Tracked in `coverage/` directory

---

## 10. Production Deployment

### 10.1 Build & Deployment Pipeline

```
npm run build
    ↓
Next.js compilation + optimization
    ↓
npm run start
    ↓
Node.js production server
    ↓
Kubernetes / Helm deployment
    (k8s/ and helm/ manifests)
```

### 10.2 Database Strategy

- **SQLite** for single-tenant/self-hosted
- **BetterSQLite3** adapter for synchronous access
- **Prisma Migrations** for schema versioning
- **Backup Strategy**: Documented in docs/

### 10.3 Deployment Targets

- **Local Development**: `npm run dev`
- **Docker**: Multi-stage Dockerfile with dev/prod stages
- **Kubernetes**: Standard deployment manifests
- **Helm**: Chart in `helm/proman/` with TrueNAS SCALE support

---

## Summary Table

| Aspect         | Technology                 | Location                            | Key Feature          |
| -------------- | -------------------------- | ----------------------------------- | -------------------- |
| **Frontend**   | React 19 + Next.js 16      | `app/`, `components/`               | App Router, SSR      |
| **Styling**    | Tailwind CSS               | `globals.css`                       | Utility-first CSS    |
| **Forms**      | React Hook Form + Zod      | `lib/schemas/`                      | Type-safe validation |
| **Database**   | Prisma + SQLite            | `prisma/`, `lib/services/database/` | ORM + schema         |
| **Auth**       | NextAuth v4                | `lib/services/auth/`                | Multi-provider       |
| **Email**      | SendGrid                   | `lib/services/email/`               | Template-based       |
| **Payments**   | Stripe + Local methods     | `lib/payment/`                      | Multi-country        |
| **i18n**       | next-intl                  | `messages/`, `lib/i18n/`            | 3 locales            |
| **Testing**    | Playwright + Vitest        | `e2e/`, `tests/`                    | E2E + unit           |
| **Security**   | CSRF, rate limit, CSP      | `lib/middleware/`                   | Multiple layers      |
| **Deployment** | Docker + Kubernetes + Helm | `Dockerfile`, `k8s/`, `helm/`       | Cloud-ready          |
