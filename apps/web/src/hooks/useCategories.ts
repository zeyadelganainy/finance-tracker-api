import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types/api';

const CATEGORY_QUERY_KEY = ['categories'];

const normalizeCategory = (data: any): Category => ({
  id: data.id?.toString() ?? '',
  name: data.name ?? '',
  type: data.type === 'expense' || data.type === 'income' ? data.type : undefined,
});

export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const data = await apiFetch<any[]>('/categories');
      return (data || []).map(normalizeCategory);
    },
    select: (data) =>
      [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCategoryRequest) =>
      apiFetch<any>('/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (created) => {
      const normalized = normalizeCategory(created);
      queryClient.setQueryData<Category[]>(CATEGORY_QUERY_KEY, (prev = []) =>
        [...prev, normalized].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCategoryRequest) =>
      apiFetch<any>(`/categories/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: payload.name, type: payload.type }),
      }),
    onSuccess: (updated, variables) => {
      const normalized = normalizeCategory(updated ?? variables);
      queryClient.setQueryData<Category[]>(CATEGORY_QUERY_KEY, (prev = []) =>
        prev
          .map((item) => (item.id === normalized.id ? normalized : item))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Category[]>(CATEGORY_QUERY_KEY, (prev = []) =>
        prev.filter((item) => item.id !== id)
      );
    },
  });

  const isLoading = query.isLoading || createMutation.isPending;
  const error = query.error ? (query.error as Error).message : null;
  const categories = useMemo(() => query.data || [], [query.data]);

  const createCategoryWithReturn = async (payload: CreateCategoryRequest) => {
    const created = await createMutation.mutateAsync(payload);
    return normalizeCategory(created);
  };

  const updateCategoryWithReturn = async (payload: UpdateCategoryRequest) => {
    const updated = await updateMutation.mutateAsync(payload);
    return normalizeCategory(updated ?? payload);
  };

  return {
    categories,
    isLoading,
    error,
    refetch: query.refetch,
    createCategory: createCategoryWithReturn,
    updateCategory: updateCategoryWithReturn,
    deleteCategory: deleteMutation.mutateAsync,
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
    },
  };
}
