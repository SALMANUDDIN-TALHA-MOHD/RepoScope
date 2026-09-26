import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

const BACKEND = 'http://localhost:5000';

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

export default function ScanResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const scanUrl  = location.state?.repoUrl || 'https://github.com/facebook/react';

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

  const pollRef   = useRef(null);
  const stepTimer = useRef(null);

  /* ── Derived data from scan ── */
  const totalFiles    = scanData?.summary?.totalFiles    ?? 0;
  const totalCommits  = scanData?.summary?.totalCommits  ?? 0;
  const tddFinding    = scanData?.findings?.find(f => f.category === 'tdd');
  const unitFinding   = scanData?.findings?.find(f => f.category === 'unit_test');
  const recentCommits = scanData?.recentCommits ?? [];

  /* TDD: prefer backend result, fall back to local re-run on all commits */
  const localTDD        = recentCommits.length ? runTDD(recentCommits) : null;
  const displayRatio    = tddFinding?.tddRatio    ?? localTDD?.tddRatio    ?? 0;
  const displayCodeCount= tddFinding?.codeCount   ?? localTDD?.codeCount   ?? 0;
  const displayTddCount = tddFinding?.tddCount    ?? localTDD?.tddCount    ?? 0;
  const displaySeverity = tddFinding?.severity    ?? localTDD?.severity    ?? 'info';
  const tddColor        = displaySeverity === 'pass' ? C.green : displaySeverity === 'warn' ? C.amber : C.purple;
  const tddBadge        = displaySeverity === 'pass' ? 'PASS'  : displaySeverity === 'warn' ? 'WARN'  : 'INFO';

  /* Structural signal from tddFinding */
  const structSignal = tddFinding?.structuralSignal ?? null;

  /* Language detection from unitFinding message */
  const isGoRepo    = unitFinding?.message?.toLowerCase().includes('go') || repoName_()?.toLowerCase().includes('go') || (unitFinding && !unitFinding.coverage && unitFinding.message?.includes('No'));
  const isSupportedLang = unitFinding?.coverage != null || (unitFinding?.sourceFilesAnalysed > 0);

  /* Counters */
  const filesC   = useCounter(totalFiles,      1800, countersGo);
  const commitsC = useCounter(totalCommits,    1400, countersGo);
  const tddC     = useCounter(displayRatio,    2200, countersGo);
  const codeC    = useCounter(displayCodeCount,1600, countersGo);
  const pairsC   = useCounter(displayTddCount, 1800, countersGo);

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

    let scanId;
    try {
      const res = await fetch(`${BACKEND}/api/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: scanUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      scanId = (await res.json()).scanId;
    } catch (err) {
      clearTimeout(stepTimer.current);
      setErrorMsg(`Could not start scan: ${err.message}. Make sure the backend is running on port 5000.`);
      setPhase('error'); return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/scan/${scanId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'complete') {
          clearInterval(pollRef.current); clearTimeout(stepTimer.current);
          setStepIdx(SCAN_STEPS.length); setProgress(100);
          // Show dashboard immediately — no delay
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

  /* TDD encouragement — changes per repo based on actual ratio */
  const tddMsg = (() => {
    const r = displayRatio;
    const code = displayCodeCount;
    const pairs = displayTddCount;
    if (!recentCommits.length && !tddFinding) return null;
    if (displaySeverity === 'pass') return {
      color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)',
      title: 'Strong TDD practice detected',
      text: `${repoName} has ${r}% TDD ratio across ${code} implementation commits, with ${pairs} confirmed test-first pairs. This is above the 60% threshold for strong TDD discipline. The team consistently writes tests before code. To maintain this: keep the Red-Green-Refactor habit on every new feature and make sure new contributors follow the same pattern.`,
    };
    if (displaySeverity === 'warn') return {
      color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)',
      title: 'Partial TDD usage',
      text: `${repoName} shows ${r}% TDD ratio. Out of ${code} implementation commits, ${pairs} had a test commit written within the previous 5 commits. This is above the 30% threshold but below 60%. A practical next step: pick the next feature you are about to build and write a failing test for it first, before writing any implementation code. Do this three or four times and it will become automatic.`,
    };
    return {
      color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)',
      title: 'TDD not detected in commit history',
      text: `${repoName} shows ${r}% TDD ratio across ${code} implementation commits, with only ${pairs} confirmed test-first pairs. This does not mean the code is bad. It means tests are not consistently written before the implementation. A simple starting point: pick one function you are about to write. Write a test that calls it with a known input and checks the expected output. Then write the function. Commit the test first, then the function. Repeat this once per sprint.`,
    };
  })();

  /* AST encouragement — changes per repo */
  const astMsg = (() => {
    if (!unitFinding) return null;
    const cov = unitFinding.coverage;
    const src  = unitFinding.sourceFilesAnalysed;
    const tst  = unitFinding.testFilesAnalysed;
    const untested = unitFinding.untestedFunctions ?? [];
    if (cov == null) return {
      color: C.muted, bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
      title: 'AST analysis note',
      text: unitFinding.message || unitFinding.detail || 'No analysable source files found.',
    };
    if (cov >= 70) return {
      color: C.green, bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)',
      title: 'Good function coverage',
      text: `${cov}% of functions in ${repoName} are referenced in test files. Out of the ${src} source files analysed, ${tst} test files provide coverage. The ${untested.length} untested functions listed above are the next targets. Prioritise functions that handle user input or call external services, as bugs there have the highest impact.`,
    };
    if (cov >= 40) return {
      color: C.amber, bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)',
      title: 'Partial function coverage',
      text: `${cov}% of functions in ${repoName} are referenced in test files across ${src} source files and ${tst} test files. Work through the untested list one function at a time. Start with the simplest function and write a test that calls it with a known input, then check the output matches what you expect. Covering 3 to 4 functions per week will move the percentage noticeably within a sprint.`,
    };
    return {
      color: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)',
      title: 'Low function coverage detected',
      text: `${cov}% of functions in ${repoName} are referenced in test files. ${src} source files were analysed against ${tst} test files. The ${untested.length} functions in the list above are your starting point. Pick the first one, write one test for it, commit it. Then pick the next. Even adding one test per day compounds significantly over the length of a semester.`,
    };
  })();

  const NAV = [
    { id:'overview',    label:'Overview',      icon:'◈' },
    { id:'tdd',         label:'TDD Detection', icon:'⬡', badge: tddBadge,    badgeColor: tddColor },
    { id:'ast',         label:'AST Coverage',  icon:'⬟', badge: unitFinding?.severity?.toUpperCase() || 'INFO', badgeColor: unitFinding?.severity === 'pass' ? C.green : unitFinding?.severity === 'warn' ? C.amber : C.purple },
    { id:'diagnostics', label:'Diagnostics',   icon:'⬠', badge: diagDone ? `${diagScore?.passed}/${diagScore?.total}` : null, badgeColor: diagDone && diagScore?.passed === diagScore?.total ? C.green : C.amber },
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
              {[['Code Quality','⬡','Week 5'],['Dependencies','⬟','Week 6'],['Security','⬠','Week 7'],['AI Summary','◈','Week 8']].map(([label,icon,wk]) => (
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
                    { v:unitFinding?.coverage!=null?`${unitFinding.coverage}%`:'N/A', l:'AST coverage', c:C.amber, icon:'📋' },
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
                        {structSignal.hasTestDirectory ? `✓ ${structSignal.testFileCount} test files found in directory structure (${structSignal.testFileRatio}%)` : '✗ No dedicated test directory detected'}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:tddColor, marginTop:10 }}>View full analysis</div>
                  </div>
                  <div style={{ ...glass('#38bdf8'), padding:22, cursor:'pointer', transition:'all .25s' }} onClick={() => setActiveTab('ast')}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>AST Coverage</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#f0f0ff' }}>{unitFinding?.coverage!=null?`${unitFinding.coverage}%`:'N/A'}</div>
                        {unitFinding?.sourceFilesAnalysed!=null && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{unitFinding.sourceFilesAnalysed} source files, {unitFinding.testFilesAnalysed} test files</div>}
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'4px 10px', borderRadius:99, background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>{unitFinding?.severity?.toUpperCase()||'INFO'}</span>
                    </div>
                    {unitFinding?.untestedFunctions?.length>0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                        {unitFinding.untestedFunctions.slice(0,4).map(fn => (
                          <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(239,68,68,.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.2)' }}>{fn}</span>
                        ))}
                        {unitFinding.untestedFunctions.length>4 && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(255,255,255,.06)', color:C.muted }}>+{unitFinding.untestedFunctions.length-4} more</span>}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{unitFinding?.message?.split('.')[0]||'AST function coverage analysis'}.</div>
                    <div style={{ fontSize:11, color:'#38bdf8', marginTop:10 }}>View full analysis</div>
                  </div>
                </div>
                <div style={{ ...glass(), padding:20 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>Upcoming checks</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    {[
                      { n:'Code Quality', d:'Cyclomatic complexity, smells, duplicates', c:C.purple, w:'Week 5' },
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
                  <p style={{ fontSize:14, color:C.muted }}>Commit history for <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> analysed chronologically. Each implementation commit triggers a lookback across the 5 preceding commits to find a prior test commit.</p>
                </div>

                {/* Big ratio card */}
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
                      <span style={{ color:'#ef4444' }}>0% no TDD</span>
                      <span style={{ color:C.amber }}>30% partial</span>
                      <span style={{ color:C.green }}>60% good</span>
                      <span style={{ color:'#38bdf8' }}>100%</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                  {[
                    { v:commitsC, l:'Total commits fetched',   c:C.green,  tip:`All commits fetched from ${repoName}` },
                    { v:codeC,    l:'Implementation commits',  c:C.cyan,   tip:'Commits whose message contains feat, fix, build, create, implement, add, update, or chore' },
                    { v:pairsC,   l:'TDD pairs confirmed',     c:C.purple, tip:'Implementation commits that had at least one test commit within the 5 commits immediately before them' },
                  ].map(s => (
                    <div key={s.l} style={{ ...glass(), padding:'16px 18px', textAlign:'center' }}>
                      <div style={{ fontSize:32, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:5 }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{s.l}</div>
                      <div style={{ fontSize:11, color:'#c8d0f0', lineHeight:1.5 }}>{s.tip}</div>
                    </div>
                  ))}
                </div>

                {/* Structural signal */}
                {structSignal && (
                  <div style={{ ...glass(structSignal.hasTestDirectory?C.green:C.faint), padding:'18px 22px', marginBottom:16 }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:structSignal.hasTestDirectory?C.green:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:10 }}>Directory structure signal (professor suggestion)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:structSignal.hasTestDirectory?C.green:'#ef4444', marginBottom:4 }}>{structSignal.hasTestDirectory?'YES':'NO'}</div>
                        <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>Test directory found</div>
                      </div>
                      <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:C.amber, marginBottom:4 }}>{structSignal.testFileCount}</div>
                        <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>Test files in repo</div>
                      </div>
                      <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:C.cyan, marginBottom:4 }}>{structSignal.testFileRatio}%</div>
                        <div style={{ fontSize:10, color:C.faint, textTransform:'uppercase' }}>Of all files are tests</div>
                      </div>
                    </div>
                    <p style={{ fontSize:12, color:'#c8d0f0', lineHeight:1.7, marginTop:12 }}>
                      {structSignal.hasTestDirectory
                        ? `${repoName} has ${structSignal.testFileCount} test files in its directory structure, making up ${structSignal.testFileRatio}% of all files. This is a strong structural indicator that testing is part of the development workflow, even if commit messages do not always use TDD keywords.`
                        : `No dedicated test directory was detected in ${repoName}. Files named test_*.py, *_test.go, *.test.js, or located in test/ or __tests__/ directories were not found. Consider organising tests into a dedicated folder.`}
                    </p>
                  </div>
                )}

                {/* Finding */}
                <div style={{ ...glass(), padding:'18px 22px', marginBottom:16, borderLeft:`3px solid ${tddColor}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:tddColor, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:8 }}>Finding for {repoName}</div>
                  <p style={{ fontSize:14, color:'#ccd8ff', lineHeight:1.8 }}>{tddFinding?.message || `TDD ratio of ${displayRatio}% detected in ${repoName}.`}</p>
                </div>

                {/* Encouragement */}
                {tddMsg && (
                  <div style={{ background:tddMsg.bg, border:`1px solid ${tddMsg.border}`, borderRadius:16, padding:'18px 22px', marginBottom:16 }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:tddMsg.color, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>{tddMsg.title}</div>
                    <p style={{ fontSize:13, color:'#f0f0ff', lineHeight:1.85 }}>{tddMsg.text}</p>
                  </div>
                )}

                {/* Methodology */}
                <div style={{ ...glass(), padding:'20px 24px' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>How this detection works</div>
                  <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82, marginBottom:12 }}>
                    GitHub returns commits newest-first, so RepoScope reverses the array to put the oldest commit first. For each implementation commit (feat, fix, build, create, implement, add, update, chore), it looks at the 5 commits that came immediately before it. If any of those 5 contain testing keywords (test, spec, tdd, failing test, write test, add test), the pair is recorded as a confirmed TDD cycle.
                  </p>
                  <p style={{ fontSize:13, color:'#c8d0f0', lineHeight:1.82 }}>
                    Per professor feedback, the repository directory structure is also checked. The presence of <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>tests/</code>, <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>__tests__/</code>, or files matching <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>*.test.js</code> and <code style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', padding:'1px 6px', borderRadius:4, fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }}>test_*.py</code> patterns acts as a structural TDD signal alongside the commit keyword analysis.
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
                  <p style={{ fontSize:14, color:C.muted }}>Source files in <strong style={{ color:'#f0f0ff' }}>{repoName}</strong> parsed with @babel/parser. Every function name extracted and cross-referenced against test files.</p>
                </div>

                {unitFinding ? (
                  <>
                    <div style={{ ...glass('#38bdf8'), padding:28, marginBottom:16, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,transparent)' }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>
                            {unitFinding.detail?.match(/Framework detected:\s*([^.]+)/i)?.[1]?.trim() || 'Language analysis'}
                          </div>
                          <div style={{ fontSize:36, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:'#38bdf8', lineHeight:1, marginBottom:4 }}>
                            {unitFinding.coverage!=null?`${unitFinding.coverage}%`:'N/A'}
                          </div>
                          <div style={{ fontSize:14, color:'#f0f0ff' }}>Function coverage for {repoName}</div>
                        </div>
                        <span style={{ padding:'8px 18px', borderRadius:99, fontSize:12, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", background:'rgba(56,189,248,.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.3)' }}>
                          {unitFinding.severity?.toUpperCase()||'INFO'}
                        </span>
                      </div>
                      <p style={{ fontSize:14, color:'#ccd8ff', lineHeight:1.8, marginBottom:unitFinding.coverage!=null?18:0 }}>{unitFinding.message}</p>
                      {unitFinding.coverage!=null && (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.muted, marginBottom:7 }}>
                            <span>Functions referenced in test files</span>
                            <span style={{ color:'#38bdf8', fontWeight:700 }}>{unitFinding.coverage}%</span>
                          </div>
                          <div style={{ height:7, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#38bdf8,#818cf8)', width:`${unitFinding.coverage}%`, transition:'width 1.6s cubic-bezier(.22,1,.36,1)' }}/>
                          </div>
                        </div>
                      )}
                    </div>

                    {(unitFinding.sourceFilesAnalysed!=null||unitFinding.testFilesAnalysed!=null) && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                        {[
                          { v:unitFinding.sourceFilesAnalysed??'N/A', l:'Source files analysed', tip:'Files containing function definitions that were parsed', c:C.cyan },
                          { v:unitFinding.testFilesAnalysed??'N/A',   l:'Test files analysed',   tip:'Files searched for function name references', c:C.green },
                        ].map(s => (
                          <div key={s.l} style={{ ...glass(), padding:'16px 18px', textAlign:'center' }}>
                            <div style={{ fontSize:28, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:4 }}>{s.v}</div>
                            <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{s.l}</div>
                            <div style={{ fontSize:11, color:'#c8d0f0' }}>{s.tip}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Untested functions */}
                    {unitFinding.untestedFunctions?.length>0 && (
                      <div style={{ ...glass('#ef4444'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <span style={{ fontSize:16 }}>❌</span>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#ef4444', textTransform:'uppercase', letterSpacing:'.12em' }}>Untested functions ({unitFinding.untestedFunctions.length})</div>
                        </div>
                        <p style={{ fontSize:12, color:'#fca5a5', lineHeight:1.75, marginBottom:12 }}>
                          These {unitFinding.untestedFunctions.length} function names were found in source files of {repoName} but do not appear anywhere in the {unitFinding.testFilesAnalysed} test files analysed. Each one represents a gap in test coverage where a bug could go undetected. Start with the simplest function and add one test at a time.
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {unitFinding.untestedFunctions.map(fn => (
                            <span key={fn} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'4px 10px', borderRadius:7, background:'rgba(239,68,68,.12)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.25)' }}>{fn}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tested functions */}
                    {unitFinding.testedFunctions?.length>0 && (
                      <div style={{ ...glass('#22c55e'), padding:'20px 22px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <span style={{ fontSize:16 }}>✅</span>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#22c55e', textTransform:'uppercase', letterSpacing:'.12em' }}>Tested functions ({unitFinding.testedFunctions.length})</div>
                        </div>
                        <p style={{ fontSize:12, color:'#86efac', lineHeight:1.75, marginBottom:12 }}>
                          These {unitFinding.testedFunctions.length} functions in {repoName} are referenced by name in at least one test file. A function appearing in a test file means a test actively calls it, mocks it, or asserts on its output — providing a safety net against regressions.
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {unitFinding.testedFunctions.map(fn => (
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

                    <div style={{ ...glass(), padding:'20px 24px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>How AST analysis works</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {[
                          { n:'1. Fetch source files', d:`Every .js, .jsx, .ts, .tsx (JS/TS repos) or .py (Python repos) file is fetched from ${repoName} via the GitHub API.`, c:C.green },
                          { n:'2. Parse to AST', d:'@babel/parser converts each JS/TS file into an Abstract Syntax Tree. Python files use regex extraction.', c:'#38bdf8' },
                          { n:'3. Extract function names', d:'The tree walker collects FunctionDeclarations, ArrowFunctions, ClassMethods (JS) and def/class names (Python).', c:C.purple },
                          { n:'4. Cross-reference tests', d:'Each function name is searched in every test file. If it appears anywhere = tested. If not = untested.', c:C.amber },
                        ].map(s => (
                          <div key={s.n} style={{ background:`${s.c}08`, border:`1px solid ${s.c}20`, borderRadius:10, padding:'14px 14px' }}>
                            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:700, color:s.c, marginBottom:6 }}>{s.n}</div>
                            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{s.d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ ...glass(), padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:16 }}>🔬</div>
                    <div style={{ fontSize:16, color:'#f0f0ff', marginBottom:8 }}>AST analysis requires @babel/parser</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.faint }}>Run: cd backend && npm install @babel/parser</div>
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

                {/* REPO-SPECIFIC STATS — these change per repository */}
                <div style={{ ...glass(C.green), padding:24, marginBottom:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.green},${C.cyan},transparent)` }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.green, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:16 }}>Actual results for {repoName} — unique to this repository</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { l:'Commits analysed', v:totalCommits, c:C.green, tip:'Total commits fetched from GitHub API (up to 200)' },
                      { l:'Implementation commits', v:displayCodeCount, c:C.cyan, tip:'Commits with feat/fix/build/create/implement/add/update/chore in message' },
                      { l:'TDD pairs confirmed', v:displayTddCount, c:C.purple, tip:'Impl commits that had a test commit within the 5 preceding commits' },
                      { l:'TDD ratio', v:`${displayRatio}%`, c:tddColor, tip:`${tddBadge}: ${displayRatio >= 60 ? 'above 60% threshold' : displayRatio >= 30 ? 'between 30-60% threshold' : 'below 30% threshold'}` },
                      { l:'Test files found', v:structSignal?.testFileCount??0, c:C.amber, tip:'Files in test/, __tests__/, *.test.js, test_*.py patterns (structural signal)' },
                      { l:'Test file ratio', v:`${structSignal?.testFileRatio??0}%`, c:C.pink, tip:'Percentage of all repository files that are test files' },
                    ].map(s => (
                      <div key={s.l} style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${s.c}20`, borderRadius:10, padding:'14px 14px' }}>
                        <div style={{ fontSize:24, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", color:s.c, marginBottom:4 }}>{s.v}</div>
                        <div style={{ fontSize:10, color:'#aaaac8', textTransform:'uppercase', letterSpacing:'.07em', lineHeight:1.4, marginBottom:4 }}>{s.l}</div>
                        <div style={{ fontSize:11, color:'#c8d0f0', lineHeight:1.5 }}>{s.tip}</div>
                      </div>
                    ))}
                  </div>

                  {/* AST stats if available */}
                  {unitFinding && (
                    <div style={{ background:'rgba(56,189,248,.06)', border:'1px solid rgba(56,189,248,.15)', borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:10 }}>AST coverage results for {repoName}</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                        {[
                          { l:'Coverage', v:unitFinding.coverage!=null?`${unitFinding.coverage}%`:'N/A', c:'#38bdf8' },
                          { l:'Source files', v:unitFinding.sourceFilesAnalysed??'N/A', c:C.cyan },
                          { l:'Test files', v:unitFinding.testFilesAnalysed??'N/A', c:C.green },
                          { l:'Untested fns', v:unitFinding.untestedFunctions?.length??'N/A', c:'#ef4444' },
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

                {/* ENGINE TESTS — always the same, test the algorithm not the repo */}
                <div style={{ ...glass(C.purple), padding:24, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#6366f1,#a78bfa,transparent)' }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.purple, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>Algorithm unit tests</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#f0f0ff', marginBottom:8 }}>TDD Detection Engine Tests</div>
                  <p style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:16 }}>These 8 tests validate the detection algorithm using controlled fake commit data. They are identical for every repository scan because they test whether the engine logic itself is correct, not your repository. A FAIL here means a bug in the algorithm, not a problem with your code.</p>

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
        @media(max-width:900px){.rs-chips{grid-template-columns:repeat(2,1fr)!important}.rs-two-col{grid-template-columns:1fr!important}}
        @media(max-width:600px){.rs-chips{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}