# Import Migration Guide

**Date**: February 2026  
**Purpose**: Guide for updating import paths during repository reorganization

## Overview

This guide documents all import path changes made during the file organization project. Use this reference when updating feature branches or encountering import errors.

## Phase 1: Documentation & Core Files

### Documentation Moves (No Import Impact)
- ✅ `RELEASES.md` → `docs/releases/RELEASES.md`
- ✅ `RELEASE_NOTES_*.md` → `docs/releases/`
- ✅ `TRUENAS_DEPLOYMENT.md` → `docs/deployment/`
- ✅ `deployment_guide.md` → `docs/deployment/`
- ✅ `SENDGRID_WEBHOOKS.md` → `docs/integrations/`
- ✅ `OPTIMIZATION.md` → `docs/architecture/`
- ✅ `UX_IMPROVEMENTS_*.md` → `docs/ux/`

### i18n Configuration Changes

**OLD (Removed):**
```typescript
import { locales, defaultLocale } from '@/i18n';
```

**NEW:**
```typescript
import { locales, defaultLocale } from '@/lib/i18n/config';
// OR
import { locales, defaultLocale } from './lib/i18n/config'; // relative
```

**Affected Files:**
- `lib/i18n.ts` - Updated ✅
- `middleware.ts` (formerly proxy.ts) - Already correct ✅

### Proxy File Naming

**Note**: Next.js 16 uses proxy.ts, not middleware.ts

**CORRECT (Next.js 16):**
```typescript
// proxy.ts
export function proxy(request: NextRequest) { ... }
```

**DEPRECATED:**
```typescript
// middleware.ts  
export function middleware(request: NextRequest) { ... }
```

**Note**: Next.js 16.1.6+ prefers proxy.ts convention. The middleware.ts naming is deprecated and will show warnings.

---

## Phase 2: Legacy Component Re-exports (Pending)

### Component Imports

**Pattern**: Remove re-export files, import directly from features

#### Properties

**OLD:**
```typescript
import { PropertiesView } from '@/components/properties-view';
```

**NEW:**
```typescript
import { PropertiesView } from '@/components/features/property/property-list';
```

#### Tenants

**OLD:**
```typescript
import { TenantsView } from '@/components/tenants-view';
```

**NEW:**
```typescript
import { TenantsView } from '@/components/features/tenant/tenants-view';
```

#### Leases

**OLD:**
```typescript
import { LeasesView } from '@/components/leases-view';
```

**NEW:**
```typescript
import { LeasesView } from '@/components/features/lease/leases-view';
```

#### Financials

**OLD:**
```typescript
import { FinancialsView } from '@/components/financials-view';
import { PaymentMatrixView } from '@/components/payment-matrix-view';
import { ReceiptsView } from '@/components/receipts-view';
```

**NEW:**
```typescript
import { FinancialsView } from '@/components/features/financial/financials-view';
import { PaymentMatrixView } from '@/components/features/financial/payment-matrix-view';
import { ReceiptsView } from '@/components/features/financial/receipts-view';
```

#### Dashboard & Overview

**OLD:**
```typescript
import { OverviewView } from '@/components/overview-view';
```

**NEW:**
```typescript
import { OverviewView } from '@/components/features/dashboard/overview-view';
```

#### Maintenance

**OLD:**
```typescript
import { MaintenanceView } from '@/components/maintenance-view';
```

**NEW:**
```typescript
import { MaintenanceView } from '@/components/features/maintenance/maintenance-view';
```

#### Owners

**OLD:**
```typescript
import { OwnersView } from '@/components/owners-view';
```

**NEW:**
```typescript
import { OwnersView } from '@/components/features/owner/owners-view';
```

#### Correspondence

**OLD:**
```typescript
import { CorrespondenceView } from '@/components/correspondence-view';
```

**NEW:**
```typescript
import { CorrespondenceView } from '@/components/features/correspondence/correspondence-view';
```

#### Shared Components

**OLD:**
```typescript
import { ErrorBoundary } from '@/components/error-boundary';
import { VersionBadge } from '@/components/version-badge';
import { ClientProviders } from '@/components/client-providers';
import { Sidebar } from '@/components/sidebar';
```

**NEW:**
```typescript
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { VersionBadge } from '@/components/shared/version-badge';
import { ClientProviders } from '@/components/shared/client-providers';
import { Sidebar } from '@/components/layouts/sidebar';
```

### Files to be Removed

**Component Re-exports** (will be deleted):
- `components/properties-view.tsx`
- `components/tenants-view.tsx`
- `components/leases-view.tsx`
- `components/financials-view.tsx`
- `components/maintenance-view.tsx`
- `components/owners-view.tsx`
- `components/correspondence-view.tsx`
- `components/overview-view.tsx`
- `components/payment-matrix-view.tsx`
- `components/receipts-view.tsx`
- `components/error-boundary.tsx`
- `components/version-badge.tsx`
- `components/client-providers.tsx`
- `components/sidebar.tsx`
- `components/property-map.tsx`
- `components/units-view.tsx`

---

## Phase 3: Enhanced TypeScript Paths (Pending)

### New Path Aliases

After adding enhanced path aliases to tsconfig.json:

**Shorter UI Component Imports:**
```typescript
// OLD
import { Button } from '@/components/ui/button';

// NEW (with @/ui/* alias)
import { Button } from '@/ui/button';
```

**Feature Component Imports:**
```typescript
// OLD
import { PropertyList } from '@/components/features/property/property-list';

// NEW (with @/features/* alias)
import { PropertyList } from '@/features/property/property-list';
```

**Service Imports:**
```typescript
// OLD
import { getPrismaClient } from '@/lib/services/database/database';

// NEW (with @/services/* alias)
import { getPrismaClient } from '@/services/database/database';
```

**Hook Imports:**
```typescript
// OLD
import { useFormDialog } from '@/lib/hooks/use-form-dialog';

// NEW (with @/hooks/* alias)
import { useFormDialog } from '@/hooks/use-form-dialog';
```

### Planned tsconfig.json Updates

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/ui/*": ["components/ui/*"],
      "@/features/*": ["components/features/*"],
      "@/services/*": ["lib/services/*"],
      "@/hooks/*": ["lib/hooks/*"],
      "@/schemas/*": ["lib/schemas/*"]
    }
  }
}
```

---

## Phase 3: API Route Organization (Pending)

### Financial Routes

**OLD:**
```typescript
// app/api/invoices/route.ts
// app/api/payments/route.ts
// app/api/receipts/route.ts
```

**NEW:**
```typescript
// app/api/financial/invoices/route.ts
// app/api/financial/payments/route.ts
// app/api/financial/receipts/route.ts
```

### Property Routes

**OLD:**
```typescript
// app/api/properties/route.ts
// app/api/units/route.ts
```

**NEW:**
```typescript
// app/api/property/properties/route.ts
// app/api/property/units/route.ts
```

### Tenant Routes

**OLD:**
```typescript
// app/api/tenants/route.ts
// app/api/leases/route.ts
```

**NEW:**
```typescript
// app/api/tenant/tenants/route.ts
// app/api/tenant/leases/route.ts
```

### Operations Routes

**OLD:**
```typescript
// app/api/maintenance/route.ts
// app/api/correspondence/route.ts
```

**NEW:**
```typescript
// app/api/operations/maintenance/route.ts
// app/api/operations/correspondence/route.ts
```

**Note**: External API URLs remain unchanged (Next.js routes match URL structure)

---

## Phase 2-3: Test File Co-location (Pending)

### Test Imports

**Pattern**: Update test imports to use `@/` aliases consistently

**OLD:**
```typescript
// tests/ui/button.test.tsx
import { Button } from '../../components/ui/button';
```

**NEW:**
```typescript
// components/ui/button.test.tsx (co-located)
import { Button } from '@/components/ui/button';
// OR with new alias
import { Button } from '@/ui/button';
```

### Test File Moves

**OLD Location:**
```
tests/
  ui/
    button.test.tsx
  hooks/
    use-form-dialog.test.tsx
  services/
    email-service.test.tsx
```

**NEW Location (Co-located):**
```
components/
  ui/
    button.tsx
    button.test.tsx
lib/
  hooks/
    use-form-dialog.ts
    use-form-dialog.test.ts
  services/
    email/
      email-service.ts
      email-service.test.ts
```

---

## Feature Barrel Exports (Pending)

### Simplified Imports with Barrel Exports

**After adding index.ts to feature directories:**

**OLD:**
```typescript
import { PropertyList } from '@/components/features/property/property-list';
import { PropertyForm } from '@/components/features/property/property-form';
import { PropertyDetail } from '@/components/features/property/property-detail';
```

**NEW:**
```typescript
import { PropertyList, PropertyForm, PropertyDetail } from '@/features/property';
```

**Barrel Export Files to be Created:**
- `components/features/property/index.ts`
- `components/features/tenant/index.ts`
- `components/features/lease/index.ts`
- `components/features/financial/index.ts`
- `components/features/dashboard/index.ts`
- `components/features/owner/index.ts`
- `components/features/maintenance/index.ts`
- `components/features/report/index.ts`
- `components/features/document/index.ts`
- `components/features/correspondence/index.ts`

---

## Migration Strategy

### Automated Codemod

We will use jscodeshift to automatically update imports in Phase 2:

```bash
# Install jscodeshift
npm install --save-dev jscodeshift

# Run codemod (script to be created)
npx jscodeshift -t scripts/codemods/update-component-imports.ts **/*.{ts,tsx}
```

### Manual Review Required

After automated updates:
1. Run `npm run type-check` to catch any import errors
2. Run `npm run build` to verify build succeeds
3. Run `npm test` to ensure tests still pass
4. Manually review any codemod changes before committing

### Rollback Plan

Each phase is committed separately:
- Phase 1 commit: Documentation + i18n + middleware
- Phase 2 commit: Legacy re-exports removal
- Phase 3 commit: Enhanced paths + barrel exports + API reorganization

Use `git reset --hard <commit-hash>` to rollback to any phase.

---

## Common Issues & Solutions

### Issue: Module Not Found Error

**Error:**
```
Module not found: Can't resolve '@/components/properties-view'
```

**Solution:**
Update import to use direct path:
```typescript
import { PropertiesView } from '@/components/features/property/property-list';
```

### Issue: Circular Dependency

**Error:**
```
Circular dependency detected
```

**Solution:**
Check barrel exports - avoid re-exporting from index.ts files that import each other

### Issue: Test Import Path Not Found

**Error:**
```
Cannot find module '../../components/ui/button'
```

**Solution:**
Update to use path alias:
```typescript
import { Button } from '@/components/ui/button';
```

---

## Timeline

- **Phase 1** (Current): Documentation, i18n, middleware - ✅ Complete
- **Phase 2** (Next): Legacy re-exports removal - In Progress
- **Phase 3** (Final): Enhanced paths, barrel exports, API reorganization - Planned

---

## Questions?

Contact the development team via:
- Slack: #proman-dev
- Email: dev-team@example.com

**Last Updated**: February 1, 2026
