# Releases

- Date: 2026-01-31
  - Version: v0.8.0
  - Image: `ghcr.io/jigle/proman:0.8.0`
  - Notes: Major feature release with payment system, tenant portal, and tax compliance
    - **Tenant Self-Service Portal**: Basic tenant portal for self-service operations
    - **Payment System**: Full payment integration for Portugal and Spain markets (MB Way, Multibanco, Bizum)
    - **Invoice-Payment Integration**: Link payments to invoices with reconciliation
    - **Portugal SAF-T PT Export**: Tax compliance export for Portuguese fiscal authorities
    - **Email Integration**: Complete email system with retry logic and metrics
    - **E2E Testing**: Comprehensive Playwright test suite for CI/CD
    - **CI/CD Fixes**: Workflow improvements for Prisma 7.x and Docker builds

- Date: 2026-01-29
  - Version: v0.7.0
  - Image: `ghcr.io/jigle/proman:0.7.0`
  - Notes: Major UI/UX improvements with search, filtering, sorting, export functionality, and comprehensive testing framework

- Date: 2026-01-10
  - Version: v0.1.1
  - Image: `ghcr.io/jigle/proman:0.1.1`
  - Notes: Bugfix: DB handling on first init — add post-install Prisma init job and include Prisma CLI in runtime image.
