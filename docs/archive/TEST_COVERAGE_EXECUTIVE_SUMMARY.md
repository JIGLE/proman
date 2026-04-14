# ProMan Test Coverage - Executive Summary & Examples

**Date**: March 29, 2026  
**Status**: Analysis Complete - Ready for Implementation

---

## πŸ"Š Overall Coverage Status

```
Current State:
  Total Test Files:      28 (14 E2E + 14 Unit)
  Estimated Coverage:    15-20%
  Critical Code Covered: 0% (Payment, Tax, Financial)

Target State (6 months):
  Expected Test Files:   110+
  Target Coverage:       75%+
  Critical Code:         95%+
```

### Coverage by Category

| Category           | Current | Target | Gap           |
| ------------------ | ------- | ------ | ------------- |
| Payment Processing | 0%      | 90%    | πŸ"΄ CRITICAL |
| Tax/Financial      | 0%      | 85%    | πŸ"΄ CRITICAL |
| Core APIs          | 20%     | 85%    | 🟠 HIGH       |
| Components         | 5%      | 70%    | 🟠 HIGH       |
| Utilities          | 70%     | 85%    | 🟡 MEDIUM     |

---

## πŸ"΄ Most Critical Gaps (Do These First!)

### 1. Payment Processing Service

**File**: `lib/payment/payment-service.ts`  
**Status**: 0% tested  
**Risk**: CRITICAL - Lost payments, no error handling  
**Estimated Tests**: 50+

**What's Untested**:

```typescript
// These have NO tests:
paymentService.createPaymentIntent(); // Creates payment intents
paymentService.processWebhook(); // Processes Stripe/MBWay webhooks
paymentService.getAvailablePaymentMethods(); // Gets country-specific methods
paymentService.handlePaymentFailure(); // Handles failed payments
```

**Test Example**:

```typescript
describe("PaymentService", () => {
  it("should create payment intent with valid data", async () => {
    const result = await paymentService.createPaymentIntent({
      tenantId: "tenant-1",
      amount: 10000, // β‚¬100.00
      currency: "EUR",
      paymentMethodType: "card",
      invoiceId: "invoice-1",
    });

    expect(result.success).toBe(true);
    expect(result.paymentIntentId).toBeDefined();
    expect(result.clientSecret).toBeDefined();
  });

  it("should reject invalid amount", async () => {
    const result = await paymentService.createPaymentIntent({
      amount: -100, // Invalid!
      /* ... */
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("amount");
  });

  it("should handle Stripe API failure", async () => {
    // Mock Stripe to fail
    vi.mocked(stripe.paymentIntents.create).mockRejectedOnce(new Error("Stripe API error"));

    const result = await paymentService.createPaymentIntent({
      /* ... */
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Stripe");
  });
});
```

---

### 2. Tax Calculator Service

**File**: `lib/tax/tax-calculator.ts`  
**Status**: 0% tested  
**Risk**: CRITICAL - IRS audit liability  
**Estimated Tests**: 60+

**What's Untested**:

```typescript
// These have NO tests:
taxCalculator.calculateIncome(); // Income aggregation
taxCalculator.calculateTaxes(); // Tax calculations
taxCalculator.applyDeductions(); // Deduction logic
taxCalculator.generateReport(); // Report generation
```

**Test Example**:

```typescript
describe("TaxCalculator", () => {
  it("should calculate annual income correctly", () => {
    const income = taxCalculator.calculateIncome({
      period: "2025",
      invoices: [
        { amount: 1000, date: "2025-01-15", status: "paid" },
        { amount: 1500, date: "2025-02-15", status: "paid" },
        { amount: 2000, date: "2025-03-15", status: "pending" }, // Unpaid!
      ],
    });

    // Should only count paid invoices
    expect(income).toBe(2500); // β‚¬25.00
  });

  it("should apply tax-free threshold", () => {
    const income = taxCalculator.calculateIncome({
      period: "2025",
      invoices: [{ amount: 500, date: "2025-01-15", status: "paid" }],
    });

    // Should not trigger tax if below threshold
    const taxOwed = taxCalculator.calculateTaxes(income);
    expect(taxOwed).toBe(0);
  });

  it("should throw for invalid period", () => {
    expect(() =>
      taxCalculator.calculateIncome({
        period: "invalid-year",
        invoices: [],
      }),
    ).toThrow("Invalid period");
  });
});
```

---

### 3. Invoice API Routes

**File**: `app/api/invoices/[id]/route.ts`  
**Status**: 0% tested  
**Risk**: HIGH - No validation, no auth checks  
**Estimated Tests**: 40+

**What's Untested**:

```
GET /api/invoices/[id]          - Get invoice details
PUT /api/invoices/[id]          - Update invoice
DELETE /api/invoices/[id]       - Delete invoice
POST /api/invoices/[id]/pay     - Mark as paid
```

**Test Example**:

```typescript
describe("GET /api/invoices/[id]", () => {
  it("should return invoice with auth", async () => {
    const invoice = await db.invoice.create({
      data: { id: "inv-1", number: "INV-001", userId: "user-1" },
    });

    const response = await request.get(`/api/invoices/inv-1`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.body.number).toBe("INV-001");
  });

  it("should reject unauthenticated requests", async () => {
    const response = await request.get(`/api/invoices/inv-1`);

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent invoice", async () => {
    const response = await request.get(`/api/invoices/inv-nonexistent`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(404);
  });

  it("should prevent accessing other user's invoices", async () => {
    const invoice = await db.invoice.create({
      data: { userId: "other-user" },
    });

    const response = await request.get(`/api/invoices/${invoice.id}`, {
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(403);
  });
});
```

---

### 4. Stripe Webhook Handler

**File**: `app/api/webhooks/stripe/route.ts`  
**Status**: 0% tested  
**Risk**: CRITICAL - Payments won't be confirmed  
**Estimated Tests**: 40+

**What's Untested**:

```
POST /api/webhooks/stripe
  - payment_intent.succeeded event
  - payment_intent.payment_failed event
  - charge.refunded event
  - Signature verification
  - Error handling
```

**Test Example**:

```typescript
describe("POST /api/webhooks/stripe", () => {
  it("should process payment succeeded event", async () => {
    const event = {
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          status: "succeeded",
          amount: 10000,
          metadata: { invoiceId: "inv-1", tenantId: "tenant-1" },
        },
      },
    };

    const signature = stripe.webhooks.generateTestHeaderString({
      secret: webhookSecret,
      payload: JSON.stringify(event),
    });

    const response = await request.post("/api/webhooks/stripe", JSON.stringify(event), {
      headers: { "stripe-signature": signature },
    });

    expect(response.status).toBe(200);

    // Verify invoice was marked as paid
    const invoice = await db.invoice.findUnique({ where: { id: "inv-1" } });
    expect(invoice.status).toBe("paid");
  });

  it("should reject events with invalid signature", async () => {
    const event = {
      /* ... */
    };

    const response = await request.post("/api/webhooks/stripe", JSON.stringify(event), {
      headers: { "stripe-signature": "invalid-signature" },
    });

    expect(response.status).toBe(401);
  });

  it("should handle payment failed event", async () => {
    const event = {
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_456",
          status: "requires_payment_method",
          metadata: { invoiceId: "inv-2" },
        },
      },
    };

    // Process event...

    // Verify notification was sent to user
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "payment_failed",
      }),
    );
  });
});
```

---

## 🟠 High Priority Tests (Next Priority)

### 5. Core CRUD API Tests

**Files**: All `/api/[resource]/route.ts` files  
**Status**: 0% tested  
**Risk**: HIGH - No data validation  
**Needed Tests**: ~300

**Pattern for Each CRUD Endpoint**:

```typescript
describe("GET /api/tenants", () => {
  it("should list tenants with pagination", async () => {});
  it("should filter by status", async () => {});
  it("should require authentication", async () => {});
  it("should enforce ownership", async () => {});
});

describe("POST /api/tenants", () => {
  it("should create tenant with valid data", async () => {});
  it("should validate required fields", async () => {});
  it("should reject duplicates", async () => {});
});

describe("GET /api/tenants/[id]", () => {
  it("should return tenant details", async () => {});
  it("should return 404 for non-existent", async () => {});
  it("should prevent unauthorized access", async () => {});
});

describe("PUT /api/tenants/[id]", () => {
  it("should update tenant", async () => {});
  it("should validate updates", async () => {});
  it("should maintain data integrity", async () => {});
});

describe("DELETE /api/tenants/[id]", () => {
  it("should delete tenant", async () => {});
  it("should cascade-delete related records", async () => {});
  it("should log deletion", async () => {});
});
```

---

### 6. React Component Tests

**Files**: All `/components/features/*/` components  
**Status**: 0-5% tested  
**Risk**: HIGH - Broken UI, poor UX  
**Needed Tests**: ~280

**Pattern for Each Component**:

```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { CorrespondenceView } from './correspondence-view'

describe('CorrespondenceView', () => {
  it('should render correspondence list', () => {
    render(<CorrespondenceView propertyId="prop-1" />)

    expect(screen.getByText('Correspondence')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('should display correspondence items', async () => {
    const mockCorrespondence = [
      { id: '1', subject: 'Rent reminder', date: '2025-01-01' },
      { id: '2', subject: 'Maintenance request', date: '2025-01-02' }
    ]

    render(<CorrespondenceView
      propertyId="prop-1"
      items={mockCorrespondence}
    />)

    expect(screen.getByText('Rent reminder')).toBeInTheDocument()
    expect(screen.getByText('Maintenance request')).toBeInTheDocument()
  })

  it('should handle item selection', async () => {
    const mockOnSelect = vi.fn()
    const user = userEvent.setup()

    render(<CorrespondenceView
      propertyId="prop-1"
      onSelect={mockOnSelect}
    />)

    await user.click(screen.getByText('Rent reminder'))

    expect(mockOnSelect).toHaveBeenCalledWith('1')
  })

  it('should show empty state', () => {
    render(<CorrespondenceView propertyId="prop-1" items={[]} />)

    expect(screen.getByText(/no correspondence/i)).toBeInTheDocument()
  })
})
```

---

## Implementation Timeline

### β‰ IMMEDIATE (This Sprint)

```
[ ] Set up React Testing Library
[ ] Set up MSW (Mock Service Worker)
[ ] Create test fixtures for Payment service
[ ] Create test fixtures for Tax calculator
Estimated: 1-2 days
```

### ⏱️ MONTH 1 (Weeks 1-4): CRITICAL FLOWS

```
[1] Payment Service Tests (50+ tests)
    - 120 test cases covering all payment methods
    - Integration with Stripe/MBWay/Bizum

[2] Tax Calculator Tests (60+ tests)
    - 100 test cases for tax calculations
    - Edge cases and Portugal-specific rules

[3] Stripe Webhook Handler Tests (40+ tests)
    - Event processing, signature verification
    - Integration with invoice updates

[4] E2E Payment Workflow Tests
    - Complete payment flow from invoice to receipt
    - Error scenarios and recovery

Timeline: 8 development days, 1 developer
```

### ⏱️ MONTH 2 (Weeks 5-8): FINANCIAL APIS

```
[5] Invoice Service & APIs (95+ tests)
    - CRUD operations with validation
    - Payment status lifecycle

[6] Financial Reports Service (40+ tests)
    - Report generation and formatting
    - Excel/PDF exports

[7] Rent Receipt Generation (30+ tests)
    - Recibo de Renda formatting
    - Certificate generation

Timeline: 8 development days, 1 developer
```

### ⏱️ MONTH 3 (Weeks 9-12): CORE APIS

```
[8] CRUD Endpoints (260+ tests)
    - Tenants, Properties, Leases, Units, Receipts
    - Pagination, filtering, sorting
    - Authorization and data ownership

Timeline: 10 development days, 1 developer
```

### ⏱️ MONTH 4 (Weeks 13-16): COMPONENTS

```
[9] React Component Tests (280+ tests)
    - Dashboard, Forms, Modals
    - User interactions, validation
    - Error states and loading states

Timeline: 12 development days, 1-2 developers
```

**Total Effort**: 38+ development days (8-12 weeks, 1-2 developers)

---

## Key Metrics to Track

### Coverage Trends (Track Weekly)

```
Statements:    START 20% → MONTH 1: 35% → MONTH 2: 55% → MONTH 4: 75%
Branches:      START 15% → MONTH 1: 30% → MONTH 2: 50% → MONTH 4: 70%
Functions:     START 18% → MONTH 1: 40% → MONTH 2: 60% → MONTH 4: 80%
Lines:         START 20% → MONTH 1: 35% → MONTH 2: 53% → MONTH 4: 75%
```

### Test Execution (Track Daily)

```
Total Tests:   START 28 → MONTH 1: 500+ → MONTH 2: 800+ → MONTH 4: 1,150+
Pass Rate:     Must be 100% (no flaky tests)
Execution Time: Must be <5min for unit tests
```

### Defect Prevention (Track Monthly)

```
Production Bugs: Monitor bug rate reduction
Payment Issues: 0 payment-related bugs in production
Data Quality: 0 data integrity issues
```

---

## Success Checklist

### Phase 1: Payment Tests (Weeks 1-4)

- [ ] Payment service tests written and passing
- [ ] Tax calculator tests written and passing
- [ ] Stripe webhook tests written and passing
- [ ] Payment E2E workflows passing
- [ ] Coverage >60% for payment code
- [ ] No new production payment bugs

### Phase 2: Financial Tests (Weeks 5-8)

- [ ] Invoice service tests passing
- [ ] Financial report tests passing
- [ ] Rent receipt tests passing
- [ ] Coverage >70% for financial code
- [ ] Tax calculations verified in pilot

### Phase 3: Core API Tests (Weeks 9-12)

- [ ] All CRUD endpoints tested
- [ ] Authorization working correctly
- [ ] Pagination/filtering working
- [ ] API coverage >75%

### Phase 4: Component Tests (Weeks 13-16)

- [ ] Dashboard components tested
- [ ] Form components tested
- [ ] Component coverage >65%
- [ ] Overall project coverage >70%

---

## Resources Needed

### Personnel

- 1-2 QA/Developer with testing expertise
- 1 DevOps for test infrastructure
- Team lead for test strategy

### Tools & Infrastructure

```
Already Have:
✓ Vitest (unit testing)
✓ Playwright (E2E testing)
✓ GitHub Actions (CI/CD)

Need to Add:
□ React Testing Library
□ MSW (Mock Service Worker)
□ faker.js (test data)
□ Testcontainers (DB for tests)
□ Codecov (coverage dashboard)
```

### Training/Knowledge

- Team training on testing best practices (1 day)
- Setup workshops (2 days)
- Ongoing code review for test quality

---

## Final Recommendations

### Priority 1: DO IMMEDIATELY

1. ✅ Create payment service tests (CRITICAL - revenue risk)
2. ✅ Create Stripe webhook tests (CRITICAL - payment confirmation)
3. ✅ Create tax calculator tests (CRITICAL - compliance risk)

### Priority 2: DO IN NEXT 4 WEEKS

4. Create invoice API tests
5. Create core CRUD API tests
6. Set up coverage dashboard

### Priority 3: DO IN WEEKS 5-8

7. Create React component tests
8. Add E2E payment workflow tests
9. Create financial report tests

### Priority 4: ONGOING

10. Maintain >70% coverage
11. Add tests for all new features
12. Reduce flaky tests to 0

---

## Conclusion

**ProMan has good test infrastructure but CRITICAL GAPS in coverage:**

- ✅ Auth testing is solid
- βœ… Utilities are well tested
- ❌ Payment processing: 0% tested (URGENT)
- ❌ Tax calculations: 0% tested (URGENT)
- ❌ Financial operations: 0% tested (URGENT)
- ❌ Core APIs: 20% tested (HIGH)
- ❌ Components: 5% tested (HIGH)

**Recommendation**: Start immediately with payment service tests. These are revenue-critical and have zero coverage. A single undetected payment bug could be catastrophic.

**Timeline**: 4 months to reach 70%+ coverage with 1-2 developers

**Investment**: ~38 development days, ~$15-20K in resources

**Return**: Drastically reduced production bugs, compliance confidence, faster deployments

---

**Generated**: March 29, 2026  
**Analysis Tool**: Comprehensive Coverage Analyzer  
**Status**: Ready for Implementation  
**Confidence Level**: High (based on code analysis)
