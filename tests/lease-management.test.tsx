import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaseManagement from '../components/lease-management';

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe('LeaseManagement', () => {
  const tenantResponse = [
    {
      id: 'tenant-1',
      name: 'Tenant One',
      email: 'tenant@example.com',
      leaseDocuments: [
        { id: 'doc-1', filename: 'lease.pdf' },
      ],
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: tenantResponse }),
    }) as any));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders tenant list and lease document links', async () => {
    render(<LeaseManagement />);

    expect(screen.getByText(/Loading/i)).toBeDefined();
    expect(await screen.findByText('Tenant One')).toBeDefined();

    expect(screen.getByText('tenant@example.com')).toBeDefined();
    expect(screen.getByText('lease.pdf')).toBeDefined();
  });
});
