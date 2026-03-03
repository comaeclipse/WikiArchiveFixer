import { useState } from 'react';
import { C } from '../../constants';
import { searchArticles } from '../../api';
import useScanEngine from '../../hooks/useScanEngine';
import AutocompleteInput from '../AutocompleteInput';
import { Spinner, ErrorMsg } from '../Shared';
import ResultsView from '../ResultsView';

export default function ArticleTab({ onFix, onFixDeadLinks }) {
  const [input, setInput] = useState('');
  const [checkRefs, setCheckRefs] = useState(false);
  const engine = useScanEngine();

  const go = () => { if (input.trim()) engine.scanArticle(input.trim(), { checkRefs }); };

  return (
    <>
      <AutocompleteInput placeholder="Search for a Wikipedia article…" value={input} onChange={setInput} onGo={go} loading={engine.loading} onStop={engine.stop} searchFn={searchArticles} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px', fontSize: 13, color: C.textSec, cursor: 'pointer', userSelect: 'none' }}>
        <input type="checkbox" checked={checkRefs} onChange={e => setCheckRefs(e.target.checked)} style={{ accentColor: C.accent }} />
        Check references for dead links
      </label>
      {engine.progress && <Spinner text={engine.progress} />}
      {engine.error && <ErrorMsg msg={engine.error} />}
      <ResultsView results={engine.results} done={engine.done} onFix={onFix} onFixDeadLinks={onFixDeadLinks} />
    </>
  );
}
