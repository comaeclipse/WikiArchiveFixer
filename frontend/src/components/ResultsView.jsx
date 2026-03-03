import { useState } from 'react';
import { C } from '../constants';
import { Pill, Stat, EditIcon } from './Shared';
import CopyButton from './CopyButton';
import WaybackNotice from './WaybackNotice';

function extractWaybackDate(waybackUrl) {
  if (!waybackUrl) return null;
  const m = waybackUrl.match(/\/web\/(\d{4})(\d{2})(\d{2})\d*/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export default function ResultsView({ results, done, showOnlyAffected = false, onFix, onFixDeadLinks }) {
  const [filter, setFilter] = useState('all');

  if (!results.length && done) return <div style={{ textAlign: 'center', color: C.muted, padding: 48, fontSize: 14 }}>No results found.</div>;
  if (!results.length) return null;

  const affected = results.filter(r => r.links.length > 0);
  const clean = results.filter(r => r.links.length === 0);
  const totalLinks = results.reduce((s, r) => s + r.links.length, 0);
  const withAlts = results.reduce((s, r) => s + r.links.filter(l => l.waybackUrl).length, 0);
  const noAlts = results.reduce((s, r) => s + r.links.filter(l => l.status === 'notfound').length, 0);
  const pending = results.reduce((s, r) => s + r.links.filter(l => l.status === 'pending').length, 0);
  const totalRefs = results.reduce((s, r) => s + (r.refLinks || []).length, 0);
  const checkedRefs = results.reduce((s, r) => s + (r.refLinks || []).filter(l => l.status !== 'pending').length, 0);
  const aliveRefs = results.reduce((s, r) => s + (r.refLinks || []).filter(l => l.status === 'alive').length, 0);
  const deadRefs = results.reduce((s, r) => s + (r.refLinks || []).filter(l => l.status === 'dead').length, 0);
  const redirectRefs = results.reduce((s, r) => s + (r.refLinks || []).filter(l => l.status === 'redirect').length, 0);
  const errorRefs = results.reduce((s, r) => s + (r.refLinks || []).filter(l => l.status === 'error').length, 0);
  const display = showOnlyAffected ? (filter === 'clean' ? clean : affected) : filter === 'affected' ? affected : filter === 'clean' ? clean : results;

  return (
    <div style={{ animation: '_fadeIn .3s ease' }}>
      {/* HOW TO FIX GUIDE */}
      {withAlts > 0 && (
        <div style={{ background: C.blueSoft, border: `1px solid ${C.blueBorder}`, borderRadius: C.radius, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.blue }}><EditIcon /> How to fix articles</div>
          <div style={{ color: C.textSec, fontSize: 12, lineHeight: 1.8 }}>
            <strong>1.</strong> Click <strong style={{ color: C.accent }}>Fix</strong> to preview the edit and submit it directly, or click <strong>Edit manually</strong> to open the Wikipedia editor.<br />
            <strong>2.</strong> The tool will replace archive.today URLs with Wayback Machine alternatives and update archive-date parameters automatically.
          </div>
        </div>
      )}

      {withAlts > 0 && <WaybackNotice />}

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 24 }}>
        <Stat value={results.length} label="Scanned" variant="muted" />
        <Stat value={affected.length} label="Affected" variant="red" />
        <Stat value={totalLinks} label="AT Links" variant="amber" />
        <Stat value={withAlts} label="Alternatives" variant="green" />
        <Stat value={noAlts} label="No Alt" variant="red" />
        {pending > 0 && <Stat value={pending} label="Pending" variant="amber" />}
        {totalRefs > 0 && <Stat value={checkedRefs + '/' + totalRefs} label="Refs Checked" variant="muted" />}
        {aliveRefs > 0 && <Stat value={aliveRefs} label="Refs Alive" variant="green" />}
        {deadRefs > 0 && <Stat value={deadRefs} label="Dead Refs" variant="red" />}
        {redirectRefs > 0 && <Stat value={redirectRefs} label="Redirects" variant="amber" />}
        {errorRefs > 0 && <Stat value={errorRefs} label="Ref Errors" variant="red" />}
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[
          { v: 'all', l: showOnlyAffected ? `Affected (${affected.length})` : `All (${results.length})` },
          ...(!showOnlyAffected ? [{ v: 'affected', l: `Affected (${affected.length})` }] : []),
          { v: 'clean', l: `Clean (${clean.length})` },
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{ padding: '6px 16px', borderRadius: '999px', border: `1px solid ${filter === f.v ? C.accent : C.cardBorder}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: C.sans, background: filter === f.v ? C.accentSoft : C.card, color: filter === f.v ? C.accent : C.muted }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* ARTICLE CARDS */}
      {display.map((art, i) => (
        <div key={(art.articleId || art.title) + '-' + i} style={{ background: C.card, borderRadius: C.radius, padding: '20px 22px', marginBottom: 14, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, animation: '_fadeIn .25s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(art.title)}`} target="_blank" rel="noopener noreferrer"
              style={{ color: C.text, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent} onMouseLeave={e => e.currentTarget.style.color = C.text}>
              {art.title}
            </a>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {art.links.length > 0 ? (
                <>
                  <Pill variant="red">{art.links.length} archive.today</Pill>
                  {art.links.filter(l => l.waybackUrl).length > 0 && <Pill variant="green">{art.links.filter(l => l.waybackUrl).length} alt{art.links.filter(l => l.waybackUrl).length > 1 ? 's' : ''}</Pill>}
                </>
              ) : (
                <Pill variant="green">Clean</Pill>
              )}
              {(art.refLinks || []).length > 0 && <Pill variant="muted">{(art.refLinks || []).length} ref{(art.refLinks || []).length > 1 ? 's' : ''} checked</Pill>}
              {(art.refLinks || []).filter(r => r.status === 'dead').length > 0 && <Pill variant="red">{(art.refLinks || []).filter(r => r.status === 'dead').length} dead ref{(art.refLinks || []).filter(r => r.status === 'dead').length > 1 ? 's' : ''}</Pill>}
              {(art.refLinks || []).filter(r => r.status === 'redirect').length > 0 && <Pill variant="amber">{(art.refLinks || []).filter(r => r.status === 'redirect').length} redirect{(art.refLinks || []).filter(r => r.status === 'redirect').length > 1 ? 's' : ''}</Pill>}
            </div>
          </div>

          {art.links.length > 0 && art.links.some(l => l.waybackUrl) && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {onFix && art.articleId && (
                <button onClick={() => onFix(art)}
                  onMouseEnter={e => e.currentTarget.style.background = C.accentHover} onMouseLeave={e => e.currentTarget.style.background = C.accent}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: C.radiusSm, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, boxShadow: C.shadow }}>
                  <EditIcon /> Fix
                </button>
              )}
              <a href={`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(art.title)}&action=edit&summary=${encodeURIComponent(`Replacing archive.today links with Wayback Machine alternatives per [[WP:ATODAY]]`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.textSec, fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: C.sans, boxShadow: C.shadow }}>
                Edit manually
              </a>
              <span style={{ fontSize: 11, color: C.mutedLight }}>Preview diff before submitting</span>
            </div>
          )}

          {art.links.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {art.links.map((lk, li) => (
                <div key={li} style={{ background: C.bgAlt, borderRadius: C.radiusSm, padding: '14px 16px', marginBottom: 8, borderLeft: `3px solid ${lk.waybackUrl ? C.green : lk.status === 'pending' ? C.amber : C.red}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Archive.today link #{li + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <a href={lk.archiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.red, fontSize: 12, wordBreak: 'break-all', fontFamily: C.mono, fontWeight: 500 }}>{lk.archiveUrl}</a>
                        <CopyButton text={lk.archiveUrl} label="Copy old URL" />
                      </div>
                      {lk.originalUrl && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{ color: C.mutedLight, fontSize: 10, fontFamily: C.mono }}>Original &rarr; </span>
                          <a href={lk.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 11, wordBreak: 'break-all', fontFamily: C.mono }}>{lk.originalUrl}</a>
                        </div>
                      )}
                      {lk.httpStatus != null && (
                        <div style={{ marginTop: 4 }}>
                          <Pill variant={lk.httpStatus < 400 ? 'green' : 'red'}>HTTP {lk.httpStatus}</Pill>
                        </div>
                      )}
                    </div>
                    {lk.status === 'pending' ? <Pill variant="amber">Pending</Pill> :
                      lk.status === 'found' ? <Pill variant="green">Alt found</Pill> :
                        lk.status === 'notfound' ? <Pill variant="red">No alt</Pill> :
                          lk.status === 'dead' ? <Pill variant="red">Dead</Pill> :
                            lk.status === 'alive' ? <Pill variant="green">Alive</Pill> :
                              <Pill variant="muted">Can&apos;t extract</Pill>}
                  </div>
                  {lk.waybackUrl && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: C.greenSoft, borderRadius: C.radiusSm, border: `1px solid ${C.greenBorder}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Wayback Machine alternative</div>
                          <a href={lk.waybackUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.green, fontSize: 12, wordBreak: 'break-all', fontFamily: C.mono, fontWeight: 500 }}>{lk.waybackUrl}</a>
                        </div>
                        <CopyButton text={lk.waybackUrl} label="Copy new URL" variant="green" />
                      </div>
                      {extractWaybackDate(lk.waybackUrl) && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <div>
                            <span style={{ fontSize: 10, color: C.green, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Archive-date &rarr; </span>
                            <code style={{ fontSize: 12, color: C.green, fontFamily: C.mono, fontWeight: 600, background: 'rgba(46,125,91,0.1)', padding: '2px 6px', borderRadius: 4 }}>{extractWaybackDate(lk.waybackUrl)}</code>
                          </div>
                          <CopyButton text={extractWaybackDate(lk.waybackUrl)} label="Copy date" variant="green" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reference Check Results */}
          {(art.refLinks || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reference check ({(art.refLinks || []).filter(r => r.status !== 'pending').length}/{(art.refLinks || []).length} checked)
                </div>
                {onFixDeadLinks && art.articleId && (art.refLinks || []).some(r => r.status === 'dead') && (
                  <button onClick={() => onFixDeadLinks(art)}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentHover} onMouseLeave={e => e.currentTarget.style.background = C.accent}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: C.radiusSm, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, boxShadow: C.shadow }}>
                    <EditIcon /> Tag Dead Links
                  </button>
                )}
              </div>
              {(art.refLinks || []).map((rl, rli) => {
                const borderColor = rl.status === 'dead' ? C.red : rl.status === 'redirect' ? C.amber : rl.status === 'alive' ? C.green : rl.status === 'error' ? C.red : C.cardBorder;
                const urlColor = rl.status === 'dead' ? C.red : rl.status === 'redirect' ? C.amber : rl.status === 'alive' ? C.green : C.muted;
                return (
                  <div key={rli} style={{ background: C.bgAlt, borderRadius: C.radiusSm, padding: '10px 16px', marginBottom: 6, borderLeft: `3px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <a href={rl.url} target="_blank" rel="noopener noreferrer" style={{ color: urlColor, fontSize: 12, wordBreak: 'break-all', fontFamily: C.mono, fontWeight: 500, flex: 1, minWidth: 0 }}>{rl.url}</a>
                      {rl.status === 'pending' ? <Pill variant="amber">Pending</Pill> :
                        rl.status === 'alive' ? <Pill variant="green">{rl.httpStatus ? `HTTP ${rl.httpStatus}` : 'Alive'}</Pill> :
                        rl.status === 'dead' ? <Pill variant="red">{rl.httpStatus ? `HTTP ${rl.httpStatus}` : 'Dead'}</Pill> :
                        rl.status === 'redirect' ? <Pill variant="amber">Redirect{rl.httpStatus ? ` ${rl.httpStatus}` : ''}</Pill> :
                        rl.status === 'error' ? <Pill variant="red">Error</Pill> :
                        null}
                    </div>
                    {rl.redirectUrl && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ color: C.mutedLight, fontSize: 10, fontFamily: C.mono }}>Redirects to &rarr; </span>
                        <a href={rl.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 11, wordBreak: 'break-all', fontFamily: C.mono }}>{rl.redirectUrl}</a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
