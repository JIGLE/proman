---
name: Release checklist
about: Create a new release with a short checklist to ensure stabilty and reproducibility
---

# Release checklist
- [ ] Bump package version (package.json & package-lock.json)
- [ ] Run `npm test` and `npm run type-check` locally
- [ ] Run `npm run lint` and fix issues
- [ ] Run `Actions → Build and publish to GHCR → Run workflow` with `dry_run=true` and `version=<X.Y.Z>` and inspect `release-charts` artifact
- [ ] Verify `README.md` Releases section updated with the version
- [ ] Push tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`
- [ ] Confirm GitHub Release created and assets uploaded
- [ ] Verify container image `ghcr.io/jigle/proman:X.Y.Z` is available and the Helm chart packaged with appVersion
- [ ] Deploy to a staging environment and smoke-test sign-in & critical flows

Notes:
- If the scheduled DRY_RUN uncovers packaging issues, fix them on a branch and re-run the workflow manually before tagging for release.