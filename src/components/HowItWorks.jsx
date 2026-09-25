import { useState, useEffect, useRef } from 'react';

const STEP_DUR = 5000;

const stepsData = [
  { num:'01', icon:'🔗', title:'Paste your repository URL',       detail:'Enter any public GitHub repository URL — no installation, no tokens, no configuration needed. RepoScope reads your codebase exactly as a new contributor would, starting from the file tree and package manifest.' },
  { num:'02', icon:'⚙️', title:'RepoScope analyses every layer',  detail:'Six checks run simultaneously across your commit history, dependency manifest, file structure, and endpoint surface. Nothing is written back to your repository — fully read-only and completes in under 30 seconds.' },
  { num:'03', icon:'📊', title:'Review your full report',          detail:'Every finding includes the exact file, line number, and a severity rating so your team knows what to fix first. An AI-generated prose summary sits at the top, written like a note from a senior engineer.' },
  { num:'04', icon:'📄', title:'Download and share',               detail:'Export the complete PDF report to share with teammates, stakeholders, or your professor. Every check, score, code reference, and recommendation compiled into one professional document.' },
];

const pasteStr  = 'https://github.com/facebook/react';
const scanSteps = ['Connecting to GitHub API...','Reading file tree & manifest...','Analysing 247 commits for TDD...','Running dependency CVE audit...','Scanning for exposed secrets...','Finalising & scoring report...'];
const scanLog   = [
  { c:'#22c55e', t:'✓ GitHub API connected · repo cloned' },
  { c:'#38bdf8', t:'→ 3,847 files indexed across 12 dirs' },
  { c:'#818cf8', t:'→ 247 commits parsed · 100 analysed' },
  { c:'#22c55e', t:'✓ TDD score: 85% · strong discipline' },
  { c:'#f59e0b', t:'⚠ lodash@4.17.15 · CVE-2021-23337' },
  { c:'#22c55e', t:'✓ no secrets found in commit history' },
];
const urlMap = ['reposcope.app','reposcope.app — scanning...','reposcope.app/scan/a1b2c3d4','reposcope.app/report/download'];
const lblMap = ['Step 1 of 4','Step 2 of 4','Step 3 of 4','Step 4 of 4'];

export default function HowItWorks() {
  const [active, setActive]   = useState(0);
  const [paused, setPaused]   = useState(true);
  const [hdr,    setHdr]      = useState(false);
  const [paste,  setPaste]    = useState('');
  const [sIdx,   setSIdx]     = useState(0);
  const [sLogs,  setSLogs]    = useState([]);
  const [sPct,   setSPct]     = useState(0);
  const [b1, setB1]           = useState(false);
  const [b2, setB2]           = useState(false);
  const [progW,  setProgW]    = useState(0);
  const [inView, setInView]   = useState(false);

  const autoRef   = useRef(null);
  const subRef    = useRef(null);
  const secRef    = useRef(null);
  const pausedRef = useRef(true);
  const curStep   = useRef(0);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setHdr(true); setInView(true); }
      else {
        setInView(false);
        clearTimeout(autoRef.current); clearTimeout(subRef.current);
        setActive(0); setPaste(''); setSIdx(0); setSLogs([]); setSPct(0);
        setB1(false); setB2(false); setProgW(0); setPaused(true);
        pausedRef.current = true;
      }
    }, { threshold: 0.1 });
    if (secRef.current) obs.observe(secRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    // Start paused — show overview of all steps, user presses Play to begin
    pausedRef.current = true;
    setPaused(true);
    setActive(0); // 0 = show overview panel
  }, [inView]);

  function go(n) {
    if (pausedRef.current) return;
    clearTimeout(autoRef.current);
    curStep.current = n;
    show(n);
    autoRef.current = setTimeout(() => go(n % 4 + 1), STEP_DUR);
  }

  function togglePause() {
    if (!pausedRef.current) {
      // Pause
      pausedRef.current = true;
      setPaused(true);
      clearTimeout(autoRef.current);
    } else {
      // Play — if never started, begin at step 1; otherwise resume from current
      pausedRef.current = false;
      setPaused(false);
      const next = curStep.current === 0 ? 1 : (curStep.current % 4) + 1;
      go(next);
    }
  }

  function show(n) {
    setActive(n); setProgW(0);
    requestAnimationFrame(() => setTimeout(() => setProgW(100), 20));
    clearTimeout(subRef.current);
    setPaste(''); setSIdx(0); setSLogs([]); setSPct(0); setB1(false); setB2(false);
    if (n === 1) runPaste();
    if (n === 2) runScan();
    if (n === 3) subRef.current = setTimeout(() => { setB1(true); setB2(true); }, 300);
  }

  function runPaste() {
    let i = 0;
    const f = () => { if (i <= pasteStr.length) { setPaste(pasteStr.slice(0, i)); i++; subRef.current = setTimeout(f, 52); } };
    subRef.current = setTimeout(f, 400);
  }

  function runScan() {
    let si = 0;
    const f = () => {
      if (si >= scanSteps.length) return;
      setSIdx(si); setSPct(Math.round((si + 1) / scanSteps.length * 100));
      if (si < scanLog.length) setSLogs(p => [...p, si]);
      si++; subRef.current = setTimeout(f, 680);
    };
    subRef.current = setTimeout(f, 300);
  }

  const s = active > 0 ? stepsData[active - 1] : null;

  return (
    <section id="how-it-works" ref={secRef} style={{ padding:'88px 0', borderBottom:'1px solid rgba(255,255,255,.07)', position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(99,102,241,.03) 0%,transparent 40%,rgba(124,45,18,.04) 100%)' }}>
      <div className="rs-wrap" style={{ position:'relative', zIndex:1 }}>

        {/* TWO COLUMN — left has eyebrow+heading+text, right has terminal. Both start at same top. */}
        <div className="rs-how-grid">

          {/* LEFT — eyebrow + heading + paragraphs, all inline so terminal aligns with HOW IT WORKS */}
          <div style={{ opacity:hdr?1:0,transform:hdr?'none':'translateY(20px)',transition:'all .6s cubic-bezier(.22,1,.36,1)' }}>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:14 }}>How It Works</p>
            <h2 style={{ fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f0ff',marginBottom:20,lineHeight:1.1 }}>
              From URL to{' '}
              <span style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>full report</span>
              {' '}in seconds
            </h2>
            <p style={{ fontSize:15,color:'#aaaac8',lineHeight:1.78,marginBottom:20 }}>
              The interactive demo to the right shows how RepoScope analyses a real repository - from pasting a GitHub URL through the parallel scan pipeline to the scored findings report. Press play to watch each stage unfold automatically, or click any dot to jump to that step directly.
            </p>
            <p style={{ fontSize:15,color:'#aaaac8',lineHeight:1.78 }}>
              Each step shows the live terminal output for that stage. Watch the URL get typed, the scan pipeline run in real-time, and findings appear as the report builds.
            </p>
          </div>

          {/* RIGHT — demo frame */}
          <div>
            {active === 0
              ? <div style={{ background:'#08080f',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.6)',height:490,display:'flex',flexDirection:'column' }} className="rs-how-demo">
                  {/* Browser bar */}
                  <div style={{ background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'12px 16px',display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#ef4444',display:'inline-block' }}/>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#f59e0b',display:'inline-block' }}/>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#22c55e',display:'inline-block' }}/>
                    <span style={{ flex:1,background:'rgba(255,255,255,.06)',borderRadius:5,padding:'5px 10px',fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a',margin:'0 10px' }}>reposcope.app</span>
                  </div>
                  {/* Dots row with play button */}
                  <div style={{ display:'flex',gap:6,padding:'9px 16px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid rgba(255,255,255,.04)',flexShrink:0,alignItems:'center' }}>
                    {[1,2,3,4].map(n=>(
                      <div key={n} style={{ width:8,height:8,borderRadius:'50%',background:'rgba(255,255,255,.1)' }}/>
                    ))}
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',marginLeft:6 }}>Ready to play</span>
                    <button onClick={togglePause}
                      style={{ marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:6,background:'rgba(34,197,94,.18)',border:'1px solid rgba(34,197,94,.4)',borderRadius:7,padding:'5px 12px',cursor:'pointer',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:'#22c55e',boxShadow:'0 0 12px rgba(34,197,94,.3)',animation:'rpp 2s ease-in-out infinite' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(34,197,94,.3)';e.currentTarget.style.boxShadow='0 0 20px rgba(34,197,94,.5)';e.currentTarget.style.animation='none';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(34,197,94,.18)';e.currentTarget.style.boxShadow='0 0 12px rgba(34,197,94,.3)';e.currentTarget.style.animation='rpp 2s ease-in-out infinite';}}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#22c55e"><polygon points="5,3 19,12 5,21"/></svg>Play
                    </button>
                  </div>
                  {/* Steps overview — all 4 visible, compact cards */}
                  <div style={{ flex:1,padding:'10px 12px',display:'flex',flexDirection:'column',gap:6,overflowY:'scroll',scrollbarWidth:'auto',scrollbarColor:'#ffffff #1a1a2e' }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#44445a',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:2 }}>What this demo covers</div>
                    {stepsData.map((st,i)=>(
                      <div key={st.num}
                        onClick={()=>{ pausedRef.current=false; setPaused(false); curStep.current=i+1; show(i+1); autoRef.current=setTimeout(()=>go((i+1)%4+1),STEP_DUR); }}
                        style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:9,cursor:'pointer',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',transition:'all .2s',flexShrink:0 }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.borderColor='rgba(255,255,255,.16)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.07)';}}
                      >
                        <div style={{ width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,flexShrink:0,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#aaaac8' }}>{st.num}</div>
                        <div style={{ minWidth:0,flex:1 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:'#f0f0ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{st.icon} {st.title}</div>
                        </div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#44445a" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                      </div>
                    ))}
                  </div>
                  <div style={{ height:2,background:'rgba(255,255,255,.04)',flexShrink:0 }}/>
                </div>
              : <div style={{ background:'#08080f',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.6)',height:490,display:'flex',flexDirection:'column' }} className="rs-how-demo">

                  {/* Browser bar */}
                  <div style={{ background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'12px 16px',display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#ef4444',display:'inline-block' }}/>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#f59e0b',display:'inline-block' }}/>
                    <span style={{ width:9,height:9,borderRadius:'50%',background:'#22c55e',display:'inline-block' }}/>
                    <span style={{ flex:1,background:'rgba(255,255,255,.06)',borderRadius:5,padding:'5px 10px',fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:active>1?'#38bdf8':'#44445a',margin:'0 10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transition:'color .4s' }}>{urlMap[active-1]}</span>

                  </div>

                  {/* Step dots + play/pause inside the terminal box */}
                  <div style={{ display:'flex',gap:6,padding:'9px 16px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid rgba(255,255,255,.04)',flexShrink:0,alignItems:'center' }}>
                    {[1,2,3,4].map(n => (
                      <div key={n} onClick={() => { clearTimeout(autoRef.current); curStep.current=n; show(n); if(!pausedRef.current) autoRef.current=setTimeout(()=>go(n%4+1),STEP_DUR); }} style={{ width:8,height:8,borderRadius:'50%',cursor:'pointer',background:active===n?'#22c55e':'rgba(255,255,255,.1)',boxShadow:active===n?'0 0 8px rgba(34,197,94,.5)':'none',transition:'all .3s' }}/>
                    ))}
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',marginLeft:6 }}>{lblMap[active-1]}</span>
                    {/* Play / Pause — inside the terminal box, right side */}
                    <button onClick={togglePause}
                      style={{ marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:6,background:paused?'rgba(34,197,94,.18)':'rgba(255,255,255,.06)',border:`1px solid ${paused?'rgba(34,197,94,.4)':'rgba(255,255,255,.1)'}`,borderRadius:7,padding:'5px 12px',cursor:'pointer',transition:'all .22s',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:paused?'#22c55e':'#aaaac8',boxShadow:paused?'0 0 12px rgba(34,197,94,.3)':'none',animation:paused?'rpp 2s ease-in-out infinite':'none' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=paused?'rgba(34,197,94,.3)':'rgba(255,255,255,.1)'; e.currentTarget.style.boxShadow=paused?'0 0 20px rgba(34,197,94,.5)':'none'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=paused?'rgba(34,197,94,.18)':'rgba(255,255,255,.06)'; e.currentTarget.style.boxShadow=paused?'0 0 12px rgba(34,197,94,.3)':'none'; }}
                    >
                      {paused
                        ? <><svg width="9" height="9" viewBox="0 0 24 24" fill="#22c55e"><polygon points="5,3 19,12 5,21"/></svg>Play</>
                        : <><svg width="9" height="9" viewBox="0 0 24 24" fill="#aaaac8"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause</>}
                    </button>
                  </div>

                  {/* Screen — scrollable with bright red scrollbar so content is never cut */}
                  <div style={{ flex:1,overflowY:'scroll',scrollbarWidth:'auto',scrollbarColor:'#ffffff #1a1a2e' }}>
                    <div key={active} style={{ padding:18,animation:'screenIn .4s cubic-bezier(.22,1,.36,1) forwards' }}>

                      {/* Step header */}
                      <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:14,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#22c55e,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:'#06060e',flexShrink:0 }}>{s.num}</div>
                        <div>
                          <div style={{ fontSize:13,fontWeight:700,color:'#f0f0ff',marginBottom:4 }}>{s.icon} {s.title}</div>
                          <div style={{ fontSize:11,color:'#aaaac8',lineHeight:1.65 }}>{s.detail}</div>
                        </div>
                      </div>

                      {/* Step 1 */}
                      {active===1&&(
                        <div style={{ background:'rgba(34,197,94,.04)',border:'1px solid rgba(34,197,94,.15)',borderRadius:12,padding:14 }}>
                          <div style={{ fontSize:11,color:'#aaaac8',marginBottom:8,fontFamily:"'IBM Plex Mono',monospace" }}>github.com/your-org/your-repo</div>
                          <div style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(56,189,248,.25)',borderRadius:8,padding:'9px 11px',fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:'#38bdf8',marginBottom:10,minHeight:34,wordBreak:'break-all' }}>
                            {paste}<span style={{ display:'inline-block',width:2,height:13,background:'#38bdf8',verticalAlign:'middle',marginLeft:1,animation:'blink .8s step-end infinite' }}/>
                          </div>
                          <div style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',borderRadius:8,padding:9,fontWeight:700,fontSize:13,textAlign:'center',cursor:'pointer' }}>Analyse Repository ↗</div>
                          <div style={{ marginTop:8,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a' }}>public repos only · no account required · read-only</div>
                        </div>
                      )}

                      {/* Step 2 */}
                      {active===2&&(
                        <div>
                          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12 }}>
                            <div style={{ width:56,height:56,position:'relative' }}>
                              {[{i:0,c:'#22c55e',d:'1.3s',r:false},{i:9,c:'#38bdf8',d:'2s',r:true},{i:18,c:'#818cf8',d:'1.7s',r:false}].map((ring,k)=>(
                                <div key={k} style={{ position:'absolute',inset:ring.i,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,.04)',borderTopColor:ring.c,animation:`sp ${ring.d} linear ${ring.r?'reverse ':''}infinite` }}/>
                              ))}
                              <div style={{ position:'absolute',inset:26,borderRadius:'50%',background:'linear-gradient(135deg,#22c55e,#38bdf8)',animation:'cp 2s ease-in-out infinite' }}/>
                            </div>
                          </div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a',textAlign:'center',marginBottom:10 }}>{scanSteps[sIdx]||'Initialising...'}</div>
                          <div style={{ height:3,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden',marginBottom:10 }}>
                            <div style={{ height:'100%',background:'linear-gradient(135deg,#22c55e,#38bdf8)',borderRadius:99,width:`${sPct}%`,transition:'width .8s ease' }}/>
                          </div>
                          <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                            {scanLog.map((l,i)=>(
                              <div key={i} style={{ display:'flex',alignItems:'center',gap:7,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,opacity:sLogs.includes(i)?1:0,transform:sLogs.includes(i)?'none':'translateX(-8px)',transition:'all .35s' }}>
                                <span style={{ width:5,height:5,borderRadius:'50%',background:l.c,flexShrink:0,display:'inline-block' }}/><span style={{ color:l.c }}>{l.t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 3 */}
                      {active===3&&(
                        <div>
                          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6 }}>
                            <span style={{ fontSize:12,fontWeight:700,color:'#f0f0ff' }}>facebook / react</span>
                            <span style={{ background:'rgba(34,197,94,.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,.2)',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,padding:'2px 8px',borderRadius:5 }}>COMPLETE</span>
                          </div>
                          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10 }}>
                            {[{n:'3.8k',l:'Files',c:'#22c55e'},{n:'100',l:'Commits',c:'#38bdf8'},{n:'5',l:'Findings',c:'#f59e0b'}].map(stat=>(
                              <div key={stat.l} style={{ background:'rgba(255,255,255,.04)',borderRadius:7,padding:8,textAlign:'center' }}>
                                <span style={{ fontSize:16,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:stat.c,display:'block',marginBottom:2 }}>{stat.n}</span>
                                <span style={{ fontSize:9,color:'#44445a',textTransform:'uppercase' }}>{stat.l}</span>
                              </div>
                            ))}
                          </div>
                          {[{l:'TDD Ratio',v:'85%',w:b1?'85%':'0%'},{l:'Security',v:'Clean',w:b2?'100%':'0%',g:'linear-gradient(90deg,#22c55e,#4ade80)'}].map(bar=>(
                            <div key={bar.l} style={{ marginBottom:7 }}>
                              <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#aaaac8',marginBottom:3 }}><span>{bar.l}</span><span style={{ color:'#22c55e' }}>{bar.v}</span></div>
                              <div style={{ height:4,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden' }}>
                                <div style={{ height:'100%',borderRadius:99,background:bar.g||'linear-gradient(135deg,#22c55e,#38bdf8)',width:bar.w,transition:'width 1s ease .2s' }}/>
                              </div>
                            </div>
                          ))}
                          <div style={{ display:'flex',flexDirection:'column',gap:4,marginTop:8 }}>
                            {[{c:'#22c55e',t:'TDD — PASS · 85% test-first ratio'},{c:'#f59e0b',t:'lodash@4.17.15 — CVE-2021-23337 HIGH'},{c:'#22c55e',t:'No secrets detected in commit history'},{c:'#38bdf8',t:'AI summary generated · 3 priority fixes'}].map(f=>(
                              <div key={f.t} style={{ display:'flex',alignItems:'center',gap:7,fontSize:11,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:6,padding:'5px 9px' }}>
                                <span style={{ width:5,height:5,borderRadius:'50%',background:f.c,flexShrink:0,display:'inline-block' }}/><span style={{ color:'#aaaac8' }}>{f.t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 4 */}
                      {active===4&&(
                        <div style={{ textAlign:'center',paddingTop:8 }}>
                          <div style={{ fontSize:40,marginBottom:12,display:'inline-block',animation:'bounce 1.2s ease-in-out infinite' }}>📄</div>
                          <div style={{ fontSize:14,fontWeight:700,color:'#f0f0ff',marginBottom:8 }}>Your Full Report is Ready</div>
                          <div style={{ fontSize:11,color:'#aaaac8',marginBottom:14,lineHeight:1.65 }}>Complete PDF — every check, score, code reference, and prioritised recommendation in one professional document.</div>
                          <div style={{ display:'inline-flex',alignItems:'center',gap:7,background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',borderRadius:9,padding:'9px 20px',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8 }}>Download PDF Report ↓</div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a' }}>$4.99 one-time · includes full AI summary · instant download</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height:2,background:'rgba(255,255,255,.04)',flexShrink:0 }}>
                    <div style={{ height:'100%',background:'linear-gradient(135deg,#22c55e,#38bdf8)',width:paused?`${progW}%`:`${progW}%`,transition:paused?'none':`width ${STEP_DUR}ms linear` }}/>
                  </div>
                </div>
            }
          </div>
        </div>
      </div>

      <style>{`
        .rs-how-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:56px;align-items:start}
        @media(max-width:1280px){.rs-how-grid{grid-template-columns:1fr 1.3fr;gap:48px}}
        @media(max-width:1024px){.rs-how-grid{grid-template-columns:1fr;gap:32px}}
        @media(max-width:1024px){.rs-how-demo{height:440px!important}}
        @media(max-width:768px){#how-it-works{padding:56px 0!important}.rs-how-demo{height:380px!important}}
        @media(max-width:480px){#how-it-works{padding:48px 0!important}}
        /* Always-visible white scrollbar inside terminal panels */
        .rs-how-grid *::-webkit-scrollbar{width:5px}
        .rs-how-grid *::-webkit-scrollbar-track{background:#1a1a2e;border-radius:99px}
        .rs-how-grid *::-webkit-scrollbar-thumb{background:#ffffff;border-radius:99px;box-shadow:0 0 8px rgba(255,255,255,.7)}
        .rs-how-grid *::-webkit-scrollbar-thumb:hover{background:#ffffff;box-shadow:0 0 14px rgba(255,255,255,.95)}
      `}</style>
    </section>
  );
}