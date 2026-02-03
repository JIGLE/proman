# Release Notes - v0.9.3

**Release Date:** June 2025  
**Focus:** UX Improvements for Home Page

---

## Overview

This release delivers comprehensive UX improvements to the Home page (formerly Dashboard), implementing a 4-phase enhancement plan focused on usability, accessibility, and user experience.

---

## New Features

### Phase 1: Critical Fixes
- **Smart KPI Display**: KPI metrics section now hidden when user has 0 properties (empty state)
- **Empty Chart States**: Charts show friendly empty state messages instead of misleading zero data
- **Onboarding CTA**: New prominent onboarding card with "Add Your First Property" action for new users
- **Removed Misleading Data**: Removed "% change" indicators that showed fabricated data
- **Streamlined Quick Actions**: Reduced visible quick actions to 2 with overflow dropdown menu
- **Consistent Naming**: Renamed "Dashboard" to "Home" across all navigation elements

### Phase 2: User Experience Improvements
- **Personalized Greeting**: Dynamic time-of-day greeting (Good morning/afternoon/evening) with user's name
- **Onboarding Progress Indicator**: 3-step progress checklist showing setup completion status
  - Add first property
  - Set up a tenant  
  - Create first receipt
- **Contextual Tips**: Smart tip banner that changes based on user's current state
- **Removed Duplicate Content**: Consolidated redundant Financial Metrics Grid

### Phase 3: Polish & Accessibility
- **Keyboard Shortcuts Support**: Global shortcuts for power users
  - `Ctrl + P`: New property
  - `Ctrl + T`: New tenant
  - `Ctrl + L`: New lease
  - `Ctrl + R`: New receipt
  - `Ctrl + M`: Maintenance request
  - `/`: Focus search
  - `Shift + R`: Refresh data
  - `?`: Show shortcuts panel
- **Loading Skeleton States**: Smooth skeleton placeholders during data load
- **Improved Mobile Responsiveness**: Better touch targets and spacing on mobile
- **Accessibility Enhancements**: Proper ARIA labels and keyboard navigation support
- **Smooth Animations**: AnimatePresence for modal transitions

### Phase 4: Data Interactions
- **Data Refresh Button**: Manual refresh button with spinning indicator
- **Last Updated Timestamp**: Shows when data was last refreshed
- **Refresh Shortcut**: `Shift + R` to quickly refresh all data
- **Exposed Context API**: `refreshData()` function available via `useApp()` hook

---

## Technical Changes

### Components Modified
- `components/features/dashboard/overview-view.tsx` - Major refactor with all new features
- `components/ui/quick-actions.tsx` - Added `showOverflowOnly` prop for dropdown mode
- `components/ui/dashboard-widgets.tsx` - Added `emptyState` prop to ListWidget
- `lib/contexts/app-context.tsx` - Added `refreshData()` function to context

### New Dependencies
- No new dependencies added

### Translations Updated
- `messages/en.json` - Added greeting, onboarding, and home translations
- `messages/pt.json` - Added Portuguese translations for all new strings

### Tests
- All 79 tests passing (6 skipped)
- Updated `overview-view.test.tsx` with proper mocks for `useSession` and `refreshData`

---

## Breaking Changes

None - all changes are backward compatible.

---

## Migration Guide

No migration needed. The update is seamless.

---

## Known Issues

- Pre-existing ESLint warnings for unused imports in various files (not introduced in this release)

---

## Contributors

UX improvements implemented based on comprehensive UI/UX review recommendations.
