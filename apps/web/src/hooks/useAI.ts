import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AIContextResponse, AssetValuationResponse } from '../types/api';

/**
 * Hook to fetch AI context data for financial insights
 * GET /ai/context
 */
export function useAIContext() {
  return useQuery({
    queryKey: ['ai', 'context'],
    queryFn: () => api<AIContextResponse>('/ai/context'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch asset valuation data (currently stub - awaiting market pricing)
 * GET /assets/valuation
 */
export function useAssetValuation() {
  return useQuery({
    queryKey: ['assets', 'valuation'],
    queryFn: () => api<AssetValuationResponse>('/assets/valuation'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
