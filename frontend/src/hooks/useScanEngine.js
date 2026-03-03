import { useState, useCallback, useRef } from 'react';
import useSSE from './useSSE';

/**
 * Adapted scan engine that uses SSE from backend.
 * Replaces the old browser-side polling loop.
 */
export default function useScanEngine() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const articlesMapRef = useRef(new Map()); // articleId -> index in results

  const onEvent = useCallback((eventName, data) => {
    switch (eventName) {
      case 'scan_start':
        break;

      case 'progress': {
        const parts = [];
        if (data.articleIndex !== undefined) {
          parts.push(`Scanning ${data.articleIndex + 1} of ${data.articleTotal}`);
        }
        if (data.title) parts.push(data.title);
        if (data.phase === 'wayback' && data.linkTotal) {
          parts.push(`Wayback (${data.linkIndex + 1}/${data.linkTotal})`);
        } else if (data.phase === 'deadcheck' && data.linkTotal) {
          parts.push(`Checking links (${data.linkIndex + 1}/${data.linkTotal})`);
        } else if (data.phase === 'deadcheck') {
          parts.push('Checking archive links...');
        } else if (data.phase === 'refcheck' && data.linkTotal) {
          parts.push(`Checking refs (${data.linkIndex + 1}/${data.linkTotal})`);
        }
        setProgress(parts.join(' \u2014 '));
        break;
      }

      case 'article_found': {
        const art = {
          articleId: data.articleId,
          title: data.title,
          links: data.links.map(l => ({
            id: l.id,
            archiveUrl: l.archiveUrl,
            originalUrl: l.originalUrl,
            waybackUrl: l.waybackUrl || '',
            waybackDate: l.waybackDate || '',
            status: l.status,
            httpStatus: l.httpStatus,
          })),
        };
        setResults(prev => {
          const next = [...prev, art];
          articlesMapRef.current.set(data.articleId, next.length - 1);
          return next;
        });
        break;
      }

      case 'article_error':
        setResults(prev => [...prev, { title: data.title, links: [], error: data.error }]);
        break;

      case 'link_update':
        setResults(prev => {
          const idx = articlesMapRef.current.get(data.articleId);
          if (idx === undefined) return prev;
          const next = [...prev];
          const art = { ...next[idx], links: [...next[idx].links] };
          const li = art.links.findIndex(l => l.id === data.urlId);
          if (li !== -1) {
            art.links[li] = {
              ...art.links[li],
              status: data.status,
              waybackUrl: data.waybackUrl || art.links[li].waybackUrl,
              waybackDate: data.waybackDate || art.links[li].waybackDate,
              httpStatus: data.httpStatus !== undefined ? data.httpStatus : art.links[li].httpStatus,
            };
          }
          next[idx] = art;
          return next;
        });
        break;

      case 'ref_found': {
        setResults(prev => {
          const idx = articlesMapRef.current.get(data.articleId);
          if (idx === undefined) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], refLinks: data.refLinks || [] };
          return next;
        });
        break;
      }

      case 'ref_update': {
        setResults(prev => {
          const idx = articlesMapRef.current.get(data.articleId);
          if (idx === undefined) return prev;
          const next = [...prev];
          const art = { ...next[idx], refLinks: [...(next[idx].refLinks || [])] };
          const ri = art.refLinks.findIndex(r => r.id === data.refUrlId);
          if (ri !== -1) {
            art.refLinks[ri] = {
              ...art.refLinks[ri],
              status: data.status,
              httpStatus: data.httpStatus !== undefined ? data.httpStatus : art.refLinks[ri].httpStatus,
              redirectUrl: data.redirectUrl || art.refLinks[ri].redirectUrl || '',
            };
          }
          next[idx] = art;
          return next;
        });
        break;
      }

      case 'article_done':
        break;

      case 'scan_complete':
        setLoading(false);
        setDone(true);
        setProgress('');
        break;

      case '_closed':
        setLoading(false);
        setDone(true);
        setProgress('');
        break;

      case 'error':
        setError(data.message || 'Unknown error');
        setLoading(false);
        break;

      default:
        break;
    }
  }, []);

  const sse = useSSE(onEvent);

  const scanArticle = useCallback((title, { checkRefs } = {}) => {
    setResults([]);
    setError('');
    setDone(false);
    setLoading(true);
    articlesMapRef.current.clear();
    let url = `/api/scan/article?title=${encodeURIComponent(title)}`;
    if (checkRefs) url += '&check_refs=true';
    sse.start(url);
  }, [sse]);

  const scanCategory = useCallback((cat, limit = 500, { checkRefs } = {}) => {
    setResults([]);
    setError('');
    setDone(false);
    setLoading(true);
    articlesMapRef.current.clear();
    let url = `/api/scan/category?cat=${encodeURIComponent(cat)}&limit=${limit}`;
    if (checkRefs) url += '&check_refs=true';
    sse.start(url);
  }, [sse]);

  const scanTopic = useCallback((topicId, limit = 500, { checkRefs } = {}) => {
    setResults([]);
    setError('');
    setDone(false);
    setLoading(true);
    articlesMapRef.current.clear();
    let url = `/api/scan/topic?topic_id=${encodeURIComponent(topicId)}&limit=${limit}`;
    if (checkRefs) url += '&check_refs=true';
    sse.start(url);
  }, [sse]);

  const stop = useCallback(() => {
    sse.stop();
    setLoading(false);
    setDone(true);
    setProgress('');
  }, [sse]);

  const reset = useCallback(() => {
    sse.stop();
    setResults([]);
    setError('');
    setDone(false);
    setProgress('');
    setLoading(false);
    articlesMapRef.current.clear();
  }, [sse]);

  return { results, loading, progress, error, done, scanArticle, scanCategory, scanTopic, stop, reset };
}
