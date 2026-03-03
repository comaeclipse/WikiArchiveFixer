import { useState, useEffect, useRef } from 'react';
import { C } from '../constants';

export default function AutocompleteInput({ placeholder, value, onChange, onGo, loading, onStop, searchFn, displayFn }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchFn(value);
      setSuggestions(results);
      setShowDrop(results.length > 0);
      setActiveIdx(-1);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, searchFn]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectItem = (item) => { onChange(displayFn ? displayFn(item) : item); setShowDrop(false); setSuggestions([]); };
  const handleKey = (e) => {
    if (!showDrop || !suggestions.length) { if (e.key === 'Enter' && !loading) onGo(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(p => Math.min(p + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) selectItem(suggestions[activeIdx]); else { setShowDrop(false); if (!loading) onGo(); } }
    else if (e.key === 'Escape') setShowDrop(false);
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }} ref={wrapRef}>
      <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
        <input type="text" value={value} onChange={e => { onChange(e.target.value); setShowDrop(true); }} onKeyDown={handleKey}
          onFocus={() => { if (suggestions.length) setShowDrop(true); }}
          placeholder={placeholder}
          style={{ width: '100%', padding: '12px 16px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text, fontSize: 14, fontFamily: C.sans, boxShadow: C.shadow }} />
        {showDrop && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: C.radiusSm, boxShadow: C.shadowMd, maxHeight: 320, overflowY: 'auto' }}>
            {suggestions.map((item, idx) => {
              const label = displayFn ? displayFn(item) : item;
              return (
                <div key={label} onClick={() => selectItem(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontFamily: C.sans,
                    color: idx === activeIdx ? C.accent : C.text,
                    background: idx === activeIdx ? C.accentSoft : 'transparent',
                    borderBottom: idx < suggestions.length - 1 ? `1px solid ${C.bgAlt}` : 'none',
                  }}>
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={loading ? onStop : onGo} disabled={!value.trim() && !loading}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.btnDarkHover; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.btnDark; }}
        style={{ padding: '12px 28px', borderRadius: C.radiusSm, border: 'none', background: loading ? C.red : C.btnDark, color: '#FAF9F5', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, opacity: (!value.trim() && !loading) ? 0.35 : 1, boxShadow: C.shadow, alignSelf: 'flex-start' }}>
        {loading ? 'Stop' : 'Scan'}
      </button>
    </div>
  );
}
