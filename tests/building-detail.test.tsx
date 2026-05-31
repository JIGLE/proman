import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuildingDetail from '../components/building-detail';

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe('BuildingDetail', () => {
  const propertyResponse = {
    id: 'prop-1',
    name: 'Example Building',
    address: '123 Main St',
    tenants: [
      {
        id: 'tenant-1',
        name: 'Tenant One',
        email: 'tenant@example.com',
        leaseDocuments: [
          { id: 'doc-1', filename: 'lease.pdf', uploadedAt: new Date().toISOString() },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: propertyResponse }),
    }) as any));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders property details and tenant documents', async () => {
    render(<BuildingDetail id="prop-1" />);

    expect(screen.getByText(/Loading/i)).toBeDefined();
    expect(await screen.findByText('Example Building')).toBeDefined();

    expect(screen.getByText('123 Main St')).toBeDefined();
    expect(screen.getByText('Tenant One')).toBeDefined();
    expect(screen.getByRole('button', { name: /Upload Document/i })).toBeDefined();
    expect(screen.getByText('lease.pdf')).toBeDefined();
  });
});
