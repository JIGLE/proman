NOTICE: The update webhook and associated templates have been removed from this project.

Release notifications should be handled by your CI/CD pipeline or operator processes. For guidance on CI-side release notifications, see the repository's release workflow and deployment docs.

If you previously relied on `/api/updates`, remove any CI steps that POST to that endpoint and instead update your release notes or deployment automation to publish artifacts directly to your image registry or Helm repo.
