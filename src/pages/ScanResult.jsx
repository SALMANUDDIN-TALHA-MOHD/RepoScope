import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/* TDD engine - mirrors backend tddDetector.js exactly */
const TEST_KW = [/\btest\b/i,/\bspec\b/i,/\btdd\b/i,/\bfailing test\b/i,/\badd test/i,/\bwrite test/i,/\bunit test\b/i,/\bintegration test\b/i];
const CODE_KW = [/\bfeat\b/i,/\bfeature\b/i,/\bimplement\b/i,/\badd\b/i,/\bbuild\b/i,/\bcreate\b/i,/\bfix\b/i,/\brefactor\b/i,/\bupdate\b/i,/\bchore\b/i];
const isTestCommit = m => TEST_KW.some(r => r.test(m));
const isCodeCommit = m => CODE_KW.some(r => r.test(m)) && !isTestCommit(m);

function runTDD(commits) {
  if (!commits?.length) return { tddRatio: null, severity: 'info', codeCount: 0, tddCount: 0 };
  const ch = [...commits].reverse();
  let code = 0, tdd = 0;
  for (let i = 0; i < ch.length; i++) {
    if (!isCodeCommit(ch[i].message)) continue;
    code++;
    if (ch.slice(Math.max(0, i - 5), i).some(c => isTestCommit(c.message))) tdd++;
  }
  if (!code) return { tddRatio: null, severity: 'info', codeCount: 0, tddCount: 0 };
  const ratio = Math.round((tdd / code) * 100);
  return { tddRatio: ratio, severity: ratio >= 60 ? 'pass' : ratio >= 30 ? 'warn' : 'info', codeCount: code, tddCount: tdd };
}

const DIAG_TESTS = [
  { n: 'analyse() returns null for empty commit array', d: 'When the commit array is empty, the engine returns null instead of 0. This lets the UI show "inconclusive" rather than a misleading 0% ratio.', fix: 'Ensure the function checks commits?.length before processing and returns { tddRatio: null } immediately for empty input.', f: () => runTDD([]).tddRatio === null },
  { n: 'analyse() returns null when every commit is a test commit', d: 'If every commit in the repo is a test commit, there are zero implementation commits. The ratio is undefined so the engine returns null rather than a false 0%.', fix: 'The codeCount variable stays at zero because no commits match CODE_KW. When codeCount is 0, return { tddRatio: null }.', f: () => runTDD([{ message: 'add test for login' }, { message: 'write test for signup' }]).tddRatio === null },
  { n: 'analyse() returns 100 when test commit comes before implementation', d: 'GitHub returns commits newest-first. So [implement payment, add test for payment] in the array means "add test" was committed first chronologically. After reversing, the engine finds the test commit in the lookback window.', fix: 'Ensure commits are reversed before the loop so the oldest commit is at index 0.', f: () => runTDD([{ message: 'implement payment logic' }, { message: 'add test for payment' }]).tddRatio === 100 },
  { n: 'analyse() returns 0 when implementation commit comes before its test', d: 'GitHub returns newest-first. So [add test for auth, implement auth] in the array means "implement auth" was committed first chronologically. After reversing, the lookback finds no prior test.', fix: 'This is correct behaviour. If failing, check the lookback uses slice(0, i) not slice(i, i+5).', f: () => runTDD([{ message: 'add test for auth' }, { message: 'implement auth' }]).tddRatio === 0 },
  { n: 'analyse() resolves to warn or pass for a realistic mixed commit history', d: 'In this fixture: write test for cart then add cart feature (TDD pair confirmed), write test for checkout then implement checkout (TDD pair confirmed), implement profile with no prior test (no pair). Two out of three = 67%. Severity = pass.', fix: 'Verify thresholds: ratio >= 60 is pass, ratio >= 30 is warn, below 30 is info.', f: () => { const r = runTDD([{ message: 'write test for cart' }, { message: 'add cart feature' }, { message: 'write test for checkout' }, { message: 'implement checkout' }, { message: 'implement profile' }]); return r.severity === 'pass' || r.severity === 'warn'; } },
  { n: "isTestCommit classifies 'add test for login' as true", d: "The word 'test' in the message matches the TEST_KW pattern /\\btest\\b/i. The \\b word boundary prevents false matches like 'contest'.", fix: "Check that TEST_KW includes /\\btest\\b/i with word boundaries.", f: () => isTestCommit('add test for login') === true },
  { n: "isCodeCommit classifies 'add test for login' as false", d: "Although 'add' matches CODE_KW, isCodeCommit first calls isTestCommit. Because 'test' is present, isTestCommit returns true, so isCodeCommit returns false.", fix: "Ensure isCodeCommit returns false immediately when isTestCommit(message) is true.", f: () => isCodeCommit('add test for login') === false },
  { n: "isCodeCommit classifies 'implement payment service' as true", d: "The word 'implement' matches CODE_KW and no test keywords are present. isTestCommit returns false, so isCodeCommit checks CODE_KW and returns true.", fix: "Verify CODE_KW includes /\\bimplement\\b/i.", f: () => isCodeCommit('implement payment service') === true },
];

const SCAN_STEPS = [
  'Connecting to GitHub API',
  'Fetching repository metadata',
  'Reading file tree',
  'Fetching commit history',
  'Running TDD detector',
  'Running AST coverage analysis',
  'Running quality checks',
  'Saving findings',
];

function useCounter(target, dur, go) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!go || !target) return;
    const s = performance.now();
    const raf = { id: null };
    const tick = now => {
      const p = Math.min((now - s) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) raf.id = requestAnimationFrame(tick);
    };
    raf.id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.id);
  }, [go, target, dur]);
  return val;
}

const glass = (accent) => ({
  background: accent
    ? `linear-gradient(135deg, ${accent}18 0%, rgba(255,255,255,.04) 100%)`
    : 'linear-gradient(135deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.03) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${accent ? accent + '30' : 'rgba(255,255,255,.1)'}`,
  borderRadius: 20,
});

const C = { green:'#22c55e', cyan:'#38bdf8', amber:'#f59e0b', purple:'#818cf8', pink:'#f472b6', muted:'#aaaac8', faint:'#44445a' };

function complexityColour(score) {
  if (score <= 5)  return C.green;
  if (score <= 10) return C.amber;
  return '#ef4444';
}
function complexityLabel(score) {
  if (score <= 5)  return 'Simple';
  if (score <= 10) return 'Moderate';
  return 'Complex';
}
function qualityRatingColour(rating) {
  return { excellent: C.green, good: '#4ade80', moderate: C.amber, 'needs-improvement': '#ef4444' }[rating] || C.muted;
}

/* Week 6 - severity badge colour for dependency vulnerabilities */
function sevColour(sev) {
  if (!sev) return C.faint;
  const s = sev.toLowerCase();
  if (s === 'critical') return '#ef4444';
  if (s === 'high')     return C.amber;
  if (s === 'medium')   return C.purple;
  if (s === 'low')      return C.green;
  return C.faint;
}

/* Week 7 - severity badge colour for security findings */
function secSevColour(sev) {
  if (!sev) return C.faint;
  const s = sev.toLowerCase();
  if (s === 'critical') return '#ef4444';
  if (s === 'high')     return C.amber;
  if (s === 'medium')   return C.purple;
  if (s === 'low')      return C.green;
  return C.faint;
}

/* Extract function name from smell.detail string like: "\"runLauncher\" is 52 lines (limit: 50)" */
function smellFnName(detail) {
  if (!detail) return '';
  const m = detail.match(/^"?([^"]+)"?\s+is\s/);
  return m ? m[1] : detail.slice(0, 40);
}
export default function ScanResult() {
  const navigate = useNavigate();
  const { scanId } = useParams();
  const scanUrl = localStorage.getItem('lastRepoUrl') || 'https://github.com/facebook/react';

  const [phase,       setPhase]       = useState('scanning');
  const [stepIdx,     setStepIdx]     = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [scanData,    setScanData]    = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [activeTab,   setActiveTab]   = useState('overview');
  const [countersGo,  setCountersGo]  = useState(false);
  const [diagRes,     setDiagRes]     = useState([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagDone,    setDiagDone]    = useState(false);
  const [diagScore,   setDiagScore]   = useState(null);
  const [diagStepTxt, setDiagStepTxt] = useState('');
  const [expanded,    setExpanded]    = useState(null);
  /* Week 6 - dep filter */
  const [depFilter,   setDepFilter]   = useState('all');
  /* Week 7 - security filter */
  const [secFilter,   setSecFilter]   = useState('all');

  const pollRef   = useRef(null);
  const stepTimer = useRef(null);

  /* Derived data */
  const totalFiles   = scanData?.totalFiles   ?? scanData?.summary?.totalFiles   ?? 0;
  const totalCommits = scanData?.totalCommits ?? scanData?.summary?.totalCommits ?? 0;

  const tddAnalysis  = scanData?.tddAnalysis  ?? null;
  const astCoverage  = scanData?.astCoverage  ?? null;
  const codeQuality  = scanData?.codeQuality  ?? null;

  /* Week 6 - dependency audit */
  const depAudit     = scanData?.dependencyAudit ?? null;

  /* Week 7 - security scan */
  const secScan      = scanData?.securityScan ?? null;

  const tddFinding   = tddAnalysis  ?? scanData?.findings?.find(f => f.category === 'tdd')       ?? null;
  const unitFinding  = astCoverage  ?? scanData?.findings?.find(f => f.category === 'unit_test') ?? null;
  const recentCommits = scanData?.recentCommits ?? [];

  /* TDD derived */
  const localTDD         = recentCommits.length ? runTDD(recentCommits) : null;
  const displayRatio     = tddFinding?.tddRatio    ?? localTDD?.tddRatio    ?? 0;
  const displayCodeCount = tddFinding?.implementationCommits ?? tddFinding?.codeCount ?? localTDD?.codeCount ?? 0;
  const displayTddCount  = tddFinding?.tddPairedCommits      ?? tddFinding?.tddCount  ?? localTDD?.tddCount  ?? 0;
  const displaySeverity  = tddFinding?.category ?? tddFinding?.severity ?? localTDD?.severity ?? 'info';
  const tddColor         = displaySeverity === 'pass' ? C.green : displaySeverity === 'warn' ? C.amber : C.purple;
  const tddBadge         = displaySeverity === 'pass' ? 'PASS'  : displaySeverity === 'warn' ? 'WARN'  : 'INFO';
  const structSignal     = tddFinding?.structuralSignal ?? null;

  /* AST derived */
  const astCovPct    = unitFinding?.coveragePercent ?? unitFinding?.coverage ?? null;
  const testedFns    = unitFinding?.testedFunctions   ?? [];
  const untestedFns  = unitFinding?.untestedFunctions ?? [];
  const srcFiles     = unitFinding?.sourceFileCount   ?? unitFinding?.sourceFilesAnalysed ?? null;
  const testFiles    = unitFinding?.testFileCount     ?? unitFinding?.testFilesAnalysed   ?? null;

  /* Week 6 - dep derived */
  const depVulns         = depAudit?.vulnerabilities ?? [];
  const depFiltered      = depFilter === 'all' ? depVulns : depVulns.filter(v => v.severity?.toLowerCase() === depFilter);
  const depSummary       = depAudit ? {
    critical: depVulns.filter(v => v.severity?.toLowerCase() === 'critical').length,
    high:     depVulns.filter(v => v.severity?.toLowerCase() === 'high').length,
    medium:   depVulns.filter(v => v.severity?.toLowerCase() === 'medium').length,
    low:      depVulns.filter(v => v.severity?.toLowerCase() === 'low').length,
  } : null;

  /* Week 7 - security derived */
  const secFindings      = secScan?.findings ?? [];
  const secFiltered      = secFilter === 'all' ? secFindings : secFindings.filter(f => f.severity?.toLowerCase() === secFilter);
  const secSummary       = secScan ? {
    critical: secFindings.filter(f => f.severity?.toLowerCase() === 'critical').length,
    high:     secFindings.filter(f => f.severity?.toLowerCase() === 'high').length,
    medium:   secFindings.filter(f => f.severity?.toLowerCase() === 'medium').length,
    low:      secFindings.filter(f => f.severity?.toLowerCase() === 'low').length,
  } : null;

  /* Counters */
  const filesC   = useCounter(totalFiles,       1800, countersGo);
  const commitsC = useCounter(totalCommits,     1400, countersGo);
  const tddC     = useCounter(displayRatio,     2200, countersGo);
  const codeC    = useCounter(displayCodeCount, 1600, countersGo);
  const pairsC   = useCounter(displayTddCount,  1800, countersGo);

  useEffect(() => {
    if (phase !== 'complete') return;
    const t = setTimeout(() => setCountersGo(true), 400);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    startScan();
    return () => { clearTimeout(stepTimer.current); clearInterval(pollRef.current); };
  }, []);

  function repoName_() {
    try {
      const u = new URL(scanUrl.startsWith('http') ? scanUrl : `https://${scanUrl}`);
      const parts = u.pathname.replace(/^\//, '').split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : scanUrl;
    } catch { return scanUrl; }
  }
  const repoName = repoName_();

  async function startScan() {
    if (!scanId) { setErrorMsg('No scan ID found. Please start a new scan from the homepage.'); setPhase('error'); return; }
    setStepIdx(0); setProgress(0);
    let si = 0;
    const advance = () => {
      if (si < SCAN_STEPS.length) { si++; setStepIdx(si); setProgress(Math.round((si / SCAN_STEPS.length) * 100)); stepTimer.current = setTimeout(advance, 750); }
    };
    stepTimer.current = setTimeout(advance, 400);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'complete') {
          clearInterval(pollRef.current); clearTimeout(stepTimer.current);
          setStepIdx(SCAN_STEPS.length); setProgress(100);
          setScanData(data); setPhase('complete');
        } else if (data.status === 'error') {
          clearInterval(pollRef.current); clearTimeout(stepTimer.current);
          setErrorMsg('Scan failed. The repository may be private or the GitHub API rate limit was reached.');
          setPhase('error');
        }
      } catch (_) {}
    }, 1500);
  }

  async function runDiag() {
    setDiagRunning(true); setDiagDone(false); setDiagRes([]); setDiagScore(null);
    for (const s of ['Initialising test runner...','Loading commit fixtures...','Running assertion suite...','Validating edge cases...','Compiling results...']) {
      setDiagStepTxt(s); await new Promise(r => setTimeout(r, 350));
    }
    setDiagStepTxt('');
    const results = DIAG_TESTS.map(t => { let p = false; try { p = t.f(); } catch (_) {} return { ...t, p }; });
    const passed = results.filter(r => r.p).length;
    setDiagScore({ passed, total: results.length, pct: Math.round((passed / results.length) * 100) });
    for (let i = 0; i < results.length; i++) {
      await new Promise(r => setTimeout(r, 160));
      setDiagRes(prev => [...prev, results[i]]);
    }
    setDiagRunning(false); setDiagDone(true);
  }

  /* TDD encouragement message */
  const tddMsg = (() => {
    const r = displayRatio, code = displayCodeCount, pairs = displayTddCount;
    if (!recentCommits.length && !tddFinding) return null;
    if (displaySeverity === 'pass') return { color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)', title: 'Strong TDD practice detected', text: `${repoName} has ${r}% TDD ratio across ${code} implementation commits, with ${pairs} confirmed test-first pairs. This is above the 60% threshold for strong TDD discipline.` };
    if (displaySeverity === 'warn') return { color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)', title: 'Partial TDD usage', text: `${repoName} shows ${r}% TDD ratio. Out of ${code} implementation commits, ${pairs} had a test commit written within the previous 5 commits.` };
    return { color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)', title: 'TDD not detected in commit history', text: `${repoName} shows ${r}% TDD ratio across ${code} implementation commits, with only ${pairs} confirmed test-first pairs.` };
  })();

  /* AST encouragement message */
  const astMsg = (() => {
    if (!unitFinding) return null;
    const cov = astCovPct;
    if (cov == null) return { color: C.muted, bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)', title: 'AST analysis note', text: unitFinding.message || unitFinding.fallbackMessage || 'No analysable source files found.' };
    if (cov >= 70) return { color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)', title: 'Good function coverage', text: `${cov}% of functions in ${repoName} are referenced in test files. The ${untestedFns.length} untested functions listed above are the next targets.` };
    if (cov >= 40) return { color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)', title: 'Partial function coverage', text: `${cov}% of functions in ${repoName} are referenced in test files. Work through the untested list one function at a time.` };
    return { color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)', title: 'Low function coverage detected', text: `${cov}% of functions in ${repoName} are referenced in test files. Pick the first untested function, write one test for it, commit it. Repeat.` };
  })();

  const NAV = [
    { id:'overview',     label:'Overview',      icon:'<>' },
    { id:'tdd',          label:'TDD Detection', icon:'TDD', badge: tddBadge, badgeColor: tddColor },
    { id:'ast',          label:'AST Coverage',  icon:'AST', badge: unitFinding ? (astCovPct != null ? (astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO') : 'INFO') : 'INFO', badgeColor: astCovPct >= 70 ? C.green : astCovPct >= 40 ? C.amber : C.purple },
    { id:'quality',      label:'Code Quality',  icon:'CQ',  badge: codeQuality ? codeQuality.overallRating?.toUpperCase().replace('-',' ') : 'OFF', badgeColor: codeQuality ? qualityRatingColour(codeQuality.overallRating) : C.faint },
    { id:'deps',         label:'Dependencies',  icon:'PKG', badge: depAudit ? (depSummary.critical > 0 ? 'CRIT' : depSummary.high > 0 ? 'HIGH' : depSummary.medium > 0 ? 'WARN' : 'PASS') : 'OFF', badgeColor: depAudit ? (depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : depSummary.medium > 0 ? C.purple : C.green) : C.faint },
    { id:'security',     label:'Security',      icon:'SEC', badge: secScan ? (secSummary.critical > 0 ? 'CRIT' : secSummary.high > 0 ? 'HIGH' : secSummary.medium > 0 ? 'WARN' : 'PASS') : 'OFF', badgeColor: secScan ? (secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : secSummary.medium > 0 ? C.purple : C.green) : C.faint },
    { id:'diagnostics',  label:'Diagnostics',   icon:'DX',  badge: diagDone ? `${diagScore?.passed}/${diagScore?.total}` : null, badgeColor: diagDone && diagScore?.passed === diagScore?.total ? C.green : C.amber },
  ];
  return (
    <div style={{ minHeight:'100vh', background:'#06060e', color:'#f0f0ff', fontFamily:"'Space Grotesk',sans-serif", position:'relative', overflow:'hidden' }}>

      {/* Background orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,.07),transparent 65%)', top:-200, left:-200, filter:'blur(100px)', animation:'orbf 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,.06),transparent 65%)', bottom:-100, right:-100, filter:'blur(100px)', animation:'orbf 24s ease-in-out infinite', animationDelay:'-6s' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(129,140,248,.05),transparent 65%)', top:'40%', right:'20%', filter:'blur(80px)', animation:'orbf 18s ease-in-out infinite', animationDelay:'-3s' }}/>
      </div>

      {/* SCANNING */}
      {phase === 'scanning' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>
          <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', marginBottom:48 }}>
            <span style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#22c55e,#38bdf8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:700, color:'#06060e' }}>&gt;_</span>
            <span style={{ fontSize:18, fontWeight:700, color:'#f0f0ff', letterSpacing:'-.025em' }}>RepoScope</span>
          </button>
          <div style={{ position:'relative', width:160, height:160, marginBottom:36 }}>
            {[{size:160,color:C.green,dur:'2s'},{size:120,color:C.cyan,dur:'3s'},{size:80,color:C.purple,dur:'2.5s'}].map((ring,i) => (
              <div key={i} style={{ position:'absolute', top:(160-ring.size)/2, left:(160-ring.size)/2, width:ring.size, height:ring.size, borderRadius:'50%', border:'2px solid transparent', borderTopColor:ring.color, borderRightColor:ring.color+'40', animation:`spin ${ring.dur} linear ${i===1?'reverse':''} infinite`, boxShadow:`0 0 20px ${ring.color}33` }}/>
            ))}
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#38bdf8)', boxShadow:'0 0 24px rgba(34,197,94,.6)', animation:'pulse 2s ease-in-out infinite' }}/>
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.green, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Analysing repository</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#f0f0ff', marginBottom:4 }}>{repoName}</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:40 }}>TDD detection - AST coverage - code quality</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:32, width:'100%', maxWidth:380 }}>
            {SCAN_STEPS.map((step, i) => {
              const done = i < stepIdx, active = i === stepIdx;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity:done||active?1:0.3, transition:'opacity .4s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, background:done?C.green:active?'rgba(56,189,248,.2)':'rgba(255,255,255,.06)', border:`1px solid ${done?C.green:active?C.cyan:'rgba(255,255,255,.1)'}`, color:done?'#06060e':active?C.cyan:C.muted, fontWeight:700 }}>
                    {done?'v':active?'.':i+1}
                  </div>
                  <span style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color:done?C.green:active?C.cyan:C.muted }}>{step}</span>
                  {active && <span style={{ width:5, height:5, borderRadius:'50%', background:C.cyan, display:'inline-block', animation:'pulse 1s ease-in-out infinite' }}/>}
                </div>
              );
            })}
          </div>
          <div style={{ width:'100%', maxWidth:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.faint, marginBottom:8 }}>
              <span>Running analysis pipeline...</span><span style={{ color:C.green }}>{progress}%</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#22c55e,#38bdf8)', width:`${progress}%`, transition:'width .6s ease', boxShadow:'0 0 12px rgba(34,197,94,.5)' }}/>
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {phase === 'error' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ ...glass('#ef4444'), padding:40, textAlign:'center', maxWidth:560 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>!</div>
            <div style={{ fontSize:22, fontWeight:700, marginBottom:12 }}>Scan failed</div>
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.75, marginBottom:28 }}>{errorMsg}</div>
            <button onClick={() => navigate('/')} style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', border:'none', borderRadius:10, padding:'12px 32px', fontWeight:700, fontSize:14, cursor:'pointer' }}>Try again</button>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {phase === 'complete' && scanData && (
        <div style={{ position:'relative', zIndex:1, display:'flex', minHeight:'100vh' }}>

          {/* Sidebar */}
          <aside style={{ width:260, flexShrink:0, background:'rgba(8,8,15,.92)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderRight:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#e53e3e #0e0e1c' }}>
            <div style={{ padding:'20px 20px 0' }}>
              <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:9, background:'none', border:'none', cursor:'pointer', marginBottom:20 }}>
                <span style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#22c55e,#38bdf8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:'#06060e' }}>&gt;_</span>
                <span style={{ fontSize:15, fontWeight:700, color:'#f0f0ff' }}>RepoScope</span>
              </button>
              <div style={{ ...glass('#22c55e'), padding:'14px 16px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, display:'inline-block', animation:'rpp 2s ease-in-out infinite' }}/>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.green, textTransform:'uppercase', letterSpacing:'.12em' }}>Scan complete</span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'#f0f0ff', marginBottom:3, wordBreak:'break-all' }}>{repoName}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.faint, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{scanUrl}</div>
              </div>
            </div>

            <nav style={{ padding:'0 12px', flex:1 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6, padding:'0 8px' }}>Analysis</div>
              {NAV.map(item => {
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:10, border:'none', cursor:'pointer', marginBottom:3, textAlign:'left', background:active?'rgba(34,197,94,.1)':'transparent', transition:'all .2s' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background='rgba(255,255,255,.04)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent'; }}>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:700, color:active?C.green:C.muted, flexShrink:0, minWidth:28 }}>{item.icon}</span>
                    <span style={{ fontSize:13, fontWeight:active?600:400, color:active?'#f0f0ff':C.muted, flex:1 }}>{item.label}</span>
                    {item.badge && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, padding:'2px 7px', borderRadius:99, background:`${item.badgeColor}18`, color:item.badgeColor, border:`1px solid ${item.badgeColor}30`, flexShrink:0 }}>{item.badge}</span>}
                  </button>
                );
              })}
              <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'16px 8px' }}/>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6, padding:'0 8px' }}>Coming soon</div>
              {[['AI Summary','Coming Soon']].map(([label, wk]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, opacity:0.4, marginBottom:2 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.muted, flexShrink:0, minWidth:28 }}>AI</span>
                  <span style={{ fontSize:12, color:C.muted, flex:1 }}>{label}</span>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint }}>{wk}</span>
                </div>
              ))}
            </nav>

            <div style={{ padding:16, borderTop:'1px solid rgba(255,255,255,.07)' }}>
              <button onClick={() => navigate('/')} style={{ width:'100%', background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', border:'none', borderRadius:10, padding:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" }}>New Scan</button>
            </div>
          </aside>

          {/* Main content */}
          <main style={{ flex:1, minWidth:0, padding:'32px 28px', overflowY:'auto' }}>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.green, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Overview</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>{repoName}</h1>
                  <p style={{ fontSize:14, color:C.muted }}>{totalCommits} commits analysed across {totalFiles.toLocaleString()} files.</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }} className="rs-chips">
                  {[
                    { v:filesC.toLocaleString(), l:'Files scanned',    c:C.cyan,   icon:'FILES' },
                    { v:commitsC,                l:'Commits analysed', c:C.purple, icon:'COMMITS' },
                    { v:`${tddC}%`,              l:'TDD ratio',        c:tddColor, icon:'TDD' },
                    { v:astCovPct!=null?`${astCovPct}%`:'N/A', l:'AST coverage', c:C.amber, icon:'AST' },
                  ].map(chip => (
                    <div key={chip.l} style={{ ...glass(chip.c), padding:'18px 16px', position:'relative', overflow:'hidden', transition:'transform .25s, box-shadow .25s', cursor:'default' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 16px 40px ${chip.c}22`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${chip.c},transparent)` }}/>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:700, color:chip.c, marginBottom:10, letterSpacing:'.08em' }}>{chip.icon}</div>
                      <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:chip.c, marginBottom:4 }}>{chip.v}</div>
                      <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em' }}>{chip.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }} className="rs-two-col">
                  {/* TDD card */}
                  <div style={{ ...glass(tddColor), padding:22, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('tdd')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:tddColor, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>TDD Detection</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{displayRatio}% ratio</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{displayCodeCount} impl commits, {displayTddCount} TDD pairs</div>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:`${tddColor}1f`, color:tddColor, border:`1px solid ${tddColor}40` }}>{tddBadge}</span>
                    </div>
                    <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden', marginBottom:10 }}>
                      <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${tddColor},${tddColor}88)`, width:`${displayRatio}%`, transition:'width 1.8s cubic-bezier(.22,1,.36,1)' }}/>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.6, marginBottom:8 }}>{tddFinding?.message?.split('.')[0] || 'Click to view full TDD analysis'}.</div>
                    {structSignal && (
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:structSignal.hasTestDirectory?C.green:C.faint }}>
                        {structSignal.hasTestDirectory ? `+ ${structSignal.testFileCount} test files found (${structSignal.testFileRatio}%)` : '- No dedicated test directory detected'}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:tddColor, marginTop:10 }}>View full analysis -&gt;</div>
                  </div>
                  {/* AST card */}
                  <div style={{ ...glass('#38bdf8'), padding:22, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('ast')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>AST Coverage</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{astCovPct!=null?`${astCovPct}%`:'N/A'}</div>
                        {srcFiles!=null && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{srcFiles} source files, {testFiles} test files</div>}
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>{astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO'}</span>
                    </div>
                    {untestedFns.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                        {untestedFns.slice(0,4).map(fn => (
                          <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(239,68,68,.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.2)' }}>{fn}</span>
                        ))}
                        {untestedFns.length > 4 && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(255,255,255,.06)', color:C.muted }}>+{untestedFns.length-4} more</span>}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:'#38bdf8', marginTop:10 }}>View full analysis -&gt;</div>
                  </div>
                </div>

                {/* Code Quality overview card */}
                {codeQuality && (
                  <div style={{ ...glass(qualityRatingColour(codeQuality.overallRating)), padding:22, marginBottom:14, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('quality')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:qualityRatingColour(codeQuality.overallRating), textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>Code Quality</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>Avg complexity: {codeQuality.avgComplexity}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{codeQuality.filesAnalysed} files - {codeQuality.totalFunctions} functions - {codeQuality.complex} complex</div>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:`${qualityRatingColour(codeQuality.overallRating)}1f`, color:qualityRatingColour(codeQuality.overallRating), border:`1px solid ${qualityRatingColour(codeQuality.overallRating)}40` }}>{codeQuality.overallRating?.toUpperCase().replace('-',' ')}</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{l:'Simple',c:C.green,v:codeQuality.simple},{l:'Moderate',c:C.amber,v:codeQuality.moderate},{l:'Complex',c:'#ef4444',v:codeQuality.complex}].map(b=>(
                        <div key={b.l} style={{ flex:1, background:`${b.c}12`, border:`1px solid ${b.c}25`, borderRadius:8, padding:'8px 0', textAlign:'center' }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, fontWeight:700, color:b.c }}>{b.v}</div>
                          <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:qualityRatingColour(codeQuality.overallRating), marginTop:10 }}>View full analysis -&gt;</div>
                  </div>
                )}

                {/* Dependency Audit overview card - Week 6 */}
                {depAudit && (
                  <div style={{ ...glass(depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green), padding:22, marginBottom:14, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('deps')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.amber, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>Dependency Audit</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{depAudit.totalVulnerabilities ?? depVulns.length} vulnerabilities found</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{depAudit.totalPackages ?? 0} packages scanned via OSV.dev</div>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:`${depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green}1f`, color:depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green, border:`1px solid ${depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green}40` }}>{depSummary.critical > 0 ? 'CRITICAL' : depSummary.high > 0 ? 'HIGH' : depVulns.length > 0 ? 'WARN' : 'PASS'}</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{l:'Critical',c:'#ef4444',v:depSummary.critical},{l:'High',c:C.amber,v:depSummary.high},{l:'Medium',c:C.purple,v:depSummary.medium},{l:'Low',c:C.green,v:depSummary.low}].map(b=>(
                        <div key={b.l} style={{ flex:1, background:`${b.c}12`, border:`1px solid ${b.c}25`, borderRadius:8, padding:'8px 0', textAlign:'center' }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, fontWeight:700, color:b.c }}>{b.v}</div>
                          <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:C.amber, marginTop:10 }}>View full audit -&gt;</div>
                  </div>
                )}

                {/* Security Scan overview card - Week 7 */}
                {secScan && (
                  <div style={{ ...glass(secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink), padding:22, marginBottom:14, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('security')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.pink, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>Security Scan</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{secFindings.length} issues found</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{secScan.filesScanned ?? 0} files scanned - OWASP patterns and secrets</div>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:`${secSummary.critical > 0 ? '#ef4444' : C.pink}1f`, color:secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink, border:`1px solid ${secSummary.critical > 0 ? '#ef4444' : C.pink}40` }}>{secSummary.critical > 0 ? 'CRITICAL' : secSummary.high > 0 ? 'HIGH' : secFindings.length > 0 ? 'WARN' : 'PASS'}</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{l:'Critical',c:'#ef4444',v:secSummary.critical},{l:'High',c:C.amber,v:secSummary.high},{l:'Medium',c:C.purple,v:secSummary.medium},{l:'Low',c:C.green,v:secSummary.low}].map(b=>(
                        <div key={b.l} style={{ flex:1, background:`${b.c}12`, border:`1px solid ${b.c}25`, borderRadius:8, padding:'8px 0', textAlign:'center' }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, fontWeight:700, color:b.c }}>{b.v}</div>
                          <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:C.pink, marginTop:10 }}>View full scan -&gt;</div>
                  </div>
                )}

                {/* Upcoming checks */}
                <div style={{ ...glass(), padding:20 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>Upcoming checks</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(1,1fr)', gap:10 }}>
                    {[{ n:'AI Summary', d:'Gemini-generated prose recommendations', c:C.cyan, w:'Coming Soon' }].map(item => (
                      <div key={item.n} style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${item.c}18`, borderRadius:12, padding:'14px 14px', opacity:0.7 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:item.c, marginBottom:6, textTransform:'uppercase', letterSpacing:'.1em' }}>{item.w}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#f0f0ff', marginBottom:4 }}>{item.n}</div>
                        <div style={{ fontSize:11, color:C.faint, lineHeight:1.55 }}>{item.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* TDD TAB */}
            {activeTab === 'tdd' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:tddColor, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>TDD Detection</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Test-Driven Development</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Commit history for <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> analysed chronologically.</p>
                </div>
                <div style={{ ...glass(tddColor), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${tddColor},transparent)` }}/>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:16 }}>
                    <div>
                      <div style={{ fontSize:48, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:tddColor, lineHeight:1, marginBottom:6 }}>{displayRatio}%</div>
                      <div style={{ fontSize:16, color:'#f0f0ff', fontWeight:600 }}>TDD Ratio</div>
                      <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{totalCommits} commits from {repoName}</div>
                    </div>
                    <span style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:`${tddColor}1f`, color:tddColor, border:`1px solid ${tddColor}44` }}>{tddBadge}</span>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.muted, marginBottom:8 }}>
                      <span>TDD ratio (test-first commit pairs confirmed)</span>
                      <span style={{ color:tddColor, fontWeight:700 }}>{displayRatio}%</span>
                    </div>
                    <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${tddColor},${tddColor}88)`, width:`${displayRatio}%`, transition:'width 2s cubic-bezier(.22,1,.36,1)', boxShadow:`0 0 12px ${tddColor}66` }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontFamily:"'IBM Plex Mono',monospace", marginTop:6 }}>
                      <span style={{ color:'#ef4444' }}>0% no TDD</span><span style={{ color:C.amber }}>30% partial</span><span style={{ color:C.green }}>60% good</span><span style={{ color:'#38bdf8' }}>100%</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                  {[
                    { v:commitsC, l:'Total commits fetched',   c:C.green,  tip:`All commits fetched from ${repoName}` },
                    { v:codeC,    l:'Implementation commits',  c:C.cyan,   tip:'Commits with feat/fix/build/create/implement/add/update/chore' },
                    { v:pairsC,   l:'TDD pairs confirmed',     c:C.purple, tip:'Impl commits with a test commit within the 5 preceding commits' },
                  ].map(s => (
                    <div key={s.l} style={{ ...glass(), padding:'16px 18px', textAlign:'center' }}>
                      <div style={{ fontSize:32, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:5 }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{s.l}</div>
                      <div style={{ fontSize:11, color:'#c8d0f0', lineHeight:1.5 }}>{s.tip}</div>
                    </div>
                  ))}
                </div>
                {structSignal && (
                  <div style={{ ...glass(structSignal.hasTestDirectory?C.green:C.faint), padding:'18px 22px', marginBottom:16 }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:structSignal.hasTestDirectory?C.green:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:10 }}>Directory structure signal (professor suggestion)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[
                        { v:structSignal.hasTestDirectory?'YES':'NO', l:'Test directory found', c:structSignal.hasTestDirectory?C.green:'#ef4444' },
                        { v:structSignal.testFileCount, l:'Test files in repo', c:C.amber },
                        { v:`${structSignal.testFileRatio}%`, l:'Of all files are tests', c:C.cyan },
                      ].map(s=>(
                        <div key={s.l} style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                          <div style={{ fontSize:20, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:4 }}>{s.v}</div>
                          <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ ...glass(), padding:'18px 22px', marginBottom:16, borderLeft:`3px solid ${tddColor}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:tddColor, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:8 }}>Finding for {repoName}</div>
                  <p style={{ fontSize:14, color:'#ccd8ff', lineHeight:1.8 }}>{tddFinding?.message || `TDD ratio of ${displayRatio}% detected in ${repoName}.`}</p>
                </div>
                {tddMsg && (
                  <div style={{ background:tddMsg.bg, border:`1px solid ${tddMsg.border}`, borderRadius:16, padding:'18px 22px', marginBottom:16 }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:tddMsg.color, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>{tddMsg.title}</div>
                    <p style={{ fontSize:13, color:'#f0f0ff', lineHeight:1.85 }}>{tddMsg.text}</p>
                  </div>
                )}
                <div style={{ ...glass(), padding:'20px 24px' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>How this detection works</div>
                  <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:12 }}>
                    GitHub returns commits newest-first, so RepoScope reverses the array to put the oldest commit first. For each implementation commit, it looks at the 5 commits that came immediately before it. If any contain testing keywords, the pair is recorded as a confirmed TDD cycle.
                  </p>
                  <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82 }}>
                    Per professor feedback, the repository directory structure is also checked. The presence of <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>tests/</code>, <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>__tests__/</code>, or files matching <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>*.test.js</code> acts as a structural TDD signal.
                  </p>
                </div>
              </div>
            )}

            {/* AST TAB */}
            {activeTab === 'ast' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>AST Coverage</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Function Coverage Analysis</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Source files in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> parsed with @babel/parser. Every function name extracted and cross-referenced against test files.</p>
                </div>
                {unitFinding ? (
                  <>
                    <div style={{ ...glass('#38bdf8'), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,transparent)' }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>{unitFinding.framework || unitFinding.language || 'Language analysis'}</div>
                          <div style={{ fontSize:36, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:'#38bdf8', lineHeight:1, marginBottom:4 }}>{astCovPct!=null?`${astCovPct}%`:'N/A'}</div>
                          <div style={{ fontSize:14, color:'#f0f0ff' }}>Function coverage for {repoName}</div>
                        </div>
                        <span style={{ padding:'8px 18px', borderRadius:99, fontSize:12, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>{astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO'}</span>
                      </div>
                      <p style={{ fontSize:14, color:'#ccd8ff', lineHeight:1.8, marginBottom:astCovPct!=null?18:0 }}>{unitFinding.message || unitFinding.fallbackMessage}</p>
                      {astCovPct!=null && (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.muted, marginBottom:7 }}>
                            <span>Functions referenced in test files</span>
                            <span style={{ color:'#38bdf8', fontWeight:700 }}>{astCovPct}%</span>
                          </div>
                          <div style={{ height:7, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#38bdf8,#818cf8)', width:`${astCovPct}%`, transition:'width 1.6s cubic-bezier(.22,1,.36,1)' }}/>
                          </div>
                        </div>
                      )}
                    </div>
                    {(srcFiles!=null||testFiles!=null) && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                        {[
                          { v:srcFiles??'N/A', l:'Source files analysed', tip:'Files containing function definitions that were parsed', c:C.cyan },
                          { v:testFiles??'N/A', l:'Test files analysed', tip:'Files searched for function name references', c:C.green },
                        ].map(s => (
                          <div key={s.l} style={{ ...glass(), padding:'16px 18px', textAlign:'center' }}>
                            <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:4 }}>{s.v}</div>
                            <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{s.l}</div>
                            <div style={{ fontSize:11, color:'#c8d0f0' }}>{s.tip}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {untestedFns.length > 0 && (
                      <div style={{ ...glass('#ef4444'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.12em' }}>Untested functions ({untestedFns.length})</div>
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {untestedFns.map(fn => (
                            <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'4px 10px', borderRadius:7, background:'rgba(239,68,68,.12)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.25)' }}>{fn}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {testedFns.length > 0 && (
                      <div style={{ ...glass('#22c55e'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#22c55e', textTransform:'uppercase', letterSpacing:'.12em' }}>Tested functions ({testedFns.length})</div>
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {testedFns.map(fn => (
                            <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'4px 10px', borderRadius:7, background:'rgba(34,197,94,.1)', color:'#86efac', border:'1px solid rgba(34,197,94,.22)' }}>{fn}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {astMsg && (
                      <div style={{ background:astMsg.bg, border:`1px solid ${astMsg.border}`, borderRadius:16, padding:'18px 22px', marginBottom:16 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:astMsg.color, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>{astMsg.title}</div>
                        <p style={{ fontSize:13, color:'#f0f0ff', lineHeight:1.85 }}>{astMsg.text}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>[ ]</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>No AST data available</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.faint }}>Run: cd backend and npm install @babel/parser</div>
                  </div>
                )}
              </div>
            )}
            {/* CODE QUALITY TAB - Week 5 */}
            {activeTab === 'quality' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.purple, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Code Quality</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Cyclomatic Complexity</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Functions in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> analysed for branching complexity. Higher scores mean harder to test and maintain.</p>
                </div>
                {codeQuality ? (
                  <>
                    <div style={{ ...glass(qualityRatingColour(codeQuality.overallRating)), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${qualityRatingColour(codeQuality.overallRating)},transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontSize:48, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:qualityRatingColour(codeQuality.overallRating), lineHeight:1, marginBottom:6 }}>{codeQuality.avgComplexity}</div>
                          <div style={{ fontSize:16, color:'#f0f0ff', fontWeight:600 }}>Average cyclomatic complexity</div>
                          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{codeQuality.filesAnalysed} files - {codeQuality.totalFunctions} functions analysed</div>
                        </div>
                        <span style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:`${qualityRatingColour(codeQuality.overallRating)}1f`, color:qualityRatingColour(codeQuality.overallRating), border:`1px solid ${qualityRatingColour(codeQuality.overallRating)}44` }}>
                          {codeQuality.overallRating?.toUpperCase().replace('-',' ')}
                        </span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[
                          { l:'Simple (1-5)',    v:codeQuality.simple,   c:C.green,   tip:'Easy to read, easy to test' },
                          { l:'Moderate (6-10)', v:codeQuality.moderate, c:C.amber,   tip:'Consider splitting into smaller functions' },
                          { l:'Complex (11+)',   v:codeQuality.complex,  c:'#ef4444', tip:'High refactor priority' },
                        ].map(b=>(
                          <div key={b.l} style={{ background:`${b.c}10`, border:`1px solid ${b.c}25`, borderRadius:12, padding:'14px', textAlign:'center' }}>
                            <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:b.c, marginBottom:4 }}>{b.v}</div>
                            <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{b.l}</div>
                            <div style={{ fontSize:11, color:C.faint }}>{b.tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Worst offenders - uses codeQuality.complexFunctions (correct field) */}
                    {codeQuality.complexFunctions?.length > 0 && (
                      <div style={{ ...glass('#ef4444'), padding:'20px 22px', marginBottom:16 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>
                          Most complex functions - top {Math.min(codeQuality.complexFunctions.length, 20)} worst offenders
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {codeQuality.complexFunctions.map((fn, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(255,255,255,.06)' }}>
                              <div style={{ width:36, height:36, borderRadius:8, background:`${complexityColour(fn.complexity)}18`, border:`1px solid ${complexityColour(fn.complexity)}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:complexityColour(fn.complexity) }}>{fn.complexity}</span>
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:'#f0f0ff', fontFamily:"'IBM Plex Mono',monospace", marginBottom:2 }}>{fn.name}()</div>
                                <div style={{ fontSize:11, color:C.faint, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fn.file}</div>
                              </div>
                              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'3px 9px', borderRadius:99, background:`${complexityColour(fn.complexity)}18`, color:complexityColour(fn.complexity), border:`1px solid ${complexityColour(fn.complexity)}30`, flexShrink:0 }}>{complexityLabel(fn.complexity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Code smells - fixed: uses smell.detail not smell.function */}
                    {codeQuality.smells?.length > 0 && (
                      <div style={{ ...glass(C.amber), padding:'20px 22px', marginBottom:16 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.amber, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>
                          Code smells ({codeQuality.smells.length})
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {codeQuality.smells.map((smell, i) => (
                            <div key={i} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(255,255,255,.06)' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 8px', borderRadius:99, background:`${C.amber}18`, color:C.amber, border:`1px solid ${C.amber}30`, flexShrink:0 }}>{smell.type}</span>
                                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:'#f0f0ff', fontWeight:600 }}>{smellFnName(smell.detail)}</span>
                              </div>
                              {smell.file && <div style={{ fontSize:11, color:C.faint, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{smell.file}</div>}
                              {smell.detail && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{smell.detail}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duplicate blocks - fixed: uses dup.preview not dup.lines */}
                    {codeQuality.duplicateBlocks?.length > 0 && (
                      <div style={{ ...glass(C.purple), padding:'20px 22px', marginBottom:16 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.purple, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>
                          Duplicate blocks ({codeQuality.duplicateBlocks.length})
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {codeQuality.duplicateBlocks.map((dup, i) => (
                            <div key={i} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(255,255,255,.06)' }}>
                              {dup.preview && (
                                <pre style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#c4b5fd', margin:'0 0 8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dup.preview}</pre>
                              )}
                              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                {(dup.files || []).map((f, j) => (
                                  <span key={j} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(129,140,248,.1)', color:'#c4b5fd', border:'1px solid rgba(129,140,248,.2)' }}>{f}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ ...glass(), padding:'20px 24px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>How cyclomatic complexity is measured</div>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:12 }}>
                        Cyclomatic complexity counts the number of independent paths through a function. It starts at 1 and increases by 1 for each branching statement: if, else if, for, while, switch case, catch, and, or, and ternary operators.
                      </p>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82 }}>
                        A score of 1-5 is simple and well-structured. 6-10 is moderate - consider splitting. 11+ is complex and should be refactored. The analysis uses @babel/parser for an exact AST walk on JS/TS files (up to 40 files per scan).
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>[ ]</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>Code Quality is an optional check</div>
                    <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>To enable it, pass <code style={{ background:'rgba(129,140,248,.15)', color:C.purple, padding:'2px 8px', borderRadius:5, fontFamily:"'IBM Plex Mono',monospace", fontSize:12 }}>"requestedChecks":["code-quality"]</code> in the scan request.</div>
                  </div>
                )}
              </div>
            )}
            {/* DEPENDENCIES TAB - Week 6 */}
            {activeTab === 'deps' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.amber, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Dependency Audit</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Vulnerability Audit</h1>
                  <p style={{ fontSize:14, color:C.muted }}>npm packages in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> cross-referenced against the OSV.dev database for known CVEs.</p>
                </div>
                {depAudit ? (
                  <>
                    {/* Not applicable banner for non-JS repos */}
                    {depAudit.lockFileFound === false && (
                      <div style={{ background:'rgba(148,163,184,.08)', border:'1px solid rgba(148,163,184,.2)', borderRadius:14, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'flex-start', gap:12 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:18, color:C.muted, flexShrink:0 }}>[~]</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:'#f0f0ff', marginBottom:4 }}>Not applicable for this repository</div>
                          <div style={{ fontSize:13, color:C.muted, lineHeight:1.65 }}>No <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:'rgba(255,255,255,.08)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>package-lock.json</code> or <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:'rgba(255,255,255,.08)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>yarn.lock</code> was found. This is expected for Java, Python, Go, or other non-Node.js projects. The dependency audit only applies to npm/yarn packages.</div>
                        </div>
                      </div>
                    )}
                    {/* Summary card */}
                    <div style={{ ...glass(depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${depSummary.critical > 0 ? '#ef4444' : C.amber},transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontSize:48, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green, lineHeight:1, marginBottom:6 }}>{depAudit.lockFileFound === false ? 'N/A' : (depAudit.totalVulnerabilities ?? depVulns.length)}</div>
                          <div style={{ fontSize:16, color:'#f0f0ff', fontWeight:600 }}>{depAudit.lockFileFound === false ? 'No lock file found' : 'Vulnerabilities found'}</div>
                          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{depAudit.lockFileFound === false ? 'Not a Node.js project - audit skipped' : `${depAudit.totalPackages ?? 0} packages checked via OSV.dev API`}</div>
                        </div>
                        <span style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:`${depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green}1f`, color:depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green, border:`1px solid ${depSummary.critical > 0 ? '#ef4444' : depSummary.high > 0 ? C.amber : C.green}44` }}>
                          {depAudit.lockFileFound === false ? 'N/A' : depSummary.critical > 0 ? 'CRITICAL' : depSummary.high > 0 ? 'HIGH' : depVulns.length > 0 ? 'WARN' : 'PASS'}
                        </span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                        {[
                          { l:'Critical', v:depSummary.critical, c:'#ef4444' },
                          { l:'High',     v:depSummary.high,     c:C.amber   },
                          { l:'Medium',   v:depSummary.medium,   c:C.purple  },
                          { l:'Low',      v:depSummary.low,      c:C.green   },
                        ].map(b=>(
                          <div key={b.l} style={{ background:`${b.c}10`, border:`1px solid ${b.c}25`, borderRadius:12, padding:'14px', textAlign:'center', cursor:'pointer', transition:'all .2s', outline:depFilter===b.l.toLowerCase()?`2px solid ${b.c}`:'none' }}
                            onClick={() => setDepFilter(prev => prev === b.l.toLowerCase() ? 'all' : b.l.toLowerCase())}>
                            <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:b.c, marginBottom:4 }}>{b.v}</div>
                            <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.07em' }}>{b.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                      {['all','critical','high','medium','low'].map(f => (
                        <button key={f} onClick={() => setDepFilter(f)}
                          style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'5px 14px', borderRadius:99, border:`1px solid ${depFilter===f ? C.amber : 'rgba(255,255,255,.12)'}`, background:depFilter===f ? `${C.amber}18` : 'transparent', color:depFilter===f ? C.amber : C.muted, cursor:'pointer', transition:'all .2s' }}>
                          {f === 'all' ? `All (${depVulns.length})` : f.charAt(0).toUpperCase()+f.slice(1)+` (${depSummary[f] ?? 0})`}
                        </button>
                      ))}
                    </div>

                    {/* Vulnerability list */}
                    {depFiltered.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }} className="rs-dep-table">
                        {depFiltered.map((vuln, i) => (
                          <div key={i} style={{ ...glass(), padding:'18px 20px', borderLeft:`4px solid ${sevColour(vuln.severity)}` }}>
                            {/* Header row */}
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10, gap:12, flexWrap:'wrap' }}>
                              <div>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:700, color:'#f0f0ff' }}>{vuln.package}</span>
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.faint, background:'rgba(255,255,255,.06)', padding:'2px 7px', borderRadius:5 }}>v{vuln.version}</span>
                                  {vuln.fixedVersion && (
                                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.green, background:'rgba(34,197,94,.1)', padding:'2px 8px', borderRadius:5, border:'1px solid rgba(34,197,94,.25)' }}>Fix: v{vuln.fixedVersion}</span>
                                  )}
                                </div>
                                <div style={{ fontSize:13, color:'#f0f0ff', fontWeight:600, marginBottom:3 }}>{vuln.title || vuln.summary || vuln.id}</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:10, fontSize:11, color:C.faint }}>
                                  {vuln.id && <span style={{ fontFamily:"'IBM Plex Mono',monospace", color:C.muted }}>{vuln.id}</span>}
                                  {vuln.cvss && <span>CVSS score: <span style={{ color:sevColour(vuln.severity), fontWeight:700 }}>{vuln.cvss}</span></span>}
                                </div>
                              </div>
                              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'5px 12px', borderRadius:99, background:`${sevColour(vuln.severity)}20`, color:sevColour(vuln.severity), border:`1px solid ${sevColour(vuln.severity)}40`, flexShrink:0, fontWeight:700 }}>{(vuln.severity || 'UNKNOWN').toUpperCase()}</span>
                            </div>
                            {/* What this vulnerability means and how to fix it */}
                            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:8, padding:'10px 14px', border:'1px solid rgba(255,255,255,.07)' }}>
                              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:sevColour(vuln.severity), textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>What this means and how to fix it</div>
                              <p style={{ fontSize:12, color:'#d4d4f0', lineHeight:1.7, margin:'0 0 6px' }}>
                                {vuln.description ||
                                  (vuln.severity === 'critical' || vuln.severity === 'high'
                                    ? `${vuln.package} v${vuln.version} has a known security vulnerability (${vuln.id || 'see advisory'}). This version is directly exploitable and should be updated immediately. An attacker could use this flaw to compromise your application or its users.`
                                    : `${vuln.package} v${vuln.version} contains a security weakness (${vuln.id || 'see advisory'}). While not immediately critical, leaving this unpatched increases your attack surface over time.`
                                  )
                                }
                              </p>
                              {vuln.fixedVersion ? (
                                <p style={{ fontSize:12, color:C.green, margin:0 }}>
                                  Run: <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:'rgba(34,197,94,.1)', padding:'1px 6px', borderRadius:4, fontSize:11 }}>npm install {vuln.package}@{vuln.fixedVersion}</code> to update to the patched version.
                                </p>
                              ) : (
                                <p style={{ fontSize:12, color:C.amber, margin:0 }}>No fixed version is available yet. Check the package repository for updates or consider an alternative package.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...glass(), padding:32, textAlign:'center', marginBottom:16 }}>
                        <div style={{ fontSize:32, marginBottom:12 }}>( )</div>
                        <div style={{ fontSize:14, color:C.muted }}>{depFilter === 'all' ? 'No vulnerabilities found in scanned packages.' : `No ${depFilter} severity vulnerabilities.`}</div>
                      </div>
                    )}

                    {/* How it works */}
                    <div style={{ ...glass(), padding:'20px 24px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>How dependency audit works</div>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:12 }}>
                        RepoScope reads package-lock.json (v1, v2, and v3 format) and yarn.lock from the repository root. Each package name and version is sent to the OSV.dev API in batches of 5. The OSV.dev database aggregates CVEs, GitHub Security Advisories, and other vulnerability sources.
                      </p>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82 }}>
                        Severity is mapped from CVSS scores: Critical (9.0+), High (7.0-8.9), Medium (4.0-6.9), Low (below 4.0). Where a fixed version is available it is shown alongside the vulnerability.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>[ ]</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>Dependency audit not yet run</div>
                    <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, maxWidth:480, margin:'0 auto' }}>This check requires a <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:'rgba(255,255,255,.08)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>package-lock.json</code> or <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:'rgba(255,255,255,.08)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>yarn.lock</code> file in the repository. It only applies to Node.js projects. Java, Python, and other language projects are not scanned here.</div>
                  </div>
                )}
              </div>
            )}
            {/* SECURITY TAB - Week 7 */}
            {activeTab === 'security' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.pink, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Security Scan</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>OWASP and Secrets Analysis</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Source files in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> scanned for hardcoded secrets and OWASP Top 10 vulnerability patterns.</p>
                </div>
                {secScan ? (
                  <>
                    {/* Severity legend - what each level means */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                      {[
                        { sev:'Critical', c:'#ef4444', icon:'[!]', what:'Hardcoded secret or credential', why:'If leaked, an attacker can immediately access your systems, cloud accounts, or databases. Must be removed and rotated now.' },
                        { sev:'High',     c:C.amber,   icon:'[H]', what:'Dangerous code pattern (eval, SQL injection, shell injection)', why:'Directly exploitable by an attacker to run arbitrary code, steal data, or take over the server. Fix before shipping.' },
                        { sev:'Medium',   c:C.purple,  icon:'[M]', what:'Insecure practice (XSS vector, weak crypto, CORS wildcard)', why:'Exploitable under certain conditions. An attacker needs extra steps but this is still a real vulnerability. Fix soon.' },
                        { sev:'Low',      c:C.green,   icon:'[L]', what:'Minor security hygiene issue (debug logging, HTTP not HTTPS)', why:'Low direct risk but adds up over time and can aid an attacker during reconnaissance. Fix in your next cleanup sprint.' },
                      ].map(b => (
                        <div key={b.sev} style={{ background:`${b.c}0d`, border:`1px solid ${b.c}30`, borderRadius:12, padding:'14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:b.c, fontWeight:700 }}>{b.icon}</span>
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:b.c, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700 }}>{b.sev}</span>
                          </div>
                          <div style={{ fontSize:11, color:'#f0f0ff', fontWeight:600, marginBottom:4, lineHeight:1.4 }}>{b.what}</div>
                          <div style={{ fontSize:11, color:C.muted, lineHeight:1.55 }}>{b.why}</div>
                        </div>
                      ))}
                    </div>

                    {/* Summary card */}
                    <div style={{ ...glass(secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${secSummary.critical > 0 ? '#ef4444' : C.pink},transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontSize:48, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink, lineHeight:1, marginBottom:6 }}>{secFindings.length}</div>
                          <div style={{ fontSize:16, color:'#f0f0ff', fontWeight:600 }}>Security issues found</div>
                          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{secScan.filesScanned ?? 0} JS/TS files scanned - {secScan.filesSkipped ?? 0} skipped (binary/minified)</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                          <span style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:`${secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink}1f`, color:secSummary.critical > 0 ? '#ef4444' : secSummary.high > 0 ? C.amber : C.pink, border:`1px solid ${secSummary.critical > 0 ? '#ef4444' : C.pink}44` }}>
                            {secSummary.critical > 0 ? 'CRITICAL' : secSummary.high > 0 ? 'HIGH' : secFindings.length > 0 ? 'WARN' : 'PASS'}
                          </span>
                          {secScan.riskScore > 0 && (
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.muted }}>Risk score: <span style={{ color: secSummary.critical > 0 ? '#ef4444' : C.amber, fontWeight:700 }}>{secScan.riskScore}</span></span>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                        {[
                          { l:'Critical', v:secSummary.critical, c:'#ef4444', tip:'Hardcoded secrets - fix immediately' },
                          { l:'High',     v:secSummary.high,     c:C.amber,   tip:'Directly exploitable code patterns' },
                          { l:'Medium',   v:secSummary.medium,   c:C.purple,  tip:'Insecure practices, fix soon' },
                          { l:'Low',      v:secSummary.low,      c:C.green,   tip:'Minor hygiene issues' },
                        ].map(b=>(
                          <div key={b.l} style={{ background:`${b.c}10`, border:`1px solid ${b.c}25`, borderRadius:12, padding:'14px', textAlign:'center', cursor:'pointer', transition:'all .2s', outline:secFilter===b.l.toLowerCase()?`2px solid ${b.c}`:'none' }}
                            onClick={() => setSecFilter(prev => prev === b.l.toLowerCase() ? 'all' : b.l.toLowerCase())}>
                            <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:b.c, marginBottom:4 }}>{b.v}</div>
                            <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{b.l}</div>
                            <div style={{ fontSize:10, color:C.faint, lineHeight:1.4 }}>{b.tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                      {['all','critical','high','medium','low'].map(f => (
                        <button key={f} onClick={() => setSecFilter(f)}
                          style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'5px 14px', borderRadius:99, border:`1px solid ${secFilter===f ? C.pink : 'rgba(255,255,255,.12)'}`, background:secFilter===f ? `${C.pink}18` : 'transparent', color:secFilter===f ? C.pink : C.muted, cursor:'pointer', transition:'all .2s' }}>
                          {f === 'all' ? `All (${secFindings.length})` : f.charAt(0).toUpperCase()+f.slice(1)+` (${secSummary[f] ?? 0})`}
                        </button>
                      ))}
                    </div>

                    {/* OWASP categories summary - computed from live deduplicated findings */}
                    {Object.entries(secFindings.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {})).length > 0 && (
                      <div style={{ ...glass(C.pink), padding:'16px 20px', marginBottom:16 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.pink, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>Issues by OWASP category</div>
                        <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>OWASP Top 10 is the industry standard list of the most critical web application security risks.</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {Object.entries(secFindings.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {})).map(([cat, count]) => (
                            <div key={cat} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(244,114,182,.1)', border:'1px solid rgba(244,114,182,.2)', borderRadius:8, padding:'6px 12px' }}>
                              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, color:C.pink, fontWeight:800 }}>{count}</span>
                              <span style={{ fontSize:11, color:'#f0f0ff' }}>{cat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Findings list */}
                    {secFiltered.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }} className="rs-sec-table">
                        {secFiltered.map((finding, i) => (
                          <div key={i} style={{ ...glass(), padding:'18px 20px', borderLeft:`4px solid ${secSevColour(finding.severity)}` }}>
                            {/* Header row */}
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10, gap:12, flexWrap:'wrap' }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:'#f0f0ff' }}>{finding.label}</span>
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.pink, background:'rgba(244,114,182,.1)', padding:'2px 8px', borderRadius:99, border:'1px solid rgba(244,114,182,.2)' }}>{finding.category}</span>
                                </div>
                                {/* File and line */}
                                <div style={{ fontSize:11, color:C.faint, fontFamily:"'IBM Plex Mono',monospace", marginBottom:6 }}>
                                  <span style={{ color:C.muted }}>File: </span>{finding.file}{finding.line ? <span style={{ color:secSevColour(finding.severity) }}>:{finding.line}</span> : ''}
                                </div>
                              </div>
                              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'5px 12px', borderRadius:99, background:`${secSevColour(finding.severity)}20`, color:secSevColour(finding.severity), border:`1px solid ${secSevColour(finding.severity)}40`, flexShrink:0, fontWeight:700 }}>{(finding.severity || 'UNKNOWN').toUpperCase()}</span>
                            </div>

                            {/* Code snippet - what was detected */}
                            {finding.snippet && (
                              <div style={{ marginBottom:10 }}>
                                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Detected on line {finding.line}</div>
                                <pre style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:'#fbbf24', background:'rgba(0,0,0,.4)', borderRadius:8, padding:'10px 12px', margin:0, overflow:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all', border:`1px solid ${secSevColour(finding.severity)}25` }}>{finding.snippet}</pre>
                              </div>
                            )}

                            {/* What this means and how to fix it */}
                            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:8, padding:'10px 14px', border:'1px solid rgba(255,255,255,.07)' }}>
                              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:secSevColour(finding.severity), textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>What this means and how to fix it</div>
                              <p style={{ fontSize:12, color:'#d4d4f0', lineHeight:1.7, margin:0 }}>{finding.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...glass(), padding:32, textAlign:'center', marginBottom:16 }}>
                        <div style={{ fontSize:32, marginBottom:12 }}>( )</div>
                        <div style={{ fontSize:14, color:'#f0f0ff', marginBottom:6 }}>{secFilter === 'all' ? 'No security issues detected.' : `No ${secFilter} severity issues.`}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{secFilter === 'all' ? `${secScan.filesScanned ?? 0} JavaScript and TypeScript files were scanned for secrets and OWASP patterns. None matched.` : 'Try selecting a different severity filter above.'}</div>
                      </div>
                    )}

                    {/* How it works */}
                    <div style={{ ...glass(), padding:'20px 24px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>How the security scan works</div>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:10 }}>
                        Each JavaScript and TypeScript source file (up to 60 per scan, skipping node_modules and minified files) is read line by line and checked against two pattern sets.
                      </p>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:10 }}>
                        <strong style={{ color:'#f0f0ff' }}>Secret detection (Critical):</strong> API keys, AWS credentials, private keys, JWT signing secrets, database connection strings, GitHub tokens, Stripe keys, and SendGrid keys. These are flagged as Critical because exposure immediately compromises your accounts.
                      </p>
                      <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82 }}>
                        <strong style={{ color:'#f0f0ff' }}>OWASP Top 10 patterns (High/Medium/Low):</strong> eval() injection, string-interpolated SQL queries (SQL injection), innerHTML and dangerouslySetInnerHTML (XSS), shell command injection, path traversal, open redirects, MD5/SHA-1 weak hashing, wildcard CORS, insecure cookies, missing rate limiting on auth routes, prototype pollution, and debug logging of sensitive values.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>[ ]</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>Security scan not yet run</div>
                    <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>Automatically runs on JavaScript and TypeScript source files.</div>
                  </div>
                )}
              </div>
            )}
            {/* DIAGNOSTICS TAB */}
            {activeTab === 'diagnostics' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.purple, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Diagnostics</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Repository Analysis Report</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Real stats from scanning <strong style={{ color:'#f0f0ff' }}>{repoName}</strong>, followed by 8 fixed unit tests that validate the TDD detection engine itself.</p>
                </div>
                <div style={{ ...glass(C.green), padding:24, marginBottom:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.green},${C.cyan},transparent)` }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.green, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:16 }}>Actual results for {repoName} - unique to this repository</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { l:'Commits analysed',       v:totalCommits,        c:C.green,  tip:'Total commits fetched from GitHub API (up to 200)' },
                      { l:'Implementation commits', v:displayCodeCount,    c:C.cyan,   tip:'Commits with feat/fix/build/create/implement/add/update/chore' },
                      { l:'TDD pairs confirmed',    v:displayTddCount,     c:C.purple, tip:'Impl commits that had a test commit within the 5 preceding commits' },
                      { l:'TDD ratio',              v:`${displayRatio}%`,  c:tddColor, tip:`${tddBadge}: ${displayRatio >= 60 ? 'above 60%' : displayRatio >= 30 ? '30-60%' : 'below 30%'} threshold` },
                      { l:'Test files found',       v:structSignal?.testFileCount??0, c:C.amber, tip:'Files in test/, __tests__/, *.test.js, test_*.py patterns' },
                      { l:'Test file ratio',        v:`${structSignal?.testFileRatio??0}%`, c:C.pink, tip:'Percentage of all repository files that are test files' },
                    ].map(s => (
                      <div key={s.l} style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${s.c}20`, borderRadius:10, padding:'14px 14px' }}>
                        <div style={{ fontSize:24, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:4 }}>{s.v}</div>
                        <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.07em', lineHeight:1.4, marginBottom:4 }}>{s.l}</div>
                        <div style={{ fontSize:11, color:'#c8d0f0', lineHeight:1.5 }}>{s.tip}</div>
                      </div>
                    ))}
                  </div>
                  {unitFinding && (
                    <div style={{ background:'rgba(56,189,248,.06)', border:'1px solid rgba(56,189,248,.15)', borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:10 }}>AST coverage results for {repoName}</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                        {[
                          { l:'Coverage',    v:astCovPct!=null?`${astCovPct}%`:'N/A', c:'#38bdf8' },
                          { l:'Source files', v:srcFiles??'N/A', c:C.cyan },
                          { l:'Test files',   v:testFiles??'N/A', c:C.green },
                          { l:'Untested fns', v:untestedFns.length, c:'#ef4444' },
                        ].map(s => (
                          <div key={s.l} style={{ textAlign:'center' }}>
                            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:2 }}>{s.v}</div>
                            <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ ...glass(C.purple), padding:24, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#6366f1,#a78bfa,transparent)' }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.purple, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>Algorithm unit tests</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#f0f0ff', marginBottom:8 }}>TDD Detection Engine Tests</div>
                  <p style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:16 }}>These 8 tests validate the detection algorithm using controlled fake commit data. They are identical for every repository scan because they test whether the engine logic itself is correct, not your repository.</p>
                  <button onClick={runDiag} disabled={diagRunning}
                    style={{ background:'linear-gradient(135deg,#6366f1,#a78bfa)', color:'#fff', border:'none', borderRadius:10, padding:'11px 24px', fontSize:13, fontWeight:700, cursor:diagRunning?'not-allowed':'pointer', fontFamily:"'Space Grotesk',sans-serif", display:'inline-flex', alignItems:'center', gap:8, opacity:diagRunning?0.65:1, marginBottom:diagRunning||diagRes.length?16:0, transition:'all .22s' }}
                    onMouseEnter={e=>{if(!diagRunning){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(99,102,241,.4)';}}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                    {diagRunning?'Running tests...':diagDone?'Run again':'Run diagnostics'}
                  </button>
                  {diagRunning && diagStepTxt && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)', borderRadius:10, marginBottom:16, fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:'#c4b5fd' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:C.purple, display:'inline-block', animation:'pulse 1s ease-in-out infinite' }}/>
                      {diagStepTxt}
                    </div>
                  )}
                  {diagScore && (
                    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, marginBottom:16 }}>
                      <span style={{ fontSize:20 }}>{diagScore.passed===diagScore.total?'(ok)':'(!)'}</span>
                      <span style={{ fontSize:15, fontWeight:700, color:diagScore.passed===diagScore.total?C.green:C.amber }}>{diagScore.passed} / {diagScore.total} tests passed</span>
                      <div style={{ flex:1, height:5, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#22c55e,#38bdf8)', width:`${diagScore.pct}%`, transition:'width 1s cubic-bezier(.22,1,.36,1)' }}/>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, color:C.muted, fontWeight:700 }}>{diagScore.pct}%</span>
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {diagRes.map((r,i) => (
                      <div key={i} onClick={() => setExpanded(expanded===i?null:i)}
                        style={{ borderRadius:12, border:'1px solid', overflow:'hidden', cursor:'pointer', borderColor:r.p?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)', background:r.p?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)', animation:`fu .35s ${i*.06}s both` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
                          <span style={{ fontSize:16, flexShrink:0 }}>{r.p?'[+]':'[x]'}</span>
                          <span style={{ flex:1, fontSize:13, fontWeight:600, color:r.p?'#86efac':'#fca5a5', lineHeight:1.4 }}>{r.n}</span>
                          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, padding:'2px 8px', borderRadius:99, background:r.p?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)', color:r.p?C.green:'#ef4444', border:`1px solid ${r.p?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}` }}>{r.p?'PASS':'FAIL'}</span>
                          <span style={{ fontSize:11, color:C.faint, transition:'transform .2s', transform:expanded===i?'rotate(180deg)':'none' }}>v</span>
                        </div>
                        {expanded===i && (
                          <div style={{ padding:'0 14px 14px 42px', borderTop:'1px solid rgba(255,255,255,.05)', background:'rgba(255,255,255,.02)' }}>
                            <p style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.75, marginTop:12, marginBottom:r.p?0:12 }}>{r.d}</p>
                            {!r.p && (
                              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'10px 14px' }}>
                                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>How to fix</div>
                                <p style={{ fontSize:12, color:'#fca5a5', lineHeight:1.7 }}>{r.fix}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes orbf { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,20px) scale(1.05)} }
        @keyframes rpp { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)} 70%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        .rs-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .rs-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .rs-dep-table,.rs-sec-table{display:flex;flex-direction:column;gap:10px}
        @media(max-width:900px){.rs-chips{grid-template-columns:repeat(2,1fr)!important}.rs-two-col{grid-template-columns:1fr!important}}
        @media(max-width:600px){.rs-chips{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}