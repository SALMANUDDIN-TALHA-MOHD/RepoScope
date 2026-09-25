import { useState, useEffect, useRef } from 'react';

const stats = [
  { target:5,   display:'5',    label:'checks run',    dur:2200 },
  { target:60,  display:'<60s', label:'scan time',     dur:2800, isTime:true },
  { target:100, display:'100%', label:'plain English', dur:3400, isPct:true },
];

const reportRows = [
  { type:'title' },
  { type:'ai' },
  { type:'divider', label:'Findings' },
  { type:'find', icon:'🧪', label:'Test coverage',           value:'47 / 50 passing',        s:'warn' },
  { type:'find', icon:'📦', label:'Vulnerable dependencies',  value:'1 CVE — lodash moderate', s:'warn' },
  { type:'find', icon:'🔒', label:'Exposed secrets',          value:'None found in history',   s:'pass' },
  { type:'find', icon:'⚙️', label:'Endpoint safety',         value:'2 endpoints flagged',     s:'warn' },
  { type:'find', icon:'📊', label:'TDD detection',            value:'68% ratio confirmed ★',  s:'pass' },
  { type:'divider', label:'Scores' },
  { type:'bar', label:'TDD Ratio',      pct:68, c:'#22c55e' },
  { type:'bar', label:'Tests Passing',  pct:94, c:'#38bdf8' },
  { type:'bar', label:'Security Score', pct:88, c:'#818cf8' },
  { type:'bar', label:'Code Quality',   pct:75, c:'#f59e0b' },
  { type:'divider', label:'Commit Analysis' },
  { type:'commit', hash:'a3f7c2d', msg:'feat: add checkout flow tests', tdd:true },
  { type:'commit', hash:'b8e1f4a', msg:'fix: resolve payment edge case', tdd:false },
  { type:'commit', hash:'c2d9e6b', msg:'test: coverage for user auth', tdd:true },
  { type:'commit', hash:'d4f1a8c', msg:'refactor: simplify order model', tdd:false },
  { type:'commit', hash:'e9c3b1f', msg:'test: add order validation tests', tdd:true },
  { type:'commit', hash:'f1a2d8e', msg:'implement payment gateway', tdd:false },
  { type:'footer' },
];

function Counter({ stat, go, cycle }) {
  const [val, setVal]   = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!go) return;
    setVal(0); setDone(false);
    const start = performance.now();
    const raf = { id: null };
    const tick = now => {
      const p = Math.min((now - start) / stat.dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * stat.target));
      if (p < 1) { raf.id = requestAnimationFrame(tick); } else setDone(true);
    };
    raf.id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.id);
  }, [go, cycle, stat.dur, stat.target]);

  const display = done ? stat.display
    : stat.isTime ? `<${val}s` : stat.isPct ? `${val}%` : String(val);

  return (
    <div style={{ opacity:go?1:0, transform:go?'none':'translateY(12px)', transition:'all .6s cubic-bezier(.22,1,.36,1)' }}>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:28, fontWeight:800, color:'#22c55e', marginBottom:4, letterSpacing:'-.04em' }}>{display}</div>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#44445a', textTransform:'uppercase', letterSpacing:'.08em' }}>{stat.label}</div>
    </div>
  );
}

function ScrollingReport({ go }) {
  const scrollRef = useRef(null);
  const rafRef    = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !go) return;
    el.scrollTop = 0;
    let pos = 0;
    const tick = () => {
      pos += 0.45;
      if (pos >= el.scrollHeight - el.clientHeight) pos = 0;
      el.scrollTop = pos;
      rafRef.current = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 900);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, [go]);

  const renderRow = (item, i) => {
    if (item.type === 'title') return (
      <div key={i} style={{ background:'linear-gradient(135deg,rgba(255,255,255,.08),rgba(56,189,248,.06))', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'14px 16px', marginBottom:10, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#ef4444,#38bdf8,#22c55e)' }}/>
        <div style={{ fontSize:14,fontWeight:800,color:'#ffffff',fontFamily:"'IBM Plex Mono',monospace",marginBottom:6 }}>order-service</div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ height:5,flex:1,background:'rgba(255,255,255,.08)',borderRadius:99,overflow:'hidden' }}>
            <div style={{ height:'100%',width:'72%',background:'linear-gradient(90deg,#22c55e,#38bdf8)',borderRadius:99 }}/>
          </div>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',fontWeight:700 }}>72/100</span>
        </div>
      </div>
    );
    if (item.type === 'ai') return (
      <div key={i} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#38bdf8',marginBottom:9,textTransform:'uppercase',letterSpacing:'.12em',display:'flex',alignItems:'center',gap:6 }}>
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#38bdf8',display:'inline-block',boxShadow:'0 0 6px #38bdf8' }}/>AI Summary · order-service
        </div>
        <div style={{ fontSize:12,color:'#f0f0ff',lineHeight:1.78 }}>
          <p style={{ marginBottom:8 }}>Your test suite is in solid shape with 47 of 50 tests passing, but <span style={{ color:'#f59e0b',fontWeight:600 }}>three failures all trace to the same checkout function</span> — specifically the <code style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#38bdf8',background:'rgba(56,189,248,.1)',padding:'1px 5px',borderRadius:3 }}>calculateTax()</code> method when passed a zero-value order. That's the highest-leverage fix available right now — one function, three test cases, zero complexity.</p>
          <p style={{ marginBottom:8 }}>The lodash version pinned in your manifest carries <span style={{ color:'#ef4444',fontWeight:600 }}>CVE-2021-23337 (moderate severity)</span>. The fix is a drop-in upgrade to <code style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#38bdf8',background:'rgba(56,189,248,.1)',padding:'1px 5px',borderRadius:3 }}>lodash@4.17.21</code> — no API changes required, estimated effort under ten minutes.</p>
          <p>Your team shows <span style={{ color:'#22c55e',fontWeight:600 }}>strong TDD discipline at 68% test-first ratio</span>. The 32% gap is mostly in refactor commits — worth closing by adding tests for any function touched during cleanup. No secrets, tokens, or credentials were found anywhere in the commit history.</p>
        </div>
      </div>
    );
    if (item.type === 'divider') return (
      <div key={i} style={{ display:'flex',alignItems:'center',gap:8,margin:'12px 0 8px' }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#38bdf8',textTransform:'uppercase',letterSpacing:'.14em',whiteSpace:'nowrap' }}>{item.label}</span>
        <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(56,189,248,.3),transparent)' }}/>
      </div>
    );
    if (item.type === 'find') return (
      <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize:13,flexShrink:0 }}>{item.icon}</span>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'rgba(255,255,255,.65)',flex:1 }}>{item.label}</span>
        <span style={{ display:'flex',alignItems:'center',gap:5,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#fff',whiteSpace:'nowrap' }}>
          <span style={{ width:5,height:5,borderRadius:'50%',background:item.s==='pass'?'#22c55e':'#ef4444',display:'inline-block',boxShadow:`0 0 5px ${item.s==='pass'?'#22c55e':'#ef4444'}` }}/>
          {item.value}
        </span>
      </div>
    );
    if (item.type === 'bar') return (
      <div key={i} style={{ marginBottom:7 }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,marginBottom:3 }}>
          <span style={{ color:'rgba(255,255,255,.6)' }}>{item.label}</span>
          <span style={{ color:item.c,fontWeight:700 }}>{item.pct}%</span>
        </div>
        <div style={{ height:4,background:'rgba(255,255,255,.08)',borderRadius:99,overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${item.pct}%`,background:`linear-gradient(90deg,${item.c},${item.c}99)`,borderRadius:99,boxShadow:`0 0 6px ${item.c}88` }}/>
        </div>
      </div>
    );
    if (item.type === 'commit') return (
      <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.04)' }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#38bdf8',flexShrink:0 }}>{item.hash}</span>
        <span style={{ fontSize:11,color:item.tdd?'rgba(255,255,255,.8)':'rgba(255,255,255,.4)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.msg}</span>
        {item.tdd && <span style={{ fontSize:9,fontFamily:"'IBM Plex Mono',monospace",color:'#22c55e',background:'rgba(34,197,94,.12)',padding:'2px 6px',borderRadius:4,flexShrink:0,border:'1px solid rgba(34,197,94,.2)' }}>TDD</span>}
      </div>
    );
    if (item.type === 'footer') return (
      <div key={i} style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(255,255,255,.2)',textAlign:'center',padding:'12px 0 8px',borderTop:'1px solid rgba(255,255,255,.06)',marginTop:8 }}>
        RepoScope · order-service · generated {new Date().toLocaleDateString()}
      </div>
    );
    return null;
  };

  return (
    <div style={{ background:'#05050d', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)', position:'relative' }}>
      {/* Window bar */}
      <div style={{ background:'rgba(255,255,255,.05)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'12px 16px', display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ width:10,height:10,borderRadius:'50%',background:'#ef4444',display:'inline-block',boxShadow:'0 0 6px #ef4444' }}/>
        <span style={{ width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block',boxShadow:'0 0 6px #f59e0b' }}/>
        <span style={{ width:10,height:10,borderRadius:'50%',background:'#22c55e',display:'inline-block',boxShadow:'0 0 6px #22c55e' }}/>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'rgba(255,255,255,.4)',marginLeft:8 }}>reposcope-report.pdf</span>
        <span style={{ marginLeft:'auto',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#38bdf8',display:'flex',alignItems:'center',gap:5 }}>
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#38bdf8',display:'inline-block',animation:'rpp 1.5s ease-in-out infinite' }}/>LIVE PREVIEW
        </span>
      </div>
      {/* Scrolling content */}
      <div ref={scrollRef} style={{ height:420, overflow:'hidden', padding:'16px 18px', background:'#08080f' }}>
        {[...reportRows, ...reportRows, ...reportRows].map((item, i) => renderRow(item, i))}
      </div>
      {/* Fade overlay at bottom */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:56,background:'linear-gradient(0deg,#08080f,transparent)',pointerEvents:'none' }}/>
    </div>
  );
}

export default function SampleReport() {
  const [vis,        setVis]    = useState(false);
  const [countersGo, setGo]     = useState(false);
  const [cycle,      setCycle]  = useState(0);   // increments to re-trigger counters
  const [inView,     setInView] = useState(false);
  const ref       = useRef(null);
  const loopTimer = useRef(null);

  // Loop counters every 6s while section is in view
  useEffect(() => {
    if (!inView || !countersGo) return;
    loopTimer.current = setInterval(() => {
      setCycle(n => n + 1);
    }, 6000);
    return () => clearInterval(loopTimer.current);
  }, [inView, countersGo]);

  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (e[0].isIntersecting) {
        setVis(true);
        setInView(true);
        setTimeout(() => setGo(true), 300);
      } else {
        setInView(false);
        clearInterval(loopTimer.current);
      }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="sample" ref={ref} style={{ padding:'88px 0', borderBottom:'1px solid rgba(255,255,255,.07)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(225deg,rgba(245,158,11,.04),transparent 60%)',pointerEvents:'none' }}/>

      <div className="rs-wrap" style={{ position:'relative',zIndex:1 }}>
        <div className="rs-sample-grid">

          {/* LEFT — heading, description, counters ONLY. No AI summary, no findings list. */}
          <div style={{ opacity:vis?1:0,transform:vis?'none':'translateX(-28px)',transition:'all .6s cubic-bezier(.22,1,.36,1)' }}>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:14 }}>Sample Report</p>
            <h2 style={{ fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f0ff',marginBottom:16,lineHeight:1.1 }}>
              Read like a note from a{' '}
              <span style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>colleague</span>
            </h2>
            <p style={{ fontSize:15,color:'#aaaac8',lineHeight:1.75,maxWidth:420,marginBottom:0 }}>
              The summary at the top of every report is written prose, not a table of pass/fail flags. It says what's worth fixing before your next release and what can wait.
            </p>
            {/* Animated counters only */}
            <div style={{ display:'flex',gap:28,marginTop:32,flexWrap:'wrap' }}>
              {stats.map((stat, i) => <Counter key={i} stat={stat} go={countersGo} cycle={cycle} />)}
            </div>
          </div>

          {/* RIGHT — bright scrolling report preview only */}
          <div style={{ opacity:vis?1:0,transform:vis?'none':'translateX(28px) scale(.97)',transition:'all .65s .1s cubic-bezier(.22,1,.36,1)' }}>
            <ScrollingReport go={countersGo} />
          </div>
        </div>
      </div>

      <style>{`
        .rs-sample-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:52px;align-items:start}
        @media(max-width:1024px){.rs-sample-grid{grid-template-columns:1fr;gap:32px}}
        @media(max-width:768px){#sample{padding:56px 0!important}}
        @media(max-width:480px){#sample{padding:48px 0!important}}
      `}</style>
    </section>
  );
}