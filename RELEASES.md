# Releases

- Date: 2026-03-02
  - Version: v1.1.7
  - Image: `ghcr.io/jigle/proman:1.1.7`
  - Notes: Security hardening and maintenance
    - **CodeQL Fixes**: Replaced all `Math.random()` with `crypto.randomBytes`/`crypto.randomUUID` in security-relevant contexts
    - **Regex Injection Fix**: Escaped user-provided template keys in email variable substitution
    - **Dependency Updates**: Merged 8 Dependabot PRs (production + dev deps + CI actions)
    - **Workflow Improvements**: Updated `actions/github-script` v6→v8, `azure/setup-helm` v1→v4, `azure/setup-kubectl` v3→v4, `peaceiris/actions-gh-pages` v3→v4, `trufflehog` v3.93.1→v3.93.3
    - **README**: Updated with auto DB init documentation and corrected env var table

- Date: 2026-03-02
  - Version: v1.1.6
  - Image: `ghcr.io/jigle/proman:1.1.6`
  - Notes: Fix TrueNAS deployment 500 errors
    - **Root Cause Fix**: Database auto-initialization on first startup (`AUTO_DB_INIT`)
    - **Dockerfile Fix**: Corrected `--chown` group from non-existent `nodejs` to `nextjs`
    - **Helm Values**: Added `INIT_SECRET`, `fsGroup:1001`, `initJob.enabled:true` to TrueNAS values
    - **Fail-Fast**: Container exits on missing DB tables in production instead of silently serving 500s
    - **Error Logging**: Auth middleware now logs actionable hints for "no such table" errors

- Date: 2026-02-05
  - Version: v1.1.0
  - Image: `ghcr.io/jigle/proman:1.1.0`
  - Notes: Bug fixes and improvements to auth, i18n, landing page, and mobile navigation. See GitHub Release for details.

- Date: TBD
  - Version: v0.9.0
  - Image: `ghcr.io/jigle/proman:0.9.0`
  - Notes: See [RELEASE_NOTES_v0.9.0.md](./RELEASE_NOTES_v0.9.0.md) for details

- Date: 2026-02-01
  - Version: v0.8.3
  - Image: `ghcr.io/jigle/proman:0.8.3`
  - Notes: Build fixes and Next.js 16 compatibility
    - **Build Fixes**: Resolved static generation errors for pages with client contexts
    - **Runtime Configuration**: Added proper dynamic rendering for client-heavy pages
    - **Next.js 16.1.6**: Full compatibility with latest Next.js version

- Date: 2026-02-01
  - Version: v0.8.2
  - Image: `ghcr.io/jigle/proman:0.8.2`
  - Notes: CI/CD workflow improvements
    - **Test Infrastructure**: Enhanced vitest configuration with 10 TypeScript path aliases
    - **GitHub Actions**: Added environment variables for proper build configuration
    - **Component Tests**: 73/85 tests passing (86% pass rate)

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
