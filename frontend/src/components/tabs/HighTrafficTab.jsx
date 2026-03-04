import { useState, useEffect, useMemo } from 'react';
import { C } from '../../constants';
import { fetchHighTraffic, refreshHighTraffic } from '../../api';
import { Spinner } from '../Shared';

export default function HighTrafficTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchHighTraffic()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.pages) return [];
    const q = query.trim().toLowerCase();
    return q ? data.pages.filter(p => p.toLowerCase().includes(q)) : data.pages;
  }, [data, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      setData(await refreshHighTraffic());
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: C.muted, fontSize: 13 }}>
        <Spinner /> Fetching high-traffic page list from Wikipedia…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: C.serif, fontSize: 19, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
            High-Traffic Pages
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Wikipedia articles with archive.today links that are among the ~1,000 most-viewed pages.
            {data?.fetched_at && (
              <> Last fetched: <span style={{ color: C.textSec }}>{new Date(data.fetched_at).toLocaleString()}</span>.</>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ padding: '7px 16px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer', fontFamily: C.sans, opacity: refreshing ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {refreshing ? 'Refreshing…' : 'Refresh list'}
        </button>
      </div>

      {error && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: C.radiusSm, padding: '10px 14px', color: C.red, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Filter articles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text, fontSize: 13, fontFamily: C.sans }}
        />
        <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>
          {filtered.length}{query ? ` / ${data?.pages?.length ?? 0}` : ''} articles
        </span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: C.radius, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bgAlt, borderBottom: `1px solid ${C.cardBorder}` }}>
              <th style={{ padding: '9px 14px', textAlign: 'right', width: 52, color: C.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
              <th style={{ padding: '9px 14px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Article</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: '20px 14px', color: C.muted, textAlign: 'center' }}>
                  {query ? 'No articles match your filter.' : 'No data available.'}
                </td>
              </tr>
            )}
            {filtered.map((title, i) => (
              <tr key={title} style={{ borderBottom: `1px solid ${C.cardBorder}`, background: i % 2 === 0 ? 'transparent' : C.bgAlt }}>
                <td style={{ padding: '8px 14px', textAlign: 'right', color: C.mutedLight, fontFamily: C.mono, fontSize: 11 }}>
                  {data.pages.indexOf(title) + 1}
                </td>
                <td style={{ padding: '8px 14px' }}>
                  <a
                    href={`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.accent, textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {title}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
