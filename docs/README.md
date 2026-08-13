# Situs Documentation Index

Welcome to the Situs documentation. This index links to all available guides.

## Getting Started

- [Quick Start & README](../README.md) — Install, run, and deploy in minutes
- [.env.example](../.env.example) — Full list of environment variables with defaults
- [Roadmap](../ROADMAP.md) — Living single source of truth for shipped work + the **Decisions Log** (authoritative for architectural/IA decisions)
- [Development Roadmap](DEVELOPMENT_ROADMAP.md) — What's planned next
- [Sprint Board (2026 Q3)](SPRINT_BOARD_2026Q3.md) — Current execution board for the roadmap

## Strategy & Audits (current)

- [Product Audit 2026](PRODUCT_AUDIT_2026.md) — Product strategy, habit model, North-Star proposal
- [UX Audit 2026](UX_AUDIT_2026.md) — Canonical IA and the reconciled backlog status table
- [Architecture, Governance & Cognitive-Load Audit 2026](ARCHITECTURE_GOVERNANCE_AUDIT_2026.md) — Per-screen density + docs-vs-code drift
- [Mobile UX Audit](MOBILE_UX_AUDIT.md) — Mobile-first, behavioural findings
- [Design Award](DESIGN_AWARD.md) — Visual/token craft loop and scorecard

## Deployment

- [Deployment Guide](deployment.md) — Docker deployment instructions
- [TrueNAS SCALE Guide](truenas.md) — TrueNAS-specific setup, values, and troubleshooting
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
- [Production Deployment Checklist](PRODUCTION_DEPLOYMENT_CHECKLIST.md)

## Architecture & Design

- [Architecture Overview](architecture/)
- [Database Strategy](DATABASE_STRATEGY.md) — SQLite vs PostgreSQL, migrations, backups
- [Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)

## Security

- [Security Guide](SECURITY.md) — HMAC enforcement, init endpoint hardening, secrets management
- [Security Testing](SECURITY_TESTING.md)
- [CSP Nonce Implementation](CSP_NONCE_IMPLEMENTATION.md)
- [CSRF Integration](CSRF_INTEGRATION.md)

## Monitoring & Observability

- [Metrics & Monitoring Guide](METRICS_AND_MONITORING.md) — Structured logging, Prometheus, Grafana
- [Monitoring Quick Reference](MONITORING_QUICK_REFERENCE.md)
- [Monitoring Setup](MONITORING_SETUP.md)

## Integrations

- [Bizum Integration](BIZUM_INTEGRATION.md)
- [Email Retry Logic](EMAIL_RETRY_LOGIC.md)
- [Redis Rate Limiting](REDIS_RATE_LIMITING.md)
- [Webhook Templates](webhook-templates.md)

## UX & Accessibility

- [UI Consistency Guide](UI_CONSISTENCY_GUIDE.md)
- [Accessibility Improvements](ACCESSIBILITY_IMPROVEMENTS.md)
- [Accessibility Quick Reference](ACCESSIBILITY_QUICK_REFERENCE.md)
- [Storybook Guide](ux/STORYBOOK_GUIDE.md)

## Testing

- [Load Testing](LOAD_TESTING.md)
- [Playwright E2E Guide](../playwright/README.md)
- [Security Testing](SECURITY_TESTING.md)

## Contributing

- [Contributing Guide](../CONTRIBUTING.md)
- [Releases](../RELEASES.md)
- [Workflow Naming](workflow-naming.md)

## Archive

Superseded and point-in-time documents (completed phase summaries, dated audits, status
snapshots) move to [`archive/`](archive/) rather than staying at the top level — see
[`ARCHIVED.md`](ARCHIVED.md) for the parallel convention covering retired GitHub Actions
workflows. Kept for historical reference only; not authoritative.
