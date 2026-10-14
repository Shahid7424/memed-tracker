'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface QueryState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

/**
 * Loads data from the API when the component mounts or `deps` change.
 * `reload()` refetches (e.g. after a payout) while keeping the old data on
 * screen. Responses from superseded requests are aborted and ignored, so a
 * slow old response can never overwrite newer data.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> & { reload: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, error, loading: false }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are supplied by the caller
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
