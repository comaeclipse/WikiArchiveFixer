import { C } from '../constants';

export function Pill({ variant, children }) {
  const styles = {
    red: { bg: C.redSoft, c: C.red, b: C.redBorder },
    green: { bg: C.greenSoft, c: C.green, b: C.greenBorder },
    amber: { bg: C.amberSoft, c: C.amber, b: C.amberBorder },
    blue: { bg: C.blueSoft, c: C.blue, b: C.blueBorder },
    muted: { bg: C.bgAlt, c: C.muted, b: C.cardBorder },
  };
  const s = styles[variant] || styles.muted;
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.01em', color: s.c, background: s.bg, border: `1px solid ${s.b}`, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function Stat({ value, label, variant }) {
  const color = { accent: C.accent, red: C.red, green: C.green, amber: C.amber, muted: C.muted }[variant] || C.text;
  return (
    <div style={{ background: C.card, borderRadius: C.radius, padding: '16px 12px', textAlign: 'center', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: C.serif, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function Spinner({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
      <div style={{ width: 16, height: 16, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: '_sp .7s linear infinite' }} />
      <span style={{ color: C.textSec, fontSize: 13 }}>{text}</span>
    </div>
  );
}

export function TabBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: C.sans, background: 'transparent', color: active ? C.accent : C.muted, borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent', borderRadius: 0 }}>
      {children}
    </button>
  );
}

export function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export function ErrorMsg({ msg }) {
  return <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: C.radiusSm, padding: '12px 16px', color: C.red, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>{msg}</div>;
}
