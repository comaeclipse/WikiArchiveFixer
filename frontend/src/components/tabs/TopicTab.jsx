import { useState } from 'react';
import { C, TOPICS } from '../../constants';
import useScanEngine from '../../hooks/useScanEngine';
import { Spinner, ErrorMsg } from '../Shared';
import ResultsView from '../ResultsView';

export default function TopicTab({ onFix, onFixDeadLinks }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customCats, setCustomCats] = useState('');
  const [checkRefs, setCheckRefs] = useState(false);
  const engine = useScanEngine();

  const handleTopicSelect = (t) => {
    setSelectedTopic(t);
    engine.scanTopic(t.id, 500, { checkRefs });
  };

  const handleCustom = () => {
    const cats = customCats.split('\n').map(s => s.trim()).filter(Boolean).map(c => c.startsWith('Category:') ? c : `Category:${c}`);
    if (!cats.length) return;
    setSelectedTopic({ id: 'custom', label: 'Custom', icon: '\u270F\uFE0F', cats });
    engine.scanCategory(cats[0], 500, { checkRefs });
  };

  const backToPick = () => {
    engine.stop();
    engine.reset();
    setSelectedTopic(null);
  };

  if (!selectedTopic) return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 6px', fontFamily: C.serif }}>Choose a topic area</h3>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>Select a predefined topic or define your own categories below.</p>
      </div>
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amberBorder}`, borderRadius: C.radiusSm, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{"\u{1F4CB}"}</span>
        <div><span style={{ fontWeight: 700, fontSize: 13, color: C.amber }}>Scans up to 500 articles.</span><span style={{ fontSize: 12, color: C.textSec, marginLeft: 4 }}>Articles are gathered from all categories in the topic and scanned for archive.today links.</span></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 13, color: C.textSec, cursor: 'pointer', userSelect: 'none' }}>
        <input type="checkbox" checked={checkRefs} onChange={e => setCheckRefs(e.target.checked)} style={{ accentColor: C.accent }} />
        Check references for dead links
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, marginBottom: 28 }}>
        {TOPICS.map(t => (
          <button key={t.id} onClick={() => handleTopicSelect(t)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = C.shadowMd; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.boxShadow = C.shadow; }}
            style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: C.radius, padding: '18px 14px', cursor: 'pointer', textAlign: 'left', color: C.text, fontFamily: C.sans, boxShadow: C.shadow }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 4 }}>{t.cats.length} categories</div>
          </button>
        ))}
      </div>
      <div style={{ background: C.card, borderRadius: C.radius, padding: 22, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: C.text, fontFamily: C.serif }}>Custom categories</h4>
        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>Enter one Wikipedia category per line.</p>
        <textarea value={customCats} onChange={e => setCustomCats(e.target.value)}
          placeholder={'Category:Radiology\nCategory:Medical imaging\nCategory:Nuclear medicine'}
          rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: C.mono, resize: 'vertical' }} />
        <button onClick={handleCustom} disabled={!customCats.trim()}
          onMouseEnter={e => { if (customCats.trim()) e.currentTarget.style.background = C.btnDarkHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.btnDark; }}
          style={{ marginTop: 12, padding: '10px 24px', borderRadius: C.radiusSm, border: 'none', background: C.btnDark, color: '#FAF9F5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, opacity: customCats.trim() ? 1 : 0.35 }}>
          Scan custom categories
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={backToPick}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}
            style={{ padding: '7px 16px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, boxShadow: C.shadow }}>
            &larr; Back
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: C.serif }}>{selectedTopic.icon} {selectedTopic.label}</span>
          {engine.results.length > 0 && <span style={{ fontSize: 11, color: C.muted, background: C.bgAlt, padding: '4px 10px', borderRadius: '999px', border: `1px solid ${C.cardBorder}`, fontWeight: 600 }}>{engine.results.length} scanned</span>}
        </div>
        {engine.loading && <button onClick={engine.stop} style={{ padding: '7px 16px', borderRadius: C.radiusSm, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Stop scan</button>}
      </div>
      {engine.progress && <Spinner text={engine.progress} />}
      {engine.error && <ErrorMsg msg={engine.error} />}
      <ResultsView results={engine.results} done={engine.done} showOnlyAffected={true} onFix={onFix} onFixDeadLinks={onFixDeadLinks} />
    </div>
  );
}
