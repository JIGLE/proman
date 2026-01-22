# Release Notes - v0.5.3 (Clean DB Release)

## Summary
Major update introducing GDPR compliance features, admin database tools, and UI enhancements. **This release starts with a clean database—existing data will be cleared for schema updates.** No backup required for this release.

## New Features
- **Admin Database View**: Accessible in settings for ADMIN users, with search, sort, pagination, and anonymized data display.
- **GDPR Compliance**:
  - Google image display with user consent toggle.
  - Data export and delete options for users.
  - Audit logging preparation (disabled in this release).
- **UI Enhancements**:
  - Enhanced table interactions (loading states, empty states).
  - Inline editing for properties.
  - Improved accessibility and visual polish.

## Breaking Changes
- **Database Reset**: All user data cleared to apply new schema (image consent, audit logs, relation improvements).
- **Middleware Removed**: i18n routing updated; manual locale selection required.
- **Clean Start**: Re-registration needed after deployment.

## Upgrade Instructions
1. Deploy the update (no backup needed this time).
2. Set `RESET_DB=true` in environment variables.
3. The app will recreate the database with the new schema.
4. Users must re-register and reconfigure settings.

## Technical Notes
- Checksum validation added for future DB backups.
- Prisma schema updated with GDPR fields and plural relations.
- Build optimized for Next.js 16 compatibility.

## Known Issues
- Audit logging temporarily disabled (will be enabled in future release).

For questions, check the GitHub repository or contact support.