
import { render, screen, waitFor } from '@testing-library/react';
import { Logistics } from './Logistics';
import { db } from '../services/db';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the db service
vi.mock('../services/db', () => ({
  db: {
    getDeliveriesView: vi.fn(),
    getTrucks: vi.fn(),
    getDrivers: vi.fn(),
    getAllocationsView: vi.fn(),
    getProjects: vi.fn(),
  },
}));

const queryClient = new QueryClient();
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthProvider>
  </QueryClientProvider>
);

describe('Logistics', () => {
  it('should display deliveries on successful fetch', async () => {
    const mockDeliveries = [{ id: '1', bl_number: 'BL123' }];
    db.getDeliveriesView.mockResolvedValue(mockDeliveries);
    db.getTrucks.mockResolvedValue([]);
    db.getDrivers.mockResolvedValue([]);
    db.getAllocationsView.mockResolvedValue([]);
    db.getProjects.mockResolvedValue([]);

    render(<Logistics />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('BL123')).toBeInTheDocument();
    });
  });
});
