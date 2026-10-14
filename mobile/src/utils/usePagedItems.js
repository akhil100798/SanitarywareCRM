import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import { mergePage } from './pagination.mjs';

// Search/refresh starts a new generation; stale responses cannot replace or append to it.
export function usePagedItems(fetchPage, query) {
  const [page, setPage] = useState({ items: [], page: 0, total: 0, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const appendBusy = useRef(false);
  const load = useCallback(async () => {
    const current = ++generation.current;
    appendBusy.current = false;
    setLoadingMore(false);
    setError('');
    setLoading(true);
    try {
      const result = await fetchPage(query, 0);
      if (current === generation.current) setPage(result);
    } catch (err) {
      if (current === generation.current) setError(getErrorMessage(err));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [fetchPage, query]);

  useEffect(() => {
    // Invalidate immediately, not after debounce: a previous search must never flash stale results.
    ++generation.current;
    setLoading(true);
    const timer = setTimeout(load, query.trim() ? 350 : 0);
    return () => { clearTimeout(timer); ++generation.current; };
  }, [load, query]);

  const loadMore = async () => {
    if (loading || appendBusy.current || !page.hasNext) return;
    appendBusy.current = true;
    setLoadingMore(true);
    setError('');
    const current = generation.current;
    try {
      const result = await fetchPage(query, page.page + 1);
      if (current === generation.current) setPage(previous => ({
        ...result, items: mergePage(previous.items, result.items)
      }));
    } catch (err) {
      if (current === generation.current) setError(getErrorMessage(err));
    } finally {
      if (current === generation.current) {
        appendBusy.current = false;
        setLoadingMore(false);
      }
    }
  };
  return { ...page, loading, loadingMore, error, reload: load, loadMore };
}
