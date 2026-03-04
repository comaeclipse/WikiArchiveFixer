import { useState } from 'react';
import { C } from '../../constants';
import { searchArticles, fetchLucky } from '../../api';
import useScanEngine from '../../hooks/useScanEngine';
import AutocompleteInput from '../AutocompleteInput';
import { Spinner, ErrorMsg } from '../Shared';
import ResultsView from '../ResultsView';

export default function ArticleTab({ onFix, onFixDeadLinks }) {
  const [input, setInput] = useState('');
  const [lucky, setLucky] = useState(false);
  const engine = useScanEngine();

  const go = () => { if (input.trim()) engine.scanArticle(input.trim(), { checkRefs: false }); };

  const handleLucky = async () => {
    setLucky(true);
    try {
      const { title } = await fetchLucky();
      setInput(title);
      engine.scanArticle(title, { checkRefs: false });
    } catch (e) {
      // ignore — unlikely, but don't crash
    } finally {
      setLucky(false);
    }
  };

  return (
    <>
      <AutocompleteInput
        placeholder="Search for a Wikipedia article…"
        value={input}
        onChange={setInput}
        onGo={go}
        loading={engine.loading}
        onStop={engine.stop}
        searchFn={searchArticles}
        hideButton
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <button
          onClick={engine.loading ? engine.stop : go}
          disabled={!input.trim() && !engine.loading}
          onMouseEnter={e => { if (!engine.loading) e.currentTarget.style.background = C.btnDarkHover; }}
          onMouseLeave={e => { if (!engine.loading) e.currentTarget.style.background = engine.loading ? C.red : C.btnDark; }}
          style={{ padding: '10px 28px', borderRadius: C.radiusSm, border: 'none', background: engine.loading ? C.red : C.btnDark, color: '#FAF9F5', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans, opacity: (!input.trim() && !engine.loading) ? 0.35 : 1, boxShadow: C.shadow }}>
          {engine.loading ? 'Stop' : 'Scan'}
        </button>
        <button
          onClick={handleLucky}
          disabled={lucky || engine.loading}
          onMouseEnter={e => { if (!lucky && !engine.loading) e.currentTarget.style.background = C.accentHover; }}
          onMouseLeave={e => { if (!lucky && !engine.loading) e.currentTarget.style.background = C.accent; }}
          style={{ padding: '10px 20px', borderRadius: C.radiusSm, border: 'none', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: (lucky || engine.loading) ? 'wait' : 'pointer', fontFamily: C.sans, opacity: (lucky || engine.loading) ? 0.6 : 1, boxShadow: C.shadow }}>
          {lucky ? 'Finding…' : "I'm Feeling Lucky"}
        </button>
      </div>
      {engine.progress && <Spinner text={engine.progress} />}
      {engine.error && <ErrorMsg msg={engine.error} />}
      <ResultsView results={engine.results} done={engine.done} onFix={onFix} onFixDeadLinks={onFixDeadLinks} />
    </>
  );
}
