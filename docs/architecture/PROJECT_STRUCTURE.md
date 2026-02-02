# Project Structure

This document provides a comprehensive overview of the ProMan project structure and organization.

## Repository Overview

ProMan follows Next.js 16 App Router conventions with feature-based organization, co-located tests, and barrel exports for clean imports.

## Directory Structure

```
proman/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Internationalized routes
│   │   ├── (main)/              # Main app route group
│   │   │   ├── analytics/       # Analytics pages
│   │   │   ├── correspondence/  # Communication pages
│   │   │   ├── documents/       # Document management
│   │   │   ├── financials/      # Financial pages
│   │   │   ├── leases/          # Lease management
│   │   │   ├── maintenance/     # Maintenance requests
│   │   │   ├── overview/        # Dashboard
│   │   │   ├── owners/          # Owner management
│   │   │   ├── properties/      # Property management
│   │   │   ├── reports/         # Reporting
│   │   │   ├── tenants/         # Tenant management
│   │   │   ├── error.tsx        # Error boundary
│   │   │   ├── loading.tsx      # Loading state
│   │   │   └── not-found.tsx    # 404 page
│   │   ├── layout.tsx           # Locale layout
│   │   ├── loading.tsx          # Root loading
│   │   └── page.tsx             # Locale homepage
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin operations
│   │   ├── analytics/           # Analytics endpoints
│   │   ├── auth/                # NextAuth.js
│   │   ├── correspondence/      # Communication API
│   │   ├── debug/               # Debug endpoints (dev only)
│   │   ├── documents/           # Document API
│   │   ├── email/               # Email operations
│   │   ├── expenses/            # Expense tracking
│   │   ├── health/              # Health checks
│   │   ├── info/                # API metadata
│   │   ├── invoices/            # Invoice management
│   │   ├── leases/              # Lease API
│   │   ├── maintenance/         # Maintenance requests
│   │   ├── metrics/             # Metrics
│   │   ├── owners/              # Owner API
│   │   ├── payments/            # Payment processing
│   │   ├── properties/          # Property API
│   │   ├── receipts/            # Receipt management
│   │   ├── reports/             # Report generation
│   │   ├── tax/                 # Tax compliance
│   │   ├── tenant-portal/       # Tenant portal API
│   │   ├── tenants/             # Tenant API
│   │   ├── units/               # Unit API
│   │   ├── user/                # User data (GDPR)
│   │   ├── webhooks/            # External webhooks
│   │   └── README.md            # API documentation
│   ├── auth/                     # Auth pages
│   ├── tenant-portal/           # Public tenant portal
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
├── components/                   # React components
│   ├── features/                # Feature modules (with barrel exports)
│   │   ├── correspondence/      # Communication features
│   │   │   ├── correspondence-view.tsx
│   │   │   ├── correspondence-view.test.tsx
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── dashboard/           # Dashboard features
│   │   │   ├── analytics-dashboard.tsx
│   │   │   ├── overview-view.tsx
│   │   │   ├── overview-view.test.tsx
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── document/            # Document features
│   │   ├── financial/           # Financial features
│   │   │   ├── financials-container.tsx
│   │   │   ├── financials-view.tsx
│   │   │   ├── invoices-view.tsx
│   │   │   ├── payment-matrix-view.tsx
│   │   │   ├── receipts-view.tsx
│   │   │   ├── *.test.tsx       # Co-located tests
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── lease/               # Lease features
│   │   ├── maintenance/         # Maintenance features
│   │   ├── owner/               # Owner features
│   │   ├── property/            # Property features
│   │   │   ├── property-list.tsx
│   │   │   ├── property-map.tsx
│   │   │   ├── units-view.tsx
│   │   │   ├── properties-view.test.tsx
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── report/              # Report features
│   │   └── tenant/              # Tenant features
│   ├── layouts/                 # Layout components
│   │   ├── sidebar.tsx
│   │   ├── sidebar.test.tsx
│   │   └── index.ts             # ✨ Barrel export
│   ├── shared/                  # Shared components
│   │   ├── client-providers.tsx
│   │   ├── error-boundary.tsx
│   │   ├── version-badge.tsx
│   │   ├── *.test.tsx           # Co-located tests
│   │   └── index.ts             # ✨ Barrel export
│   └── ui/                      # Base UI components
│       ├── button.tsx
│       ├── button.test.tsx      # Co-located test
│       ├── card.tsx
│       ├── card.test.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ... (50+ UI components)
├── docs/                         # Documentation
│   ├── architecture/            # Technical documentation
│   │   ├── API_ROUTES.md        # Complete API reference
│   │   └── IMPORT_MIGRATION_GUIDE.md
│   ├── deployment/              # Deployment guides
│   │   └── ... (TrueNAS, K8s docs)
│   ├── integrations/            # External service docs
│   ├── releases/                # Release notes
│   │   └── ... (version notes)
│   └── ux/                      # UX guidelines
│       └── STORYBOOK_GUIDE.md   # Storybook setup
├── lib/                          # Core utilities
│   ├── hooks/                   # Custom React hooks (with barrel exports)
│   │   ├── use-auto-save.tsx
│   │   ├── use-form-dialog.ts
│   │   ├── use-sortable-data.ts
│   │   ├── *.test.ts            # Co-located tests
│   │   └── index.ts             # ✨ Barrel export
│   ├── schemas/                 # Zod validation schemas
│   │   ├── property.ts
│   │   ├── tenant.ts
│   │   ├── lease.ts
│   │   ├── invoice.ts
│   │   └── index.ts             # ✨ Barrel export
│   ├── services/                # Business logic
│   │   ├── auth/                # Authentication services
│   │   │   ├── auth.ts
│   │   │   ├── auth-middleware.ts
│   │   │   ├── tenant-portal-auth.ts
│   │   │   ├── *.test.ts        # Co-located tests
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── database/            # Database utilities
│   │   │   ├── database.ts
│   │   │   ├── sqlite-adapter.ts
│   │   │   ├── *.test.ts
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── email/               # Email services
│   │   │   ├── email-service.ts
│   │   │   ├── *.test.ts
│   │   │   └── index.ts         # ✨ Barrel export
│   │   ├── address-verification.ts
│   │   ├── analytics-service.ts
│   │   ├── audit-log.ts
│   │   ├── document-service.ts
│   │   ├── financial-reports.ts
│   │   ├── invoice-service.ts
│   │   ├── pdf-generator.ts
│   │   └── tax-calculator.ts
│   ├── utils/                   # Utility functions (with barrel exports)
│   │   ├── env.ts
│   │   ├── error-handling.ts
│   │   ├── errors.ts
│   │   ├── rate-limit.ts
│   │   ├── sanitize.ts
│   │   ├── utils.ts
│   │   ├── validation.ts
│   │   ├── *.test.ts            # Co-located tests
│   │   └── index.ts             # ✨ Barrel export
│   ├── address-verification.ts
│   ├── currency-context.tsx
│   └── i18n/                    # Internationalization
├── messages/                     # i18n message files
│   ├── en.json                  # English
│   └── pt.json                  # Portuguese
├── prisma/                       # Database schema
│   ├── schema.prisma            # Prisma schema
│   └── migrations/              # Database migrations
├── public/                       # Static assets
├── tests/                        # Shared test utilities
│   ├── helpers/                 # Test helpers
│   │   └── render-with-providers.tsx
│   └── setup.ts                 # Vitest setup
├── e2e/                          # End-to-end tests
│   ├── workflow-property.spec.ts
│   ├── workflow-tenant.spec.ts
│   └── ... (Playwright tests)
├── types/                        # TypeScript types
│   └── next-auth.d.ts
├── .storybook/                   # Storybook config (optional)
├── proxy.ts                      # Next.js proxy (middleware)
├── i18n.ts                       # i18n configuration
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
├── vitest.config.ts             # Vitest config
├── package.json
└── README.md

```

## Key Features

### ✨ Barrel Exports

All feature modules, services, and utilities use barrel exports (`index.ts`) for clean imports:

```typescript
// Before: Long nested imports
import { PropertiesView } from '@/components/features/property/property-list'
import { getPrismaClient } from '@/lib/services/database/database'
import { useFormDialog } from '@/lib/hooks/use-form-dialog'

// After: Clean barrel exports
import { PropertiesView } from '@/features/property'
import { getPrismaClient } from '@/services/database'
import { useFormDialog } from '@/hooks'
```

### 🧪 Co-located Tests

Tests are located alongside their source files for better discoverability:

```
components/ui/
├── button.tsx
├── button.test.tsx     ✅ Test next to component
├── card.tsx
└── card.test.tsx       ✅ Test next to component
```

### 🎯 Enhanced TypeScript Paths

Granular path aliases for cleaner imports:

```typescript
{
  "@/*": ["./*"],
  "@/ui/*": ["./components/ui/*"],
  "@/features/*": ["./components/features/*"],
  "@/shared/*": ["./components/shared/*"],
  "@/layouts/*": ["./components/layouts/*"],
  "@/services/*": ["./lib/services/*"],
  "@/hooks/*": ["./lib/hooks/*"],
  "@/utils/*": ["./lib/utils/*"],
  "@/schemas/*": ["./lib/schemas/*"],
  "@/types/*": ["./types/*"],
  "@/api/*": ["./app/api/*"]
}
```

### 📚 Comprehensive Documentation

- **API Reference**: Complete API documentation in [docs/architecture/API_ROUTES.md](docs/architecture/API_ROUTES.md)
- **Import Guide**: Migration guide in [docs/architecture/IMPORT_MIGRATION_GUIDE.md](docs/architecture/IMPORT_MIGRATION_GUIDE.md)
- **Deployment**: TrueNAS and Kubernetes guides in `docs/deployment/`
- **Storybook**: Component documentation guide in [docs/ux/STORYBOOK_GUIDE.md](docs/ux/STORYBOOK_GUIDE.md)

### 🎨 Next.js 16 Route Conventions

- **loading.tsx**: Loading states with consistent UI
- **error.tsx**: Error boundaries with retry functionality
- **not-found.tsx**: 404 pages with navigation
- **route.ts**: API route handlers
- **layout.tsx**: Route layouts
- **page.tsx**: Route pages

## Import Conventions

### Components

```typescript
// UI Components
import { Button, Card, Input } from '@/ui/button'

// Feature Components
import { PropertiesView, PropertyMap } from '@/features/property'
import { TenantsView } from '@/features/tenant'

// Shared Components
import { ClientProviders, ErrorBoundary } from '@/shared'

// Layouts
import { Sidebar } from '@/layouts'
```

### Services & Utilities

```typescript
// Services
import { getPrismaClient } from '@/services/database'
import { EmailService } from '@/services/email'
import { requireAuth } from '@/services/auth'

// Hooks
import { useFormDialog, useSortableData } from '@/hooks'

// Utils
import { cn, formatCurrency, validateEmail } from '@/utils'

// Schemas
import { createPropertySchema, updateTenantSchema } from '@/schemas'
```

## Testing Structure

### Unit Tests
- **Location**: Co-located with source files (`.test.ts` or `.test.tsx`)
- **Framework**: Vitest
- **Coverage**: Components, services, utilities, hooks

### Integration Tests
- **Location**: `e2e/` directory
- **Framework**: Playwright
- **Coverage**: Critical workflows, API endpoints

### Test Utilities
- **Location**: `tests/helpers/`
- **Shared**: Test setup, mocks, render utilities

## Build & Development

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Production server

# Testing
npm test                 # Run Vitest tests
npm run test:e2e         # Run Playwright tests
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Storybook (optional)
npm run storybook        # Start Storybook
npm run build-storybook  # Build static Storybook
```

## Environment Configuration

Required environment variables:

```env
# Database
DATABASE_URL=file:./proman.db

# Authentication
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Optional)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@example.com

# Payment (Optional)
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

## Deployment

### Docker

```bash
docker build -t proman .
docker run -p 3000:3000 proman
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

### TrueNAS SCALE

See [TRUENAS_DEPLOYMENT.md](../TRUENAS_DEPLOYMENT.md)

## Best Practices

1. **Co-locate tests** with their source files
2. **Use barrel exports** for cleaner imports
3. **Follow TypeScript paths** for consistency
4. **Document API routes** in API_ROUTES.md
5. **Write comprehensive tests** for critical paths
6. **Use Zod schemas** for validation
7. **Leverage middleware** for auth, rate limiting
8. **Follow Next.js conventions** for file naming
9. **Keep components focused** - single responsibility
10. **Update documentation** when adding features

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](../LICENSE)

---

**ProMan** - Modern Property Management for the Self-Hosted Era
