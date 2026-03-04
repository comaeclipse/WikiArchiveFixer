import { useState } from 'react';
import { C, AT_DOMAINS } from './constants';
import { TabBtn } from './components/Shared';
import ArticleTab from './components/tabs/ArticleTab';
import CategoryTab from './components/tabs/CategoryTab';
import TopicTab from './components/tabs/TopicTab';
import HistoryTab from './components/tabs/HistoryTab';
import HighTrafficTab from './components/tabs/HighTrafficTab';
import FixModal from './components/FixModal';
import LoginPanel from './components/LoginPanel';

const globalStyles = `
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{background:#FAF9F5;color:#141413;font-family:'Inter',-apple-system,sans-serif}
@keyframes _sp{to{transform:rotate(360deg)}}
@keyframes _fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes _copyFlash{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}}
::selection{background:rgba(217,119,87,0.2)}
*::-webkit-scrollbar{width:6px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:#D5D4CE;border-radius:3px}
input:focus,textarea:focus{outline:none;border-color:#D97757!important;box-shadow:0 0 0 3px rgba(217,119,87,0.12)!important}
button{transition:all 0.15s ease}a{transition:color 0.15s ease}
`;

export default function App() {
  const [tab, setTab] = useState('article');
  const [fixArticle, setFixArticle] = useState(null);
  const [fixDeadLinksArticle, setFixDeadLinksArticle] = useState(null);

  const handleFix = (article) => setFixArticle(article);

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.sans }}>
        <header style={{ borderBottom: `1px solid ${C.cardBorder}`, padding: '28px 20px 0', textAlign: 'center', background: C.card, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 20 }}>
            <LoginPanel />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 22M2 12H22M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07" stroke="#D97757" strokeWidth="2.5" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 12, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Wikipedia Reference Audit</span>
          </div>
          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 700, margin: '0 0 6px', color: C.text, lineHeight: 1.2 }}>Archive.today Link Detector</h1>
          <p style={{ color: C.muted, fontSize: 13, maxWidth: 580, margin: '0 auto 20px', lineHeight: 1.55 }}>Detect archive.today references in English Wikipedia, find Wayback Machine replacements, and fix them directly.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, borderTop: `1px solid ${C.cardBorder}`, margin: '0 -20px', padding: '0 20px' }}>
            <TabBtn active={tab === 'article'} onClick={() => setTab('article')}>Article</TabBtn>
            <TabBtn active={tab === 'category'} onClick={() => setTab('category')}>Category</TabBtn>
            <TabBtn active={tab === 'topic'} onClick={() => setTab('topic')}>Topic Browse</TabBtn>
            <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>History</TabBtn>
            <TabBtn active={tab === 'traffic'} onClick={() => setTab('traffic')}>High Traffic</TabBtn>
          </div>
        </header>
        <main style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 48px' }}>
          {tab === 'article' && <ArticleTab onFix={handleFix} onFixDeadLinks={setFixDeadLinksArticle} />}
          {tab === 'category' && <CategoryTab onFix={handleFix} onFixDeadLinks={setFixDeadLinksArticle} />}
          {tab === 'topic' && <TopicTab onFix={handleFix} onFixDeadLinks={setFixDeadLinksArticle} />}
          {tab === 'history' && <HistoryTab />}
          {tab === 'traffic' && <HighTrafficTab />}
        </main>
        <footer style={{ maxWidth: 880, margin: '0 auto', padding: '0 20px 32px' }}>
          <div style={{ padding: '16px 20px', background: C.bgAlt, borderRadius: C.radius, border: `1px solid ${C.cardBorder}`, fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
            <strong style={{ color: C.textSec }}>Detected domains:</strong> {AT_DOMAINS.join(', ')}<br />
            <strong style={{ color: C.textSec }}>How it works:</strong> Fetches wikitext &rarr; regex-matches archive.today URLs &rarr; extracts original URLs &rarr; queries Wayback Machine API &rarr; provides one-click fix via Pywikibot.<br />
            <strong style={{ color: C.textSec }}>Limits:</strong> Up to 500 articles per scan. Wayback checks rate-limited (~300ms between requests). Auto-retries 503 errors up to 3 times with backoff.
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: C.mutedLight }}>
            Based on <a href="https://github.com/nethahussain/wikipedia-archive-today-detector" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>wikipedia-archive-today-detector</a> by <a href="https://github.com/nethahussain" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>Netha Hussain</a>
          </div>
        </footer>
      </div>

      {fixArticle && <FixModal article={fixArticle} onClose={() => setFixArticle(null)} />}
      {fixDeadLinksArticle && <FixModal article={fixDeadLinksArticle} mode="deadlinks" onClose={() => setFixDeadLinksArticle(null)} />}
    </>
  );
}
