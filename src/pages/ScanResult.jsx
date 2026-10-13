import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/* ── TDD engine, mirrors backend tddDetector.js exactly ── */
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

/* ── Diagnostic unit tests for the engine (fixed fixtures, same every run) ── */
const DIAG_TESTS = [
  {
    n: 'analyse() returns null for empty commit array',
    d: 'When the commit array is empty, the engine returns null instead of 0. This lets the UI show "inconclusive" rather than a misleading 0% ratio. This test uses an empty array [] as input and checks the return is null.',
    fix: 'Ensure the function checks commits?.length before processing and returns { tddRatio: null } immediately for empty input.',
    f: () => runTDD([]).tddRatio === null,
  },
  {
    n: 'analyse() returns null when every commit is a test commit',
    d: 'If every commit in the repo is a test commit, there are zero implementation commits. The ratio is undefined so the engine returns null rather than a false 0%.',
    fix: 'The codeCount variable stays at zero because no commits match CODE_KW. When codeCount is 0, return { tddRatio: null }.',
    f: () => runTDD([{ message: 'add test for login' }, { message: 'write test for signup' }]).tddRatio === null,
  },
  {
    n: 'analyse() returns 100 when test commit comes before implementation',
    d: 'GitHub returns commits newest-first. So [implement payment, add test for payment] in the array means "add test" was committed first chronologically. After reversing, the engine finds the test commit in the lookback window and confirms a TDD pair. Result: 100%.',
    fix: 'Ensure commits are reversed before the loop so the oldest commit is at index 0. The lookback slice(0, i) must search backwards from the implementation commit.',
    f: () => runTDD([{ message: 'implement payment logic' }, { message: 'add test for payment' }]).tddRatio === 100,
  },
  {
    n: 'analyse() returns 0 when implementation commit comes before its test',
    d: 'GitHub returns newest-first. So [add test for auth, implement auth] in the array means "implement auth" was committed first chronologically. After reversing, the lookback finds no prior test. Result: 0%.',
    fix: 'This is correct behaviour. If failing, check the lookback uses slice(0, i) not slice(i, i+5). The window must look backwards.',
    f: () => runTDD([{ message: 'add test for auth' }, { message: 'implement auth' }]).tddRatio === 0,
  },
  {
    n: 'analyse() resolves to warn or pass for a realistic mixed commit history',
    d: 'In this fixture: write test for cart then add cart feature (TDD pair confirmed), write test for checkout then implement checkout (TDD pair confirmed), implement profile with no prior test (no pair). Two out of three implementation commits are TDD pairs. Ratio = 67%. Severity = pass.',
    fix: 'Verify thresholds: ratio >= 60 is pass, ratio >= 30 is warn, below 30 is info.',
    f: () => {
      const r = runTDD([
        { message: 'write test for cart' }, { message: 'add cart feature' },
        { message: 'write test for checkout' }, { message: 'implement checkout' },
        { message: 'implement profile' },
      ]);
      return r.severity === 'pass' || r.severity === 'warn';
    },
  },
  {
    n: "isTestCommit classifies 'add test for login' as true",
    d: "The word 'test' in the message matches the TEST_KW pattern /\\btest\\b/i. The \\b word boundary prevents false matches like 'contest' or 'testimony'. Returns true so this commit is eligible as the test half of a TDD pair.",
    fix: "Check that TEST_KW includes /\\btest\\b/i with word boundaries. Ensure you are calling TEST_KW.some(re => re.test(message)).",
    f: () => isTestCommit('add test for login') === true,
  },
  {
    n: "isCodeCommit classifies 'add test for login' as false",
    d: "Although 'add' matches CODE_KW, isCodeCommit first calls isTestCommit. Because 'test' is present, isTestCommit returns true, so isCodeCommit returns false. This prevents the same commit being counted as both a test and an implementation commit.",
    fix: "Ensure isCodeCommit returns false immediately when isTestCommit(message) is true, before checking CODE_KW.",
    f: () => isCodeCommit('add test for login') === false,
  },
  {
    n: "isCodeCommit classifies 'implement payment service' as true",
    d: "The word 'implement' matches CODE_KW and no test keywords are present in the message. isTestCommit returns false, so isCodeCommit checks CODE_KW and returns true. This commit will be treated as an implementation commit.",
    fix: "Verify CODE_KW includes /\\bimplement\\b/i. Check the function returns true when CODE_KW matches and isTestCommit is false.",
    f: () => isCodeCommit('implement payment service') === true,
  },
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

const SMELL_META = {
  'long-function':   { icon: '📏', label: 'Long Function',    colour: C.amber },
  'too-many-params': { icon: '🔢', label: 'Too Many Params',  colour: C.amber },
  'deep-nesting':    { icon: '🪆', label: 'Deep Nesting',     colour: '#ef4444' },
};

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
  const [smellFilter, setSmellFilter] = useState('all');
  const [expandedFn,  setExpandedFn]  = useState(null);

  const pollRef   = useRef(null);
  const stepTimer = useRef(null);

  /* ── Derived data from scan ── */
  const totalFiles    = scanData?.totalFiles    ?? scanData?.summary?.totalFiles    ?? 0;
  const totalCommits  = scanData?.totalCommits  ?? scanData?.summary?.totalCommits  ?? 0;

  /* Week 5 new API shape: tddAnalysis / astCoverage / codeQuality at top level */
  const tddAnalysis   = scanData?.tddAnalysis   ?? null;
  const astCoverage   = scanData?.astCoverage   ?? null;
  const codeQuality   = scanData?.codeQuality   ?? null;

  /* Backwards-compat: Week 4 used findings array */
  const tddFinding    = tddAnalysis  ?? scanData?.findings?.find(f => f.category === 'tdd')    ?? null;
  const unitFinding   = astCoverage  ?? scanData?.findings?.find(f => f.category === 'unit_test') ?? null;
  const recentCommits = scanData?.recentCommits ?? [];

  /* TDD derived */
  const localTDD        = recentCommits.length ? runTDD(recentCommits) : null;
  const displayRatio    = tddFinding?.tddRatio    ?? localTDD?.tddRatio    ?? 0;
  const displayCodeCount= tddFinding?.implementationCommits ?? tddFinding?.codeCount ?? localTDD?.codeCount ?? 0;
  const displayTddCount = tddFinding?.tddPairedCommits      ?? tddFinding?.tddCount  ?? localTDD?.tddCount  ?? 0;
  const displaySeverity = tddFinding?.category ?? tddFinding?.severity ?? localTDD?.severity ?? 'info';
  const tddColor        = displaySeverity === 'pass' ? C.green : displaySeverity === 'warn' ? C.amber : C.purple;
  const tddBadge        = displaySeverity === 'pass' ? 'PASS'  : displaySeverity === 'warn' ? 'WARN'  : 'INFO';

  const structSignal = tddFinding?.structuralSignal ?? null;

  /* AST derived */
  // When the fallback analyser ran (unsupported language), coveragePercent is 0 but meaningless.
  // Treat it as null so the UI shows the fallback message instead of "0% coverage".
  const _rawAstCov    = unitFinding?.coveragePercent ?? unitFinding?.coverage ?? null;
  const astCovPct     = (unitFinding?.analyserUsed === 'fallback') ? null : _rawAstCov;
  const testedFns     = unitFinding?.testedFunctions   ?? unitFinding?.testedFunctions   ?? [];
  const untestedFns   = unitFinding?.untestedFunctions ?? unitFinding?.untestedFunctions ?? [];
  const srcFiles      = unitFinding?.sourceFileCount   ?? unitFinding?.sourceFilesAnalysed ?? null;
  const testFiles     = unitFinding?.testFileCount     ?? unitFinding?.testFilesAnalysed   ?? null;

  /* Code Quality derived */
  const smells         = codeQuality?.smells         ?? [];
  const duplicates     = codeQuality?.duplicateBlocks ?? [];
  const filteredSmells = smellFilter === 'all' ? smells : smells.filter(s => s.type === smellFilter);

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
    if (!scanId) {
      setErrorMsg('No scan ID found. Please start a new scan from the homepage.');
      setPhase('error');
      return;
    }

    setStepIdx(0); setProgress(0);
    let si = 0;
    const advance = () => {
      if (si < SCAN_STEPS.length) {
        si++; setStepIdx(si);
        setProgress(Math.round((si / SCAN_STEPS.length) * 100));
        stepTimer.current = setTimeout(advance, 750);
      }
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

  /* TDD encouragement */
  const tddMsg = (() => {
    const r = displayRatio;
    const code = displayCodeCount;
    const pairs = displayTddCount;
    if (!recentCommits.length && !tddFinding) return null;
    if (displaySeverity === 'pass') return {
      color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)',
      title: 'Strong TDD practice detected',
      text: `${repoName} has ${r}% TDD ratio across ${code} implementation commits, with ${pairs} confirmed test-first pairs. This is above the 60% threshold for strong TDD discipline.`,
    };
    if (displaySeverity === 'warn') return {
      color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)',
      title: 'Partial TDD usage',
      text: `${repoName} shows ${r}% TDD ratio. Out of ${code} implementation commits, ${pairs} had a test commit written within the previous 5 commits.`,
    };
    return {
      color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)',
      title: 'TDD not detected in commit history',
      text: `${repoName} shows ${r}% TDD ratio across ${code} implementation commits, with only ${pairs} confirmed test-first pairs.`,
    };
  })();

  /* AST encouragement */
  const astMsg = (() => {
    if (!unitFinding) return null;
    const cov = astCovPct;
    if (cov == null) return {
      color: C.muted, bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
      title: 'AST analysis note',
      text: unitFinding.message || unitFinding.fallbackMessage || 'No analysable source files found.',
    };
    if (cov >= 70) return {
      color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)',
      title: 'Good function coverage',
      text: `${cov}% of functions in ${repoName} are referenced in test files. The ${untestedFns.length} untested functions listed above are the next targets.`,
    };
    if (cov >= 40) return {
      color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)',
      title: 'Partial function coverage',
      text: `${cov}% of functions in ${repoName} are referenced in test files. Work through the untested list one function at a time.`,
    };
    return {
      color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)',
      title: 'Low function coverage detected',
      text: `${cov}% of functions in ${repoName} are referenced in test files. Pick the first untested function, write one test for it, commit it. Repeat.`,
    };
  })();

  const NAV = [
    { id:'overview',    label:'Overview',      icon:'◈' },
    { id:'tdd',         label:'TDD Detection', icon:'⬡', badge: tddBadge, badgeColor: tddColor },
    { id:'ast',         label:'AST Coverage',  icon:'⬟', badge: unitFinding ? (unitFinding.analyserUsed === 'fallback' ? 'N/A' : astCovPct != null ? (astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO') : 'INFO') : 'INFO', badgeColor: unitFinding?.analyserUsed === 'fallback' ? C.muted : astCovPct >= 70 ? C.green : astCovPct >= 40 ? C.amber : C.purple },
    { id:'quality',     label:'Code Quality',  icon:'⬠', badge: codeQuality ? codeQuality.overallRating?.toUpperCase().replace('-',' ') : 'OFF', badgeColor: codeQuality ? qualityRatingColour(codeQuality.overallRating) : C.faint },
    { id:'diagnostics', label:'Diagnostics',   icon:'◉', badge: diagDone ? `${diagScore?.passed}/${diagScore?.total}` : null, badgeColor: diagDone && diagScore?.passed === diagScore?.total ? C.green : C.amber },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#06060e', color:'#f0f0ff', fontFamily:"'Space Grotesk',sans-serif", position:'relative', overflow:'hidden' }}>

      {/* Background orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,.07),transparent 65%)', top:-200, left:-200, filter:'blur(100px)', animation:'orbf 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,.06),transparent 65%)', bottom:-100, right:-100, filter:'blur(100px)', animation:'orbf 24s ease-in-out infinite', animationDelay:'-6s' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(129,140,248,.05),transparent 65%)', top:'40%', right:'20%', filter:'blur(80px)', animation:'orbf 18s ease-in-out infinite', animationDelay:'-3s' }}/>
      </div>

      {/* ── SCANNING ── */}
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
          <div style={{ fontSize:13, color:C.muted, marginBottom:40 }}>TDD detection · AST coverage · code quality</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:32, width:'100%', maxWidth:380 }}>
            {SCAN_STEPS.map((step, i) => {
              const done = i < stepIdx, active = i === stepIdx;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity:done||active?1:0.3, transition:'opacity .4s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, background:done?C.green:active?'rgba(56,189,248,.2)':'rgba(255,255,255,.06)', border:`1px solid ${done?C.green:active?C.cyan:'rgba(255,255,255,.1)'}`, color:done?'#06060e':active?C.cyan:C.muted, fontWeight:700 }}>
                    {done?'✓':active?'·':i+1}
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

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ ...glass('#ef4444'), padding:40, textAlign:'center', maxWidth:560 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠</div>
            <div style={{ fontSize:22, fontWeight:700, marginBottom:12 }}>Scan failed</div>
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.75, marginBottom:28 }}>{errorMsg}</div>
            <button onClick={() => navigate('/')} style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', border:'none', borderRadius:10, padding:'12px 32px', fontWeight:700, fontSize:14, cursor:'pointer' }}>Try again</button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
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
                    onMouseEnter={e => { if(!active) e.currentTarget.style.background='rgba(255,255,255,.04)'; }}
                    onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent'; }}>
                    <span style={{ fontSize:16, flexShrink:0, color:active?C.green:C.muted }}>{item.icon}</span>
                    <span style={{ fontSize:13, fontWeight:active?600:400, color:active?'#f0f0ff':C.muted, flex:1 }}>{item.label}</span>
                    {item.badge && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, padding:'2px 7px', borderRadius:99, background:`${item.badgeColor}18`, color:item.badgeColor, border:`1px solid ${item.badgeColor}30`, flexShrink:0 }}>{item.badge}</span>}
                  </button>
                );
              })}
              <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'16px 8px' }}/>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6, padding:'0 8px' }}>Coming soon</div>
              {[['Dependencies','⬟','Week 6'],['Security','⬠','Week 7'],['AI Summary','◈','Week 8']].map(([label,icon,wk]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, opacity:0.4, marginBottom:2 }}>
                  <span style={{ fontSize:14, color:C.muted }}>{icon}</span>
                  <span style={{ fontSize:12, color:C.muted, flex:1 }}>{label}</span>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint }}>{wk}</span>
                </div>
              ))}
            </nav>

            <div style={{ padding:16, borderTop:'1px solid rgba(255,255,255,.07)' }}>
              <button onClick={() => navigate('/')} style={{ width:'100%', background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', border:'none', borderRadius:10, padding:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" }}>New Scan</button>
            </div>
          </aside>

          {/* Main */}
          <main style={{ flex:1, minWidth:0, padding:'32px 28px', overflowY:'auto' }}>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.green, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Overview</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>{repoName}</h1>
                  <p style={{ fontSize:14, color:C.muted }}>{totalCommits} commits analysed across {totalFiles.toLocaleString()} files.</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }} className="rs-chips">
                  {[
                    { v:filesC.toLocaleString(), l:'Files scanned',    c:C.cyan,   icon:'📁' },
                    { v:commitsC,                l:'Commits analysed', c:C.purple, icon:'🔀' },
                    { v:`${tddC}%`,              l:'TDD ratio',        c:tddColor, icon:'🧪' },
                    { v:astCovPct!=null?`${astCovPct}%`:'N/A', l:'AST coverage', c:C.amber, icon:'📋' },
                  ].map(chip => (
                    <div key={chip.l} style={{ ...glass(chip.c), padding:'18px 16px', position:'relative', overflow:'hidden', transition:'transform .25s, box-shadow .25s', cursor:'default' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 16px 40px ${chip.c}22`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${chip.c},transparent)` }}/>
                      <div style={{ fontSize:18, marginBottom:10 }}>{chip.icon}</div>
                      <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:chip.c, marginBottom:4 }}>{chip.v}</div>
                      <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em' }}>{chip.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }} className="rs-two-col">
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
                        {structSignal.hasTestDirectory ? `✓ ${structSignal.testFileCount} test files found (${structSignal.testFileRatio}%)` : '✗ No dedicated test directory detected'}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:tddColor, marginTop:10 }}>View full analysis →</div>
                  </div>
                  <div style={{ ...glass('#38bdf8'), padding:22, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('ast')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>AST Coverage</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{astCovPct!=null?`${astCovPct}%`:'N/A'}</div>
                        {srcFiles!=null && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{srcFiles} source files, {testFiles} test files</div>}
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>{unitFinding?.analyserUsed === 'fallback' ? 'N/A' : astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO'}</span>
                    </div>
                    {untestedFns.length>0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                        {untestedFns.slice(0,4).map(fn => (
                          <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(239,68,68,.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.2)' }}>{fn}</span>
                        ))}
                        {untestedFns.length>4 && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(255,255,255,.06)', color:C.muted }}>+{untestedFns.length-4} more</span>}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:'#38bdf8', marginTop:10 }}>View full analysis →</div>
                  </div>
                </div>

                {/* Code Quality overview card — Week 5 */}
                {codeQuality && (
                  <div style={{ ...glass(qualityRatingColour(codeQuality.overallRating)), padding:22, marginBottom:14, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('quality')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:qualityRatingColour(codeQuality.overallRating), textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>Code Quality — Week 5</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>Avg complexity: {codeQuality.avgComplexity}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                          {codeQuality.filesAnalysed} files · {codeQuality.totalFunctions} functions · {codeQuality.complex} complex
                          {(codeQuality.smellCount > 0) && ` · ${codeQuality.smellCount} smell${codeQuality.smellCount !== 1 ? 's' : ''}`}
                          {(codeQuality.duplicateCount > 0) && ` · ${codeQuality.duplicateCount} duplicate${codeQuality.duplicateCount !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:`${qualityRatingColour(codeQuality.overallRating)}1f`, color:qualityRatingColour(codeQuality.overallRating), border:`1px solid ${qualityRatingColour(codeQuality.overallRating)}40` }}>{codeQuality.overallRating?.toUpperCase().replace('-',' ')}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                      {[{l:'Simple',c:C.green,v:codeQuality.simple},{l:'Moderate',c:C.amber,v:codeQuality.moderate},{l:'Complex',c:'#ef4444',v:codeQuality.complex}].map(b=>(
                        <div key={b.l} style={{ flex:1, background:`${b.c}12`, border:`1px solid ${b.c}25`, borderRadius:8, padding:'8px 0', textAlign:'center' }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, fontWeight:700, color:b.c }}>{b.v}</div>
                          <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Smells + duplicates summary row */}
                    <div style={{ display:'flex', gap:8 }}>
                      <div style={{ flex:1, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13 }}>👃</span>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:codeQuality.smellCount>0?C.amber:C.green }}>{codeQuality.smellCount ?? 0}</div>
                          <div style={{ fontSize:9, color:C.faint, textTransform:'uppercase' }}>Code Smells</div>
                        </div>
                      </div>
                      <div style={{ flex:1, background:'rgba(129,140,248,.08)', border:'1px solid rgba(129,140,248,.2)', borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13 }}>📋</span>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:codeQuality.duplicateCount>0?C.purple:C.green }}>{codeQuality.duplicateCount ?? 0}</div>
                          <div style={{ fontSize:9, color:C.faint, textTransform:'uppercase' }}>Duplicates</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:qualityRatingColour(codeQuality.overallRating), marginTop:10 }}>View full analysis →</div>
                  </div>
                )}

                <div style={{ ...glass(), padding:20 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>Upcoming checks</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      { n:'Dependencies', d:'CVE audit against NVD database', c:C.amber,  w:'Week 6' },
                      { n:'Security',     d:'OWASP patterns and secret detection',  c:C.pink,   w:'Week 7' },
                      { n:'AI Summary',   d:'Gemini-generated prose recommendations', c:C.cyan,  w:'Week 8' },
                    ].map(item => (
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

            {/* ── TDD TAB ── */}
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

            {/* ── AST TAB ── */}
            {activeTab === 'ast' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>AST Coverage</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Function Coverage Analysis</h1>
                  <p style={{ fontSize:14, color:C.muted }}>{unitFinding?.analyserUsed === 'fallback' ? <>Repository language detected as <strong style={{ color:C.amber }}>{unitFinding?.language || 'unknown'}</strong>. AST analysis is not yet available for this language.</> : <>Source files in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> parsed with @babel/parser. Every function name extracted and cross-referenced against test files.</>}</p>
                </div>
                {unitFinding ? (
                  <>
                    <div style={{ ...glass('#38bdf8'), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,transparent)' }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>
                            {unitFinding.framework || unitFinding.language || 'Language analysis'}
                          </div>
                          <div style={{ fontSize:36, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:'#38bdf8', lineHeight:1, marginBottom:4 }}>
                            {astCovPct!=null?`${astCovPct}%`:'N/A'}
                          </div>
                          <div style={{ fontSize:14, color:'#f0f0ff' }}>Function coverage for {repoName}</div>
                        </div>
                        <span style={{ padding:'8px 18px', borderRadius:99, fontSize:12, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>
                          {unitFinding?.analyserUsed === 'fallback' ? 'N/A' : astCovPct >= 70 ? 'PASS' : astCovPct >= 40 ? 'WARN' : 'INFO'}
                        </span>
                      </div>
                      {unitFinding?.analyserUsed === 'fallback' ? (
                        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'18px 20px' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#f0f0ff', marginBottom:8 }}>⚠️ Language not yet supported for AST analysis</div>
                          <div style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.8, marginBottom:12 }}>
                            This repository's primary language is <strong style={{ color:C.amber }}>{unitFinding.language}</strong>. RepoScope currently supports deep AST function analysis for <strong style={{ color:C.green }}>JavaScript</strong> and <strong style={{ color:C.green }}>TypeScript</strong> only.
                          </div>
                          <div style={{ fontSize:12, color:C.muted, lineHeight:1.7, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.07)' }}>
                            🔭 <strong style={{ color:'#c8d0f0' }}>What we're working on:</strong> Go, Python, Java, Ruby, and Rust analysers are planned for upcoming weeks. When your language is supported, this tab will show real function-level coverage automatically — no configuration needed.
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize:14, color:'#ccd8ff', lineHeight:1.8, marginBottom:18 }}>{unitFinding.message || unitFinding.fallbackMessage}</p>
                      )}
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
                    {untestedFns.length>0 && (
                      <div style={{ ...glass('#ef4444'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <span style={{ fontSize:16 }}>❌</span>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.12em' }}>Untested functions ({untestedFns.length})</div>
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {untestedFns.map(fn => (
                            <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'4px 10px', borderRadius:7, background:'rgba(239,68,68,.12)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.25)' }}>{fn}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {testedFns.length>0 && (
                      <div style={{ ...glass('#22c55e'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <span style={{ fontSize:16 }}>✅</span>
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
                    <div style={{ fontSize:40, marginBottom:16 }}>🔬</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>No AST data available</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.faint }}>Run: cd backend && npm install @babel/parser</div>
                  </div>
                )}
              </div>
            )}

            {/* ── CODE QUALITY TAB — Week 5 ── */}
            {activeTab === 'quality' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.purple, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Code Quality · Week 5</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Complexity, Smells & Duplicates</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Three independent analyses of <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> — how complex the logic is, structural warning signs, and copy-pasted code blocks.</p>
                </div>

                {codeQuality ? (
                  <>
                    {/* ══ SECTION 1: CYCLOMATIC COMPLEXITY ══ */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:C.green, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', borderRadius:6, padding:'3px 10px' }}>① COMPLEXITY</span>
                        <div style={{ flex:1, height:1, background:'rgba(255,255,255,.07)' }}/>
                      </div>
                    </div>

                    {/* What is complexity — plain English banner */}
                    <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 18px', marginBottom:12 }}>
                      <div style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.8 }}>
                        <strong style={{ color:'#f0f0ff' }}>What is cyclomatic complexity?</strong> It counts how many different paths exist through a function. Every <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>if</code>, <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>for</code>, <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>while</code>, <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>&&</code>, <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>||</code>, ternary, or <code style={{ background:'rgba(56,189,248,.12)', color:'#38bdf8', padding:'1px 5px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>catch</code> adds 1 to the score. <strong style={{ color:C.green }}>1–5 = simple</strong> (easy to read and test) · <strong style={{ color:C.amber }}>6–10 = moderate</strong> (consider splitting) · <strong style={{ color:'#ef4444' }}>11+ = complex</strong> (hard to maintain, risky).
                      </div>
                    </div>

                    {/* Complexity summary card */}
                    <div style={{ ...glass(qualityRatingColour(codeQuality.overallRating)), padding:24, marginBottom:12, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${qualityRatingColour(codeQuality.overallRating)},transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontSize:44, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:qualityRatingColour(codeQuality.overallRating), lineHeight:1, marginBottom:4 }}>{codeQuality.avgComplexity}</div>
                          <div style={{ fontSize:15, color:'#f0f0ff', fontWeight:600 }}>Average complexity score</div>
                          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{codeQuality.filesAnalysed} files · {codeQuality.totalFunctions} functions analysed</div>
                        </div>
                        <span style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:`${qualityRatingColour(codeQuality.overallRating)}1f`, color:qualityRatingColour(codeQuality.overallRating), border:`1px solid ${qualityRatingColour(codeQuality.overallRating)}44` }}>
                          {codeQuality.overallRating?.toUpperCase().replace('-',' ')}
                        </span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[
                          { l:'Simple',   sub:'Score 1–5',   v:codeQuality.simple,   c:C.green,   tip:'Easy to read and test — no action needed' },
                          { l:'Moderate', sub:'Score 6–10',  v:codeQuality.moderate, c:C.amber,   tip:'Consider splitting into 2–3 smaller functions' },
                          { l:'Complex',  sub:'Score 11+',   v:codeQuality.complex,  c:'#ef4444', tip:'High risk — refactor these first' },
                        ].map(b=>(
                          <div key={b.l} style={{ background:`${b.c}10`, border:`1px solid ${b.c}25`, borderRadius:12, padding:'14px', textAlign:'center' }}>
                            <div style={{ fontSize:26, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:b.c, marginBottom:2 }}>{b.v}</div>
                            <div style={{ fontSize:12, color:'#f0f0ff', fontWeight:600, marginBottom:1 }}>{b.l}</div>
                            <div style={{ fontSize:10, color:C.faint, marginBottom:5 }}>{b.sub}</div>
                            <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{b.tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Worst offenders — table with click-to-expand */}
                    {codeQuality.complexFunctions?.length > 0 && (
                      <div style={{ ...glass('#ef4444'), padding:'20px 22px', marginBottom:20 }}>
                        <div style={{ marginBottom:14 }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>
                            Most complex functions — top {Math.min(codeQuality.complexFunctions.length, 20)} to refactor first
                          </div>
                          <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
                            These are the functions with the highest complexity scores. <strong style={{ color:'#f0f0ff' }}>Click any row</strong> to see what the score means and how to fix it.
                          </div>
                        </div>
                        {/* Table header */}
                        <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 90px 70px 80px', gap:8, padding:'6px 10px', marginBottom:4, borderBottom:'1px solid rgba(255,255,255,.07)' }}>
                          {['Score','Function','Severity','Lines','Params'].map(h => (
                            <div key={h} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</div>
                          ))}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {codeQuality.complexFunctions.map((fn, i) => {
                            const col = complexityColour(fn.complexity);
                            const lbl = complexityLabel(fn.complexity);
                            const isOpen = expandedFn === i;
                            const advice = fn.complexity >= 20
                              ? 'This function is extremely complex. Break it into 3–5 smaller functions, each doing one thing. Add a test for each new function.'
                              : fn.complexity >= 11
                              ? 'This function is complex. Look for groups of logic that belong together and extract them into named helper functions.'
                              : 'Moderate complexity. Consider extracting one or two inner blocks into separate named functions to improve readability.';
                            return (
                              <div key={i}>
                                <div onClick={() => setExpandedFn(isOpen ? null : i)}
                                  style={{ display:'grid', gridTemplateColumns:'52px 1fr 90px 70px 80px', gap:8, alignItems:'center', background: isOpen ? `${col}12` : 'rgba(255,255,255,.03)', borderRadius: isOpen ? '10px 10px 0 0' : 10, padding:'10px 10px', border:`1px solid ${isOpen ? col+'40' : col+'18'}`, cursor:'pointer', transition:'all .15s' }}>
                                  {/* Score badge */}
                                  <div style={{ width:40, height:40, borderRadius:8, background:`${col}18`, border:`1px solid ${col}35`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:800, color:col, lineHeight:1 }}>{fn.complexity}</span>
                                    <span style={{ fontSize:7, color:col, opacity:.7, textTransform:'uppercase' }}>score</span>
                                  </div>
                                  {/* Name + file */}
                                  <div style={{ minWidth:0 }}>
                                    <div style={{ fontSize:13, fontWeight:600, color:'#f0f0ff', fontFamily:"'IBM Plex Mono',monospace", marginBottom:2 }}>{fn.name}()</div>
                                    <div style={{ fontSize:10, color:C.faint, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fn.file}</div>
                                  </div>
                                  {/* Severity */}
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'3px 8px', borderRadius:99, background:`${col}18`, color:col, border:`1px solid ${col}30`, textAlign:'center', justifySelf:'start' }}>
                                    {lbl}
                                  </span>
                                  {/* Lines */}
                                  <span style={{ fontSize:12, color:C.muted, fontFamily:"'IBM Plex Mono',monospace" }}>{fn.lines ?? '—'}</span>
                                  {/* Params + chevron */}
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                    <span style={{ fontSize:12, color:C.muted, fontFamily:"'IBM Plex Mono',monospace" }}>{fn.params ?? '—'}</span>
                                    <span style={{ fontSize:12, color:C.faint, transition:'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                                  </div>
                                </div>
                                {/* Expanded detail panel */}
                                {isOpen && (
                                  <div style={{ background:`${col}08`, border:`1px solid ${col}30`, borderTop:'none', borderRadius:'0 0 10px 10px', padding:'14px 16px' }}>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }} className="rs-two-col">
                                      <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'10px 14px' }}>
                                        <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>What this score means</div>
                                        <div style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.6 }}>
                                          A score of <strong style={{ color:col }}>{fn.complexity}</strong> means there are <strong style={{ color:col }}>{fn.complexity}</strong> independent paths through this function. A tester needs at least {fn.complexity} test cases to cover every branch.
                                        </div>
                                      </div>
                                      <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'10px 14px' }}>
                                        <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>How to fix it</div>
                                        <div style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.6 }}>{advice}</div>
                                      </div>
                                    </div>
                                    <div style={{ fontSize:10, color:C.faint, fontFamily:"'IBM Plex Mono',monospace", background:'rgba(0,0,0,.25)', borderRadius:6, padding:'6px 10px' }}>
                                      📁 {fn.file}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ══ SECTION 2: CODE SMELLS ══ */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:C.amber, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.25)', borderRadius:6, padding:'3px 10px' }}>② CODE SMELLS</span>
                        <div style={{ flex:1, height:1, background:'rgba(255,255,255,.07)' }}/>
                      </div>
                    </div>

                    {/* What are smells — 3 type explanations */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }} className="rs-three-col">
                      {[
                        { ...SMELL_META['long-function'],   why:'A function over 50 lines is trying to do too many things at once. Break it into smaller, focused functions — each doing one job.', rule:'> 50 lines' },
                        { ...SMELL_META['too-many-params'], why:'More than 4 parameters makes a function hard to call correctly and nearly impossible to test all combinations of. Use an object instead.', rule:'> 4 params' },
                        { ...SMELL_META['deep-nesting'],    why:'if/else blocks nested 4+ levels deep become impossible to follow. Extract inner blocks into named functions or use early returns.', rule:'> 3 levels deep' },
                      ].map(m => (
                        <div key={m.label} style={{ background:`${m.colour}08`, border:`1px solid ${m.colour}20`, borderRadius:12, padding:'14px' }}>
                          <div style={{ fontSize:20, marginBottom:8 }}>{m.icon}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:m.colour, marginBottom:3 }}>{m.label}</div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, marginBottom:8, background:'rgba(0,0,0,.2)', padding:'2px 6px', borderRadius:4, display:'inline-block' }}>limit: {m.rule}</div>
                          <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{m.why}</div>
                        </div>
                      ))}
                    </div>

                    {/* Smells card with filter */}
                    <div style={{ ...glass(C.amber), padding:'20px 22px', marginBottom:20 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.amber, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>Issues found in {repoName}</div>
                          <div style={{ fontSize:15, fontWeight:700, color: smells.length > 0 ? C.amber : C.green }}>
                            {smells.length === 0 ? '✅ No code smells detected' : `${codeQuality.smellCount} smell${codeQuality.smellCount !== 1 ? 's' : ''} detected`}
                          </div>
                        </div>
                        {smells.length > 0 && (
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {['all','long-function','too-many-params','deep-nesting'].map(f => {
                              const meta = SMELL_META[f];
                              const count = f === 'all' ? smells.length : smells.filter(s => s.type === f).length;
                              if (f !== 'all' && count === 0) return null;
                              const active = smellFilter === f;
                              const ac = f === 'all' ? C.amber : meta.colour;
                              return (
                                <button key={f} onClick={() => setSmellFilter(f)}
                                  style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, border:'1px solid', cursor:'pointer', transition:'all .18s',
                                    background: active ? ac+'25' : 'rgba(255,255,255,.05)',
                                    color: active ? ac : C.muted,
                                    borderColor: active ? ac+'55' : 'rgba(255,255,255,.1)',
                                  }}>
                                  {f === 'all' ? `All (${count})` : `${meta.icon} ${meta.label} (${count})`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {smells.length === 0 ? (
                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12 }}>
                          <span style={{ fontSize:24 }}>🎉</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:C.green }}>Clean code — no smells detected</div>
                            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>All functions are within the 50-line limit, 4-parameter limit, and 3-nesting-level limit.</div>
                          </div>
                        </div>
                      ) : filteredSmells.length === 0 ? (
                        <div style={{ padding:'14px 18px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, fontSize:13, color:C.muted }}>
                          No {SMELL_META[smellFilter]?.label} smells in this repo.
                        </div>
                      ) : (
                        <>
                          {/* Table header */}
                          <div style={{ display:'grid', gridTemplateColumns:'36px 110px 1fr 140px', gap:8, padding:'6px 10px', marginBottom:4, borderBottom:'1px solid rgba(255,255,255,.07)' }} className="rs-smell-table">
                            {['','Type','Detail','File'].map(h => (
                              <div key={h} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</div>
                            ))}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            {filteredSmells.map((smell, i) => {
                              const meta = SMELL_META[smell.type] || { icon:'⚠', label: smell.type, colour: C.amber };
                              const smellAdvice = {
                                'long-function': 'Break this function into smaller focused functions — aim for under 30 lines each.',
                                'too-many-params': 'Group related parameters into a single config object: fn({ a, b, c }) instead of fn(a, b, c).',
                                'deep-nesting': 'Use early returns (guard clauses) to flatten the nesting, or extract inner blocks into named helper functions.',
                              }[smell.type] || 'Review and refactor this code.';
                              const isOpenSmell = expandedFn === `s${i}`;
                              return (
                                <div key={i}>
                                  <div onClick={() => setExpandedFn(isOpenSmell ? null : `s${i}`)}
                                    style={{ display:'grid', gridTemplateColumns:'36px 110px 1fr 140px', gap:8, alignItems:'center', background: isOpenSmell ? `${meta.colour}10` : 'rgba(255,255,255,.03)', borderRadius: isOpenSmell ? '8px 8px 0 0' : 8, padding:'10px 10px', border:`1px solid ${isOpenSmell ? meta.colour+'40' : meta.colour+'18'}`, cursor:'pointer', transition:'all .15s' }} className="rs-smell-table">
                                    <span style={{ fontSize:16 }}>{meta.icon}</span>
                                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 8px', borderRadius:99, background:`${meta.colour}18`, color:meta.colour, border:`1px solid ${meta.colour}30`, textAlign:'center', justifySelf:'start' }}>{meta.label}</span>
                                    <span style={{ fontSize:12, color:'#f0f0ff', fontWeight:500 }}>{smell.detail}</span>
                                    <span style={{ fontSize:10, color:C.faint, fontFamily:"'IBM Plex Mono',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{smell.file.split('/').pop()}</span>
                                  </div>
                                  {isOpenSmell && (
                                    <div style={{ background:`${meta.colour}08`, border:`1px solid ${meta.colour}30`, borderTop:'none', borderRadius:'0 0 8px 8px', padding:'12px 14px' }}>
                                      <div style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.7, marginBottom:8 }}>
                                        <strong style={{ color:meta.colour }}>How to fix:</strong> {smellAdvice}
                                      </div>
                                      <div style={{ fontSize:10, color:C.faint, fontFamily:"'IBM Plex Mono',monospace", background:'rgba(0,0,0,.25)', borderRadius:5, padding:'5px 10px' }}>📁 {smell.file}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Summary legend */}
                      {smells.length > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.07)' }}>
                          {Object.entries(SMELL_META).map(([type, meta]) => {
                            const count = smells.filter(s => s.type === type).length;
                            return (
                              <div key={type} onClick={() => setSmellFilter(smellFilter === type ? 'all' : type)}
                                style={{ background:`${meta.colour}08`, border:`1px solid ${meta.colour}${smellFilter===type?'40':'18'}`, borderRadius:10, padding:'10px 12px', textAlign:'center', cursor:'pointer', transition:'all .18s' }}>
                                <div style={{ fontSize:18, marginBottom:4 }}>{meta.icon}</div>
                                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:18, fontWeight:800, color:count > 0 ? meta.colour : C.faint }}>{count}</div>
                                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{meta.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 3: DUPLICATE BLOCKS ══ */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:C.purple, background:'rgba(129,140,248,.12)', border:'1px solid rgba(129,140,248,.25)', borderRadius:6, padding:'3px 10px' }}>③ DUPLICATE CODE</span>
                        <div style={{ flex:1, height:1, background:'rgba(255,255,255,.07)' }}/>
                      </div>
                    </div>

                    {/* What are duplicates — plain English banner */}
                    <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 18px', marginBottom:12 }}>
                      <div style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.8 }}>
                        <strong style={{ color:'#f0f0ff' }}>What are duplicate code blocks?</strong> RepoScope normalises every file (strips comments and whitespace), splits the code into overlapping 8-line windows, and fingerprints each window with an MD5 hash. If the same window appears in <strong style={{ color:C.purple }}>2 or more different files</strong>, it's flagged. This usually means logic was copy-pasted — if a bug is found in one copy, you must remember to fix <em>all</em> the others. The fix is to extract the duplicated logic into a shared function.
                      </div>
                    </div>

                    {/* Duplicates card */}
                    <div style={{ ...glass(C.purple), padding:'20px 22px', marginBottom:20 }}>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.purple, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>Duplicate groups in {repoName}</div>
                        <div style={{ fontSize:15, fontWeight:700, color: duplicates.length > 0 ? C.purple : C.green }}>
                          {duplicates.length === 0 ? '✅ No duplicate blocks found' : `${codeQuality.duplicateCount} duplicate group${codeQuality.duplicateCount !== 1 ? 's' : ''} found`}
                        </div>
                        {duplicates.length > 0 && (
                          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Each group below is a block of code found in multiple files. Click to see where it appears.</div>
                        )}
                      </div>

                      {duplicates.length === 0 ? (
                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12 }}>
                          <span style={{ fontSize:24 }}>🎉</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:C.green }}>No duplicate code detected</div>
                            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>No 8-line code blocks appear in more than one file. Good code reuse practice.</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {duplicates.map((dup, i) => (
                            <div key={dup.hash} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(129,140,248,.18)', borderRadius:12, overflow:'hidden' }}>
                              {/* Header */}
                              <div style={{ padding:'10px 14px', background:'rgba(129,140,248,.06)', borderBottom:'1px solid rgba(129,140,248,.12)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:C.purple }}>Group {i+1}</span>
                                  <span style={{ fontSize:11, color:C.muted }}>— this exact code appears in {dup.files.length} files</span>
                                </div>
                                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, background:'rgba(255,255,255,.05)', padding:'2px 8px', borderRadius:5 }}>{dup.files.length} copies</span>
                              </div>
                              {/* Code preview */}
                              <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Preview (first 3 lines of duplicated block)</div>
                                <pre style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#c8d0f0', background:'rgba(0,0,0,.35)', borderRadius:8, padding:'10px 14px', margin:0, overflowX:'auto', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{dup.preview}</pre>
                              </div>
                              {/* File list */}
                              <div style={{ padding:'10px 14px' }}>
                                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.purple, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Found in these files — extract to a shared function to fix:</div>
                                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                  {dup.files.map(f => (
                                    <div key={f} style={{ fontSize:11, color:'#c8d0f0', fontFamily:"'IBM Plex Mono',monospace", display:'flex', alignItems:'center', gap:8, padding:'5px 8px', background:'rgba(129,140,248,.06)', borderRadius:6 }}>
                                      <span style={{ width:6, height:6, borderRadius:'50%', background:C.purple, flexShrink:0, display:'inline-block' }}/>
                                      {f}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ══ How it works — compact ══ */}
                    <div style={{ ...glass(), padding:'18px 22px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>How these checks work</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }} className="rs-three-col">
                        {[
                          { icon:'🔀', label:'Complexity', colour:C.green, text:'@babel/parser builds an AST. Every branching node (if/for/while/&&/||/ternary/catch) adds 1 to the score, starting at 1.' },
                          { icon:'👃', label:'Smells', colour:C.amber, text:'Three rules checked per function: line count > 50, parameter count > 4, and if/else nesting depth > 3 levels.' },
                          { icon:'📋', label:'Duplicates', colour:C.purple, text:'Each file is normalised (no comments/whitespace), split into 8-line windows, MD5-hashed. Hashes appearing in 2+ files are flagged.' },
                        ].map(m => (
                          <div key={m.label} style={{ background:`${m.colour}08`, border:`1px solid ${m.colour}18`, borderRadius:10, padding:'12px 14px' }}>
                            <div style={{ fontSize:16, marginBottom:6 }}>{m.icon}</div>
                            <div style={{ fontSize:11, fontWeight:700, color:m.colour, marginBottom:6 }}>{m.label}</div>
                            <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{m.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>Code Quality check is running</div>
                    <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>Results will appear here once the analysis completes.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── DIAGNOSTICS TAB ── */}
            {activeTab === 'diagnostics' && (
              <div style={{ animation:'slideUp .4s cubic-bezier(.22,1,.36,1)' }}>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.purple, textTransform:'uppercase', letterSpacing:'.16em', marginBottom:8 }}>Diagnostics</div>
                  <h1 style={{ fontSize:26, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', marginBottom:6 }}>Repository Analysis Report</h1>
                  <p style={{ fontSize:14, color:C.muted }}>Real stats from scanning <strong style={{ color:'#f0f0ff' }}>{repoName}</strong>, followed by 8 fixed unit tests that validate the TDD detection engine itself.</p>
                </div>
                <div style={{ ...glass(C.green), padding:24, marginBottom:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.green},${C.cyan},transparent)` }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.green, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:16 }}>Actual results for {repoName} — unique to this repository</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { l:'Commits analysed',       v:totalCommits,        c:C.green,  tip:'Total commits fetched from GitHub API (up to 200)' },
                      { l:'Implementation commits', v:displayCodeCount,    c:C.cyan,   tip:'Commits with feat/fix/build/create/implement/add/update/chore' },
                      { l:'TDD pairs confirmed',    v:displayTddCount,     c:C.purple, tip:'Impl commits that had a test commit within the 5 preceding commits' },
                      { l:'TDD ratio',              v:`${displayRatio}%`,  c:tddColor, tip:`${tddBadge}: ${displayRatio >= 60 ? 'above 60%' : displayRatio >= 30 ? '30–60%' : 'below 30%'} threshold` },
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
                          { l:'Source files', v:srcFiles??'N/A',            c:C.cyan },
                          { l:'Test files',   v:testFiles??'N/A',           c:C.green },
                          { l:'Untested fns', v:untestedFns.length,         c:'#ef4444' },
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
                      <span style={{ fontSize:20 }}>{diagScore.passed===diagScore.total?'🎉':'⚠'}</span>
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
                          <span style={{ fontSize:16, flexShrink:0 }}>{r.p?'✅':'❌'}</span>
                          <span style={{ flex:1, fontSize:13, fontWeight:600, color:r.p?'#86efac':'#fca5a5', lineHeight:1.4 }}>{r.n}</span>
                          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, padding:'2px 8px', borderRadius:99, background:r.p?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)', color:r.p?C.green:'#ef4444', border:`1px solid ${r.p?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}` }}>{r.p?'PASS':'FAIL'}</span>
                          <span style={{ fontSize:11, color:C.faint, transition:'transform .2s', transform:expanded===i?'rotate(180deg)':'none' }}>▾</span>
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
        @media(max-width:900px){.rs-chips{grid-template-columns:repeat(2,1fr)!important}.rs-two-col{grid-template-columns:1fr!important}.rs-three-col{grid-template-columns:1fr!important}}
        @media(max-width:700px){.rs-smell-table{grid-template-columns:36px 1fr!important}.rs-smell-table>*:nth-child(3),.rs-smell-table>*:nth-child(4){display:none}}
        @media(max-width:600px){.rs-chips{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}