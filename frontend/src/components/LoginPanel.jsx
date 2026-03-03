import { useState, useEffect } from 'react';
import { C } from '../constants';
import { getAuthStatus, doLogin } from '../api';

export default function LoginPanel() {
  const [status, setStatus] = useState(null); // null = loading, { logged_in, username }
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAuthStatus().then(setStatus).catch(() => setStatus({ logged_in: false }));
  }, []);

  const handleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await doLogin(username, password);
      if (res.success) {
        setStatus({ logged_in: true, username: res.username });
        setShowForm(false);
        setPassword('');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === null) return null;

  if (status.logged_in) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: '999px', background: C.greenSoft, border: `1px solid ${C.greenBorder}`, fontSize: 11, fontWeight: 600, color: C.green }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {status.username}
      </div>
    );
  }

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}
        style={{ padding: '4px 12px', borderRadius: '999px', border: `1px solid ${C.cardBorder}`, background: C.card, color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans }}>
        Log in to edit
      </button>
    );
  }

  return (
    <div style={{ position: 'absolute', right: 20, top: 60, zIndex: 200, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: C.radius, padding: '20px', boxShadow: C.shadowMd, width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Wikipedia Login</div>
        <button onClick={() => { setShowForm(false); setError(''); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>&times;</button>
      </div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        Use <a href="https://en.wikipedia.org/wiki/Special:BotPasswords" target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>BotPasswords</a>. Create one with the &quot;Edit existing pages&quot; grant, then enter <code style={{ fontFamily: C.mono, fontSize: 10, background: C.bgAlt, padding: '1px 4px', borderRadius: 3 }}>Username@BotName</code> below.
      </p>
      {error && <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: C.radiusSm, padding: '8px 12px', color: C.red, fontSize: 11, marginBottom: 10 }}>{error}</div>}
      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
        placeholder="Username@BotName"
        style={{ width: '100%', padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: C.sans, marginBottom: 8, boxSizing: 'border-box' }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Bot password"
        onKeyDown={e => { if (e.key === 'Enter' && username && password) handleLogin(); }}
        style={{ width: '100%', padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: C.sans, marginBottom: 12, boxSizing: 'border-box' }} />
      <button onClick={handleLogin} disabled={!username || !password || submitting}
        style={{ width: '100%', padding: '8px', borderRadius: C.radiusSm, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer', fontFamily: C.sans, opacity: (!username || !password || submitting) ? 0.5 : 1 }}>
        {submitting ? 'Logging in...' : 'Log in'}
      </button>
    </div>
  );
}
