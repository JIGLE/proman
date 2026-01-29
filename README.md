[![CI Tests](https://github.com/JIGLE/proman/actions/workflows/ci-tests.yml/badge.svg)](https://github.com/JIGLE/proman/actions/workflows/ci-tests.yml)
[![Release - Publish to GHCR](https://github.com/JIGLE/proman/actions/workflows/release-publish.yml/badge.svg)](https://github.com/JIGLE/proman/actions/workflows/release-publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

# 🏠 ProMan — Property Management Dashboard

A modern, self-hosted property management system for property owners and managers. Built with Next.js, Prisma, and SQLite for easy deployment on TrueNAS SCALE or any Kubernetes cluster.

## ✨ Features

- 📋 **Property Management** - Manage properties, units, and tenants
- 💰 **Financial Tracking** - Receipts, expenses, and lease payments
- � **Advanced Search & Filtering** - Debounced search with multi-filter support
- 📊 **Data Export** - CSV export functionality across all views
- 📧 **Email Integration** - SendGrid webhooks for delivery tracking
- 🔐 **Secure Authentication** - Google OAuth with session management
- 🌍 **Multi-language** - English and Portuguese support
- 📱 **Responsive UI** - Modern interface with Tailwind CSS and shadcn/ui
- ⚡ **Enhanced UX** - Sortable columns, loading states, and consistent interactions
- 🚀 **Production Ready** - Container-based deployment with health checks

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Google OAuth credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using ProMan.

### Deploy to TrueNAS SCALE

See [TRUENAS_DEPLOYMENT.md](TRUENAS_DEPLOYMENT.md) for step-by-step instructions.

### Deploy with Docker

```bash
docker run -p 3000:3000 \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -v proman-data:/app/data \
  ghcr.io/JIGLE/proman:latest
```

## 📚 Documentation

- **[TrueNAS Deployment](TRUENAS_DEPLOYMENT.md)** - Complete TrueNAS SCALE setup guide
- **[SendGrid Webhooks](SENDGRID_WEBHOOKS.md)** - Email delivery tracking configuration
- **[Docker & Optimization](OPTIMIZATION.md)** - Image size optimization and monitoring
- **[Release Notes](RELEASES.md)** - Version history and changes

## 🔧 Configuration

### Environment Variables

See [.env.example](.env.example) for all available options. Key variables:

```bash
# Database
DATABASE_URL=file:./dev.db

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-random-secret

# Google OAuth
GOOGLE_ID=your-google-id
GOOGLE_SECRET=your-google-secret

# Email (SendGrid)
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_WEBHOOK_PUBLIC_KEY=your-public-key
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm test              # Run tests
npm run prisma:setup  # Initialize database
```

### Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with TypeScript
- **Database**: SQLite with [Prisma ORM](https://prisma.io/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Email**: [SendGrid API](https://sendgrid.com/)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)

## 🚢 Deployment & Releases

Releases are published to [GitHub Container Registry (GHCR)](https://ghcr.io/JIGLE/proman).

**To create a release:**

```bash
# 1. Update version in package.json
npm version X.Y.Z --no-git-tag-version

# 2. Commit changes
git add package.json package-lock.json
git commit -m "chore(release): X.Y.Z"

# 3. Create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

GitHub Actions will automatically:
- Build multi-architecture Docker images (amd64 + arm64)
- Publish to GHCR
- Package Helm charts
- Create a GitHub Release

### Image Tags

- `ghcr.io/JIGLE/proman:X.Y.Z` - Specific version
- `ghcr.io/JIGLE/proman:latest` - Latest release
- `ghcr.io/JIGLE/proman:SHA` - Git commit SHA

## 🔐 Security

- ✅ Non-root container user
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ SendGrid webhook signature verification
- ✅ Rate limiting on initialization endpoints
- ✅ Environment variable isolation (no hardcoded secrets)
- ✅ Input validation and sanitization

## 📊 Performance

- **Image size**: ~140-150 MB compressed (optimized Alpine base)
- **Startup time**: ~60 seconds (with database initialization)
- **Memory**: 256 MB base request
- **CPU**: 100m base request, 500m limit

See [OPTIMIZATION.md](OPTIMIZATION.md) for detailed performance metrics and tuning.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/JIGLE/proman/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JIGLE/proman/discussions)
- **Documentation**: See docs/ directory

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [TrueNAS](https://www.truenas.com/) - NAS platform
  - Set `dry_run=true` and optionally `version=X.Y.Z` to override.
  - The workflow uploads `release-charts` as an artifact and shows a release-note preview for inspection.

- Notes & safeguards:
  - Tag-triggered runs assert that the tag version (without `v`) matches `package.json` — if they differ the run will fail and prompt you to resolve the mismatch.
  - Use the `version` workflow input when using manual dispatch to override version detection.

When restarting or updating the app in TrueNAS SCALE:
- Use the specific image tag from the release (do not rely on `latest`).
- Verify runtime version:
  - GET `/version.json` (returns `{"version","git_commit","build_time"}`).
  - `kubectl get deployment proman -o yaml` and inspect `metadata.annotations` for `app.kubernetes.io/version` or `proman.image`.

### Post-install checks and troubleshooting
- Check pod status and logs:
  ```bash
  kubectl get pods -l app=proman -n <namespace> -o wide
  kubectl logs deployment/proman -n <namespace> --tail=200
  kubectl describe pod <pod-name> -n <namespace>
  ```
- If the app is `Running` but unreachable externally:
  - If you used NodePort, curl the node IP and port: `curl -v http://<node-ip>:<node-port>`.
  - Use port-forward to test locally: `kubectl port-forward svc/proman 3000:80 -n <namespace>` then `curl http://localhost:3000`.
- If you see database permission errors, confirm the dataset is mounted at `/data` and writable by the container (fsGroup in deployment can help).
- Ensure `NEXTAUTH_URL` matches the externally reachable URL (used by NextAuth redirects).

### Database initialization & recovery
If you see an error like `no such table: main.users` the SQLite database file exists but the Prisma schema (tables) were not applied. The Helm chart includes a post-install/post-upgrade Job that will automatically apply the Prisma schema when `persistence.enabled` is true (it runs `npx prisma db push && npx prisma generate`). You have two safe options to initialize the schema.

1) Use the built-in init endpoint (recommended)

- If you configured `INIT_SECRET` (recommended), send Authorization header:

```bash
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" http://<node-ip>:<node-port>/api/debug/db/init | jq
```

- If you did not set `INIT_SECRET` (dev/test):

```bash
curl -sS -X POST http://<node-ip>:<node-port>/api/debug/db/init | jq
```

- Expected success: `{ "ok": true, "dbPath": "/data/proman.sqlite", "pushOut": "...", "genOut": "..." }`

2) Run Prisma commands manually inside the running container or Pod

- Docker:

```bash
docker exec -it <container> sh -c 'npx prisma db push && npx prisma generate'
```

- Kubernetes:

```bash
kubectl exec -it <pod> -- npx prisma db push && kubectl exec -it <pod> -- npx prisma generate
```

Verify tables exist:

```bash
# inside host/container where /data is mounted
sqlite3 /data/proman.sqlite '.tables'
```

Temporary emergency fallback

- You can allow sign-ins while DB is broken (not recommended long-term) by setting the environment variable `NEXTAUTH_ALLOW_DB_FAILURE=true` in your App/Helm values. This bypasses DB-dependent creation and lets sign-in proceed.

Notes
- The `POST /api/debug/db/init` route will create the DB file (if missing), run `npx prisma db push` and `npx prisma generate` (skipped in `NODE_ENV=test`). Protect it with `INIT_SECRET` in production to avoid unauthorized schema changes.
- After successful init, retry the sign-in flow — the `signIn` callback will create the user record on first login if needed.


### Security & registry notes
- Public GHCR image: `ghcr.io/jigle/proman:<tag>` is available and can be pulled without credentials; prefer a fixed tag (e.g., `ghcr.io/jigle/proman:0.1.1`) for reproducible deployments.
- Private registry: if you use a private GHCR image set registry credentials (PAT with `read:packages`) in SCALE.

### Removing the app
- If installed via Helm: `helm uninstall proman` or remove via the SCALE Apps UI.

If you want, I can:
- Render a ready-to-install YAML (with your nodePort, hostname and secrets redacted), or
- Help test a live install (port-forward, logs parsing) if you provide the cluster outputs.

License: MIT
```



