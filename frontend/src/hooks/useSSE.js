import { useRef, useCallback } from 'react';

/**
 * Hook that wraps EventSource for SSE endpoints.
 * Returns { start(url), stop(), eventSourceRef }
 * The caller provides an onEvent(eventName, data) callback.
 */
export default function useSSE(onEvent) {
  const esRef = useRef(null);

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const start = useCallback((url) => {
    stop();
    const es = new EventSource(url);
    esRef.current = es;

    const EVENTS = [
      'scan_start', 'progress', 'article_found', 'article_error',
      'link_update', 'article_done', 'scan_complete', 'error',
      'ref_found', 'ref_update',
    ];

    for (const evt of EVENTS) {
      es.addEventListener(evt, (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(evt, data);
        } catch {
          onEvent(evt, e.data);
        }
      });
    }

    es.onerror = () => {
      // EventSource auto-reconnects; we treat it as stream end
      es.close();
      esRef.current = null;
      onEvent('_closed', {});
    };

    return es;
  }, [onEvent, stop]);

  return { start, stop, esRef };
}
