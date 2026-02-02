# Storybook Integration Guide

This document provides guidance for adding Storybook to the ProMan project for component documentation and development.

## What is Storybook?

Storybook is an open-source tool for building UI components in isolation. It enables:
- Component documentation with live examples
- Interactive component playground
- Visual regression testing
- Accessibility testing
- Design system documentation

## Installation

To add Storybook to this project:

```bash
npx storybook@latest init
```

This will:
1. Detect Next.js and configure automatically
2. Add required dependencies
3. Create `.storybook` configuration directory
4. Add example stories

## Recommended Configuration

### 1. TypeScript Configuration

Ensure `.storybook/main.ts` includes:

```typescript
import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y', // Accessibility testing
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    // Add path aliases to match tsconfig.json
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../'),
      '@/ui': path.resolve(__dirname, '../components/ui'),
      '@/features': path.resolve(__dirname, '../components/features'),
      '@/shared': path.resolve(__dirname, '../components/shared'),
      '@/layouts': path.resolve(__dirname, '../components/layouts'),
      '@/services': path.resolve(__dirname, '../lib/services'),
      '@/hooks': path.resolve(__dirname, '../lib/hooks'),
      '@/utils': path.resolve(__dirname, '../lib/utils'),
      '@/schemas': path.resolve(__dirname, '../lib/schemas'),
    }
    return config
  },
}

export default config
```

### 2. Preview Configuration

Create `.storybook/preview.tsx`:

```typescript
import type { Preview } from '@storybook/react'
import { ThemeProvider } from 'next-themes'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <Story />
      </ThemeProvider>
    ),
  ],
}

export default preview
```

## Writing Stories

### Basic Component Story

Create `components/ui/button.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
}

export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline',
  },
}
```

### Feature Component Story

Create `components/features/property/property-list.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { PropertiesView } from './property-list'

const meta = {
  title: 'Features/Property/PropertiesView',
  component: PropertiesView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PropertiesView>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {},
}

export const WithData: Story = {
  args: {},
  parameters: {
    mockData: [
      {
        id: '1',
        name: 'Sunset Apartments',
        address: '123 Main St',
        units: 10,
        occupied: 8,
      },
    ],
  },
}
```

## Story Organization

Organize stories to match component structure:

```
components/
├── ui/
│   ├── button.tsx
│   ├── button.stories.tsx
│   ├── card.tsx
│   └── card.stories.tsx
├── features/
│   ├── property/
│   │   ├── property-list.tsx
│   │   └── property-list.stories.tsx
│   └── tenant/
│       ├── tenants-view.tsx
│       └── tenants-view.stories.tsx
└── shared/
    ├── error-boundary.tsx
    └── error-boundary.stories.tsx
```

## Running Storybook

```bash
# Development mode
npm run storybook

# Build static version
npm run build-storybook
```

Add to `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## Best Practices

### 1. Document Props

Use JSDoc comments for component props:

```typescript
interface ButtonProps {
  /** The button variant style */
  variant?: 'default' | 'destructive' | 'outline'
  /** The button size */
  size?: 'default' | 'sm' | 'lg'
  /** Click handler */
  onClick?: () => void
}
```

### 2. Include Multiple States

Show all component states:

```typescript
export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Loading...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus className="mr-2 h-4 w-4" />
        Add Property
      </>
    ),
  },
}
```

### 3. Mock Data

Use MSW (Mock Service Worker) for API mocking:

```typescript
import { rest } from 'msw'

export const WithApiData: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/properties', (req, res, ctx) => {
          return res(
            ctx.json({
              data: [/* mock data */],
            })
          )
        }),
      ],
    },
  },
}
```

### 4. Accessibility Testing

Include accessibility checks:

```typescript
export const AccessibleButton: Story = {
  args: {
    children: 'Accessible Button',
    'aria-label': 'Submit form',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button')).toBeInTheDocument()
  },
}
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/storybook.yml`:

```yaml
name: Storybook

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build-storybook
      - uses: actions/upload-artifact@v3
        with:
          name: storybook
          path: storybook-static
```

### Chromatic (Visual Testing)

For visual regression testing:

```bash
npx chromatic --project-token=<your-token>
```

## Deployment

Deploy Storybook as static site:

### Vercel
```bash
# Build command
npm run build-storybook

# Output directory
storybook-static
```

### Netlify
```toml
[build]
  command = "npm run build-storybook"
  publish = "storybook-static"
```

## Component Documentation Template

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './component-name'

/**
 * ComponentName provides [description].
 * 
 * ## Usage
 * 
 * ```tsx
 * <ComponentName prop="value" />
 * ```
 * 
 * ## Features
 * - Feature 1
 * - Feature 2
 */
const meta = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Detailed component description...',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Define prop types and controls
  },
} satisfies Meta<typeof ComponentName>

export default meta
type Story = StoryObj<typeof meta>

// Define your stories...
```

## Further Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js Framework Guide](https://storybook.js.org/docs/get-started/nextjs)
- [Component Story Format](https://storybook.js.org/docs/api/csf)
- [Storybook Addons](https://storybook.js.org/addons)

## Getting Started

1. Install Storybook: `npx storybook@latest init`
2. Start writing stories for UI components
3. Add stories for feature components
4. Configure CI/CD for automated builds
5. Deploy Storybook for team access

## Benefits for ProMan

- **Component Documentation**: Clear documentation for all UI components
- **Development Workflow**: Build components in isolation
- **Visual Testing**: Catch visual regressions
- **Design System**: Single source of truth for UI
- **Onboarding**: Help new developers understand components
- **Accessibility**: Test and document accessibility features
