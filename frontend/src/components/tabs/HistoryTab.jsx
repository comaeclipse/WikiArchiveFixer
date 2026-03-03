import { useState, useEffect } from 'react';
import { C } from '../../constants';
import { fetchStats, fetchArticleHistory, fetchEditHistory, fetchRetryQueue } from '../../api';
import { Pill, Stat } from '../Shared';

function SubTab({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 16px', borderRadius: '999px', border: `1px solid ${active ? C.accent : C.cardBorder}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: C.sans, background: active ? C.accentSoft : C.card, color: active ? C.accent : C.muted }}>
      {children}
    </button>
  );
}

export default function HistoryTab() {
  const [sub, setSub] = useState('stats');
  const [stats, setStats] = useState(null);
  const [articles, setArticles] = useState([]);
  const [edits, setEdits] = useState([]);
  const [retries, setRetries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (sub === 'stats') {
      fetchStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
    } else if (sub === 'scans') {
      fetchArticleHistory().then(setArticles).catch(() => {}).finally(() => setLoading(false));
    } else if (sub === 'edits') {
      fetchEditHistory().then(setEdits).catch(() => {}).finally(() => setLoading(false));
    } else {
      fetchRetryQueue().then(setRetries).catch(() => {}).finally(() => setLoading(false));
    }
  }, [sub]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <SubTab active={sub === 'stats'} onClick={() => setSub('stats')}>Overview</SubTab>
        <SubTab active={sub === 'scans'} onClick={() => setSub('scans')}>Scan History</SubTab>
        <SubTab active={sub === 'edits'} onClick={() => setSub('edits')}>Edit Log</SubTab>
        <SubTab active={sub === 'retries'} onClick={() => setSub('retries')}>Retry Queue</SubTab>
      </div>

      {loading && <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>Loading...</div>}

      {sub === 'stats' && !loading && stats && (
        <div>
          <h3 style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Overall Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
            <Stat value={stats.articles_scanned} label="Articles Scanned" variant="muted" />
            <Stat value={stats.articles_with_links} label="With AT Links" variant="red" />
            <Stat value={stats.total_at_links} label="Total AT Links" variant="amber" />
            <Stat value={stats.with_wayback} label="Wayback Found" variant="green" />
            <Stat value={stats.no_wayback} label="No Wayback" variant="red" />
          </div>

          <h3 style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Edit Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
            <Stat value={stats.articles_edited} label="Articles Edited" variant="green" />
            <Stat value={stats.links_fixed} label="Links Fixed" variant="green" />
            <Stat value={stats.edits_submitted} label="Successful Edits" variant="green" />
            <Stat value={stats.edits_failed} label="Failed Edits" variant="red" />
          </div>

          {stats.url_statuses && Object.keys(stats.url_statuses).length > 0 && (
            <>
              <h3 style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>URL Status Breakdown</h3>
              <div style={{ background: C.card, borderRadius: C.radius, padding: '18px 22px', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
                {Object.entries(stats.url_statuses).map(([status, count]) => {
                  const variant = status === 'found' ? 'green' : status === 'notfound' ? 'red' : status === 'alive' ? 'green' : status === 'dead' ? 'red' : 'amber';
                  return (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.bgAlt}` }}>
                      <Pill variant={variant}>{status}</Pill>
                      <span style={{ fontWeight: 700, fontSize: 16, fontFamily: C.serif, color: C.text }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {sub === 'scans' && !loading && (
        articles.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 48, fontSize: 14 }}>No scan history yet. Scan an article to get started.</div>
        ) : (
          <div>
            {articles.map((a, i) => (
              <div key={a.id || i} style={{ background: C.card, borderRadius: C.radiusSm, padding: '14px 18px', marginBottom: 8, border: `1px solid ${C.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Last scanned: {a.last_scanned ? new Date(a.last_scanned).toLocaleString() : 'never'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Pill variant={a.url_count > 0 ? 'red' : 'green'}>{a.url_count} links</Pill>
                  <Pill variant={a.scan_status === 'done' ? 'green' : a.scan_status === 'error' ? 'red' : 'amber'}>{a.scan_status}</Pill>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {sub === 'edits' && !loading && (
        edits.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 48, fontSize: 14 }}>No edits submitted yet.</div>
        ) : (
          <div>
            {edits.map((e, i) => (
              <div key={e.id || i} style={{ background: C.card, borderRadius: C.radiusSm, padding: '14px 18px', marginBottom: 8, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.article_title}</div>
                  <Pill variant={e.success ? 'green' : 'red'}>{e.success ? 'Success' : 'Failed'}</Pill>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: C.mono }}>
                  <span style={{ color: C.red }}>{e.old_url}</span> &rarr; <span style={{ color: C.green }}>{e.new_url}</span>
                </div>
                {e.error_msg && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{e.error_msg}</div>}
                <div style={{ fontSize: 10, color: C.mutedLight, marginTop: 4 }}>{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        )
      )}

      {sub === 'retries' && !loading && (
        retries.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 48, fontSize: 14 }}>Retry queue is empty.</div>
        ) : (
          <div>
            {retries.map((r, i) => (
              <div key={r.id || i} style={{ background: C.card, borderRadius: C.radiusSm, padding: '14px 18px', marginBottom: 8, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.article_title}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, marginTop: 2 }}>{r.archive_url || r.original_url}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Pill variant="amber">{r.retry_type}</Pill>
                    <Pill variant="muted">#{r.attempt_count}</Pill>
                  </div>
                </div>
                {r.last_error && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{r.last_error}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
