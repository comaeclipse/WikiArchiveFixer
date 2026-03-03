import { useState } from 'react';
import { C } from '../constants';

export default function CopyButton({ text, label, variant = 'default' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const variants = {
    default: { bg: C.bgAlt, b: C.cardBorder, c: C.textSec, h: '#E8E6DE' },
    accent: { bg: C.accentSoft, b: C.accentBorder, c: C.accent, h: 'rgba(217,119,87,0.15)' },
    green: { bg: C.greenSoft, b: C.greenBorder, c: C.green, h: 'rgba(46,125,91,0.15)' },
  };
  const s = variants[variant] || variants.default;
  return (
    <button onClick={copy} onMouseEnter={e => e.currentTarget.style.background = s.h} onMouseLeave={e => e.currentTarget.style.background = s.bg}
      style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${s.b}`, background: s.bg, color: s.c, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, whiteSpace: 'nowrap', animation: copied ? '_copyFlash 0.3s ease' : 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {copied ? (
        <><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Copied!</>
      ) : (
        <><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 11V3C3 2.44772 3.44772 2 4 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>{label || 'Copy'}</>
      )}
    </button>
  );
}
