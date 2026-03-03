import { useState } from 'react';
import { C } from '../constants';

export default function WaybackNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ background: C.amberSoft, border: `1px solid ${C.amberBorder}`, borderRadius: C.radius, padding: '14px 18px', marginBottom: 18, position: 'relative' }}>
      <button onClick={() => setDismissed(true)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: C.mutedLight, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }} title="Dismiss">&times;</button>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>&#x26A0;&#xFE0F;</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.amber, marginBottom: 4 }}>Wayback Machine links may show &quot;503 Service Unavailable&quot;</div>
          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.65 }}>
            This is an <strong>Internet Archive server-side issue</strong>, not a problem with this tool or the archived page itself. The Internet Archive serves billions of pages and their servers occasionally return 503 errors under heavy load or during maintenance. <strong>This tool automatically retries failed requests up to 3 times</strong>, but if a Wayback link still shows 503 when you click it, simply refresh — the archived content is still there.
          </div>
        </div>
      </div>
    </div>
  );
}
