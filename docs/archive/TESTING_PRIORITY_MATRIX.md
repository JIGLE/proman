# ProMan Testing Priority Matrix

**Quick Reference for What Needs Testing**

---

## Critical Testing Gaps (Tier 1 - Do First)

### Payment Processing (0% tested - REVENUE CRITICAL)

| Component           | Path                              | Status | Impact   | Est. Tests |
| ------------------- | --------------------------------- | ------ | -------- | ---------- |
| Payment Service     | `lib/payment/payment-service.ts`  | ❌ 0%  | CRITICAL | 50+        |
| Portugal Payments   | `lib/payment/methods/portugal.ts` | ❌ 0%  | CRITICAL | 40+        |
| Spain Payments      | `lib/payment/methods/spain.ts`    | ❌ 0%  | CRITICAL | 30+        |
| Stripe Webhook      | `/api/webhooks/stripe`            | ❌ 0%  | CRITICAL | 40+        |
| Payment Intents API | `/api/payments/*`                 | ❌ 0%  | CRITICAL | 50+        |
| Payment Methods API | `/api/payments/methods/*`         | ❌ 0%  | CRITICAL | 30+        |
| SEPA Mandates API   | `/api/payments/sepa-mandates/*`   | ❌ 0%  | HIGH     | 25+        |

**Why**: Payment processing is revenue-critical. No tests means:

- Lost or corrupted payments risk
- Compliance violations
- Data inconsistencies
- No error handling validation

---

### Financial Calculations (0% tested - COMPLIANCE CRITICAL)

| Component           | Path                                  | Status | Impact   | Est. Tests |
| ------------------- | ------------------------------------- | ------ | -------- | ---------- |
| Tax Calculator      | `lib/tax/tax-calculator.ts`           | ❌ 0%  | CRITICAL | 60+        |
| Financial Reports   | `lib/services/financial-reports.ts`   | ❌ 0%  | CRITICAL | 40+        |
| Income Distribution | `lib/services/income-distribution.ts` | ❌ 0%  | HIGH     | 30+        |
| Tax API             | `/api/tax/*`                          | ❌ 0%  | CRITICAL | 35+        |
| Rent Receipts       | `/api/compliance/rent-receipts`       | ❌ 0%  | CRITICAL | 30+        |

**Why**: Portugal & Spain require accurate tax reporting:

- IRS audit risk
- Tenant disputes
- Legal liability
- Regulatory penalties

---

### Invoice Management (0% tested - DATA CRITICAL)

| Component              | Path                                  | Status | Impact | Est. Tests |
| ---------------------- | ------------------------------------- | ------ | ------ | ---------- |
| Invoice Service        | `lib/services/invoice-service.ts`     | ❌ 0%  | HIGH   | 50+        |
| Invoice CRUD API       | `/api/invoices/[id]`                  | ❌ 0%  | HIGH   | 40+        |
| Invoice List API       | `/api/invoices`                       | ❌ 0%  | HIGH   | 20+        |
| Payment Initiation     | `/api/invoices/[id]/initiate-payment` | ❌ 0%  | HIGH   | 30+        |
| Invoice Status Updates | `/api/invoices/[id]/pay`              | ❌ 0%  | HIGH   | 25+        |

**Why**: Core data operation with no test coverage:

- No validation of business rules
- No error case coverage
- No concurrency testing
- Data corruption risk

---

## High Priority Testing (Tier 2 - Add Next Sprint)

### Core CRUD APIs (0% tested - DATA INTEGRITY RISK)

| API Endpoint                          | Status | Scenarios                        | Est. Tests |
| ------------------------------------- | ------ | -------------------------------- | ---------- |
| `GET/POST /api/tenants`               | ❌ 0%  | List, Create, Filter, Pagination | 30+        |
| `GET/PUT/DELETE /api/tenants/[id]`    | ❌ 0%  | Read, Update, Delete, Validation | 25+        |
| `GET/POST /api/properties`            | ❌ 0%  | List, Create, Filter             | 30+        |
| `GET/PUT/DELETE /api/properties/[id]` | ❌ 0%  | Read, Update, Delete             | 25+        |
| `GET/POST /api/leases`                | ❌ 0%  | List, Create, Validation         | 30+        |
| `GET/PUT/DELETE /api/leases/[id]`     | ❌ 0%  | Read, Update, Delete, Status     | 30+        |
| `GET/POST /api/units`                 | ❌ 0%  | List, Create, Validation         | 25+        |
| `GET/PUT/DELETE /api/units/[id]`      | ❌ 0%  | Read, Update, Delete             | 20+        |
| `GET/POST /api/receipts`              | ❌ 0%  | List, Create, Filter             | 25+        |
| `GET/PUT/DELETE /api/receipts/[id]`   | ❌ 0%  | Read, Update, Delete             | 20+        |
| `GET/POST /api/owners`                | ❌ 0%  | List, Create, Validation         | 20+        |

**Total Tier 2 Tests**: ~330 test cases

---

### React Component Logic (0-5% tested - UX RISK)

| Component                | Path                                  | Coverage | Est. Tests |
| ------------------------ | ------------------------------------- | -------- | ---------- |
| CorrespondenceView       | `components/features/correspondence/` | 5%       | 50+        |
| FinancialsView           | `components/features/financial/`      | 15%      | 50+        |
| OverviewView (Dashboard) | `components/features/dashboard/`      | 52%      | 30+        |
| Tenant CRUD Form         | `components/features/tenant/`         | 0%       | 40+        |
| Property CRUD Form       | `components/features/property/`       | 0%       | 40+        |
| Lease Management         | `components/features/lease/`          | 0%       | 35+        |
| Payment Form             | `components/features/payments/`       | 0%       | 35+        |

**Total Component Tests**: ~280 test cases

---

## Testing Coverage Matrix

### By Feature Area

```
PAYMENTS:
  πŸ"΄ Payment Service Layer        : 0% → 90% (120 tests)
  πŸ"δ Payment API Routes           : 0% → 85% (100 tests)
  πŸ"΄ Stripe Webhooks             : 0% → 80% (40 tests)
  🟠 Payment Methods UI           : 0% → 70% (50 tests)
  Total: 310 tests needed

FINANCIAL:
  πŸ"΄ Tax Calculations            : 0% → 85% (70 tests)
  πŸ"δ Financial Reports           : 0% → 80% (50 tests)
  πŸ"δ Invoice Management          : 0% → 85% (95 tests)
  🟠 Receipt Generation           : 0% → 75% (35 tests)
  Total: 250 tests needed

CORE DATA:
  🟠 Tenant CRUD                  : 0% → 80% (55 tests)
  🟠 Property CRUD                : 0% → 80% (55 tests)
  🟠 Lease CRUD                   : 0% → 80% (60 tests)
  🟠 Unit CRUD                    : 0% → 75% (45 tests)
  🟠 Receipt CRUD                 : 0% → 75% (45 tests)
  Total: 260 tests needed

UI/COMPONENTS:
  🟡 Dashboard Components         : 0% → 70% (60 tests)
  🟡 Form Components              : 0% → 70% (150 tests)
  🟡 Modal/Dialog Components      : 0% → 70% (40 tests)
  Total: 250 tests needed

UTILITIES:
  βœ… Already Good (70%+)          : Keep as-is
```

### Test Execution Plan

```
MONTH 1 (Weeks 1-4): CRITICAL PAYMENT FLOWS
├─ Week 1: Payment Service (.test.ts)        [120 tests, 2 dev-days]
├─ Week 2: Payment APIs (route.test.ts)      [100 tests, 2 dev-days]
├─ Week 3: Stripe Webhook Handler            [40 tests, 1 dev-day]
├─ Week 4: E2E Payment Workflows              [15 E2E scenarios, 2 dev-days]
└─ Result: Payment feature 85%+ coverage

MONTH 2 (Weeks 5-8): FINANCIAL & TAX
├─ Week 5: Tax Calculator & Reports          [120 tests, 2 dev-days]
├─ Week 6: Invoice Service & APIs            [95 tests, 2 dev-days]
├─ Week 7: Rent Receipt Generation           [35 tests, 1 dev-day]
├─ Week 8: E2E Financial Workflows            [10 E2E scenarios, 1 dev-day]
└─ Result: Financial feature 80%+ coverage

MONTH 3 (Weeks 9-12): CORE APIS
├─ Week 9:  Tenant/Property CRUD              [110 tests, 2 dev-days]
├─ Week 10: Lease CRUD                        [60 tests, 1 dev-day]
├─ Week 11: Unit/Receipt CRUD                 [90 tests, 1.5 dev-days]
├─ Week 12: API Edge Cases & Errors           [40 tests, 1 dev-day]
└─ Result: Core API 75%+ coverage

MONTH 4 (Weeks 13-16): COMPONENTS
├─ Week 13: Dashboard Components              [60 tests, 2 dev-days]
├─ Week 14: Form Components (Part 1)          [75 tests, 2 dev-days]
├─ Week 15: Form Components (Part 2)          [75 tests, 2 dev-days]
├─ Week 16: Modal/Dialog Components           [40 tests, 1 dev-day]
└─ Result: Component coverage 65%+

TOTAL: ~1,150 test cases over 4 months
```

---

## Quick Test Writing Checklist

### For Each Payment Service Test

```
βŒ Arrange: Set up mock data (payment intent params)
βŒ Act: Call service method (createPaymentIntent, etc)
βŒ Assert: Verify response (success, error, side effects)

Include:
βŒ Happy path (valid input)
βŒ Validation errors (invalid input)
βŒ External service failures (Stripe down)
βŒ Rate limiting (too many requests)
βŒ Timeout handling
βŒ Retry logic
```

### For Each API Route Test

```
βŒ Test authentication requirement
βŒ Test authorization (own data only)
βŒ Test input validation
βŒ Test business logic
βŒ Test error responses
βŒ Test pagination (for list endpoints)
βŒ Test filtering/sorting
βŒ Test race conditions
```

### For Each Component Test

```
βŒ Test rendering (component exists)
βŒ Test user interactions (clicks, inputs)
βŒ Test data display
βŒ Test error states
βŒ Test loading states
βŒ Test form submission
βŒ Test validation feedback
βŒ Test accessibility
```

---

## Tools & Setup

### Phase 1 Tools (Already Available)

- βœ… Vitest (unit testing)
- βœ… Playwright (E2E testing)
- βœ… Prisma (database access)

### Phase 2 Tools (Need to Add)

- βŒ React Testing Library (component testing)
- βŒ MSW (Mock Service Worker)
- βŒ faker.js (test data generation)
- βŒ Testcontainers (database for integration tests)

### Phase 3 Tools (Optional/Advanced)

- Stripe Test Fixtures (payment testing)
- SendGrid Test Endpoint (email testing)
- Codecov Coverage Dashboard
- Performance Benchmarking

---

## Key Files to Test (Sorted by Priority)

### Tier 1: Revenue Critical

```
1. lib/payment/payment-service.ts
2. lib/payment/methods/portugal.ts
3. lib/payment/methods/spain.ts
4. app/api/webhooks/stripe/route.ts
5. app/api/payments/route.ts
6. lib/tax/tax-calculator.ts
7. lib/services/financial-reports.ts
8. lib/services/invoice-service.ts
9. app/api/invoices/[id]/route.ts
10. app/api/compliance/rent-receipts/route.ts
```

### Tier 2: Data Integrity

```
11. app/api/tenants/route.ts
12. app/api/tenants/[id]/route.ts
13. app/api/properties/route.ts
14. app/api/properties/[id]/route.ts
15. app/api/leases/route.ts
16. app/api/leases/[id]/route.ts
17. app/api/units/route.ts
18. app/api/units/[id]/route.ts
19. app/api/receipts/route.ts
20. app/api/receipts/[id]/route.ts
```

### Tier 3: UX/Components

```
21. components/features/correspondence/correspondence-view.tsx
22. components/features/financial/financials-view.tsx
23. components/features/dashboard/overview-view.tsx
24. components/features/tenant/ (all forms)
25. components/features/property/ (all forms)
```

---

## Success Criteria

### Coverage Goals

| Metric           | Current | Target | Pass/Fail |
| ---------------- | ------- | ------ | --------- |
| Statements       | 20%     | 75%    | βŒ        |
| Branches         | 15%     | 70%    | βŒ        |
| Functions        | 18%     | 80%    | βŒ        |
| Critical Paths\* | 0%      | 95%    | βŒ        |
| Payment Flow     | 0%      | 90%    | βŒ        |
| Tax Calculations | 0%      | 85%    | βŒ        |
| API Routes       | 20%     | 85%    | βŒ        |
| Components       | 10%     | 70%    | βŒ        |

\*Critical paths = Payment processing, tax calculations, data integrity operations

### Quality Gates

```
✓ All new features must have tests
✓ Coverage must not decrease
✓ Critical paths must be >80% covered
✓ No flaky tests (100% pass rate)
✓ All E2E tests pass before merge
✓ Performance benchmarks met
```

---

**Generated**: March 29, 2026  
**Status**: Ready for implementation  
**Estimated Effort**: 8-12 weeks (1-2 developers)  
**Priority**: URGENT - Critical business logic untested
