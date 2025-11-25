import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Hook to invalidate all queries when navigating to a page
 * This ensures fresh data is always fetched
 * 
 * Usage: Add `useCacheInvalidation()` at the top of any page component
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate all queries on mount to ensure fresh data
    queryClient.invalidateQueries();
  }, [queryClient]);
}

/**
 * Hook to invalidate specific query keys
 * 
 * @param queryKeys - Array of query keys to invalidate
 * 
 * Usage: 
 * ```
 * useQueryInvalidation(['users', 'teams']);
 * ```
 */
export function useQueryInvalidation(queryKeys: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient, queryKeys]);
}

/**
 * Returns a function to manually invalidate all queries
 * Useful for "Refresh" buttons
 * 
 * Usage:
 * ```
 * const invalidateAll = useManualInvalidation();
 * <button onClick={invalidateAll}>Refresh</button>
 * ```
 */
export function useManualInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries();
  };
}
