"use client";

import { useLoading } from "./useLoading";
import { useCallback } from "react";

export function useAsyncAction() {
  const { setLoading, setLoadingMessage } = useLoading();

  const executeWithLoading = useCallback(
    async <T,>(
      action: () => Promise<T>,
      loadingMessage?: string
    ): Promise<T> => {
      try {
        setLoadingMessage(loadingMessage);
        setLoading(true);

        const result = await action();
        return result;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setLoadingMessage]
  );

  return { executeWithLoading };
}
