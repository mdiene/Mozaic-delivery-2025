
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { AllocationView, Region, Department, Commune, Operator } from '../types';

/**
 * Hook to fetch Allocations.
 * Uses the existing db service but wraps it in a cacheable query.
 */
export const useAllocations = (projectId: string = 'all') => {
  return useQuery({
    queryKey: ['allocations', projectId],
    queryFn: async () => {
      // In a full refactor, db.getAllocationsView would accept projectId to filter server-side.
      // For now, we fetch all and let the component filter, or filter here.
      const data = await db.getAllocationsView();
      return data;
    }
  });
};

/**
 * Hook to fetch Reference Data (Regions, Depts, Communes, Operators).
 * Parallelizes the requests and caches them for a long time (1 hour).
 */
export const useReferenceData = () => {
  return useQuery({
    queryKey: ['referenceData'],
    queryFn: async () => {
      const [regions, departments, communes, operators] = await Promise.all([
        db.getRegions(),
        db.getDepartments(),
        db.getCommunes(),
        db.getOperators()
      ]);
      return { regions, departments, communes, operators };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to fetch Deliveries
 */
export const useDeliveries = () => {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: () => db.getDeliveriesView()
  });
};

/**
 * Mutation hook for generic item updates (Optimistic updates can be added here later)
 */
export const useUpdateItem = (table: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      db.updateItem(table, id, payload),
    onSuccess: () => {
      // Invalidate relevant queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [table] });
      if (table === 'allocations') {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      }
    }
  });
};

export const useDeleteItem = (table: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.deleteItem(table, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      if (table === 'allocations') {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      }
    }
  });
};
