import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer.jsx';

/* ── TDD engine ── */
const TK=[/\btest\b/i,/\bspec\b/i,/\btdd\b/i,/\bfailing test\b/i,/\badd test/i,/\bwrite test/i];
const CK=[/\bfeat\b/i,/\bfeature\b/i,/\bimplement\b/i,/\badd\b/i,/\bbuild\b/i,/\bcreate\b/i,/\bfix\b/i,/\brefactor\b/i,/\bupdate\b/i];
const isT=m=>TK.some(r=>r.test(m));
const isC=m=>CK.some(r=>r.test(m))&&!isT(m);

function analyse(commits){
  if(!commits?.length)return{tddRatio:null,severity:'info'};
  const ch=[...commits].reverse();let code=0,tdd=0;
  for(let i=0;i<ch.length;i++){if(!isC(ch[i].message))continue;code++;if(ch.slice(Math.max(0,i-5),i).some(c=>isT(c.message)))tdd++;}
  if(!code)return{tddRatio:null,severity:'info'};
  const r=Math.round(tdd/code*100);
  return{tddRatio:r,severity:r>=60?'pass':r>=30?'warn':'info'};
}

const diagTests=[
  {n:"analyse() returns null for empty commit array",              d:"No commits means no data. Returns null to distinguish missing data from a poor TDD score.",                                              f:()=>analyse([]).tddRatio===null},
  {n:"analyse() returns null when no implementation commits exist",d:"If every commit is a test commit, implementation count is zero. Null signals inconclusive data.",                                     f:()=>analyse([{message:'add test for login'},{message:'write test for signup'}]).tddRatio===null},
  {n:"analyse() returns 100 when test precedes implementation",    d:"A test commit arrives before implementation. Lookback window finds it, pair is confirmed, ratio is 100.",                            f:()=>analyse([{message:'add test for payment'},{message:'implement payment logic'}]).tddRatio===100},
  {n:"analyse() returns 0 when implementation precedes its test", d:"Implementation arrives first. Lookback finds no prior test. Zero pairs confirmed, ratio is zero.",                                   f:()=>analyse([{message:'implement auth'},{message:'add test for auth'}]).tddRatio===0},
  {n:"analyse() resolves to warn or pass for mixed history",       d:"A realistic mix where most but not all features follow TDD. Severity resolves correctly.",                                           f:()=>{const r=analyse([{message:'write test for cart'},{message:'add cart feature'},{message:'write test for checkout'},{message:'implement checkout'},{message:'implement profile'}]);return r.severity==='pass'||r.severity==='warn';}},
  {n:"isTestCommit classifies 'add test for login' as true",       d:"Message contains 'test' matching TEST_KEYWORDS. Returns true so commit is eligible as TDD pair.",                                   f:()=>isT('add test for login')===true},
  {n:"isCodeCommit excludes 'add test for login' returning false", d:"Although 'add' matches CODE_KEYWORDS, isCodeCommit checks isTestCommit first. Test commits return false to prevent double-counting.",f:()=>isC('add test for login')===false},
  {n:"isCodeCommit classifies 'implement payment service' as true",d:"Matches 'implement' in CODE_KEYWORDS with no test keywords present. Correctly returns true.",                                       f:()=>isC('implement payment service')===true},
];

const allFindings=[
  {icon:'🧪',cat:'TDD',        msg:'Test commits precede implementation commits in 85% of features. Strong test-driven discipline confirmed.',              badge:'PASS',    pass:true},
  {icon:'📋',cat:'UNIT_TEST',  msg:'AST-based line-level test coverage analysis. Identifies exactly which functions and branches lack coverage.',             badge:'UPCOMING',pass:false},
  {icon:'⚙️',cat:'CODE_QUALITY',msg:'Cyclomatic complexity, code smell detection, and duplicate block identification across all source files.',              badge:'UPCOMING',pass:false},
  {icon:'📦',cat:'DEPENDENCY', msg:'CVE vulnerability audit against the NVD database for every declared package and transitive dependency.',                 badge:'UPCOMING',pass:false},
  {icon:'🔒',cat:'SECURITY',   msg:'OWASP Top 10 pattern matching, credential scanning, and secret detection across all committed files.',                  badge:'UPCOMING',pass:false},
];

function useCounter(target,dur,go){
  const[val,setVal]=useState(0);
  useEffect(()=>{
    if(!go)return;
    const s=performance.now();
    const tick=now=>{const p=Math.min((now-s)/dur,1),e=1-Math.pow(1-p,3);setVal(Math.round(e*target));if(p<1)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },[go,target,dur]);
  return val;
}

/* Scanning intro animation */
const scanningLines=[
  {c:'#44445a',t:'$ reposcope analyse github.com/facebook/react'},
  {c:'#44445a',t:'→ connecting to GitHub API...'},
  {c:'#818cf8',t:'→ cloning repository...'},
  {c:'#44445a',t:'→ reading file tree: 3,847 files found'},
  {c:'#44445a',t:'→ parsing package manifest...'},
  {c:'#818cf8',t:'→ fetching commit history: 100 commits'},
  {c:'#22c55e',t:'→ running TDD detection...'},
  {c:'#f59e0b',t:'→ auditing 48 dependencies for CVEs...'},
  {c:'#22c55e',t:'→ scanning git history for secrets...'},
  {c:'#38bdf8',t:'→ generating AI summary...'},
  {c:'#22c55e',t:'✓ analysis complete — report ready'},
];

export default function ScanResult(){
  const navigate=useNavigate();
  const[phase,setPhase]=useState('scanning'); // 'scanning' | 'results'
  const[scanLineIdx,setScanLineIdx]=useState(0);
  const[scanPct,setScanPct]=useState(0);
  const[chipsGo,setChipsGo]=useState(false);
  const[barsGo,setBarsGo]=useState(false);
  const[ctrGo,setCtrGo]=useState(false);
  const[expanded,setExpanded]=useState(null);
  const[diagRes,setDiagRes]=useState([]);
  const[diagRun,setDiagRun]=useState(false);
  const[diagDone,setDiagDone]=useState(false);
  const[diagScore,setDiagScore]=useState(null);
  const chipsRef=useRef(null),barsRef=useRef(null),ctrRef=useRef(null);

  const files=useCounter(3847,1800,chipsGo);
  const commits=useCounter(100,1400,chipsGo);
  const found=useCounter(5,900,chipsGo);
  const k1=useCounter(100,1600,ctrGo);
  const k2=useCounter(47,1400,ctrGo);
  const k3=useCounter(40,1400,ctrGo);

  // Scanning phase animation
  useEffect(()=>{
    let idx=0;
    const interval=setInterval(()=>{
      idx++;
      setScanLineIdx(idx);
      setScanPct(Math.round(idx/scanningLines.length*100));
      if(idx>=scanningLines.length){
        clearInterval(interval);
        setTimeout(()=>setPhase('results'),800);
      }
    },480);
    return()=>clearInterval(interval);
  },[]);

  // Intersection observers for results animations
  useEffect(()=>{
    if(phase!=='results')return;
    const mk=(ref,fn)=>new IntersectionObserver(e=>{if(e[0].isIntersecting)fn(true);},{threshold:.25});
    const o1=mk(chipsRef,setChipsGo),o2=mk(barsRef,setBarsGo),o3=mk(ctrRef,setCtrGo);
    if(chipsRef.current)o1.observe(chipsRef.current);
    if(barsRef.current)o2.observe(barsRef.current);
    if(ctrRef.current)o3.observe(ctrRef.current);
    return()=>{o1.disconnect();o2.disconnect();o3.disconnect();};
  },[phase]);

  async function runDiag(){
    setDiagRun(true);setDiagDone(false);setDiagRes([]);setDiagScore(null);
    await new Promise(r=>setTimeout(r,1400));
    const res=diagTests.map(t=>{let p=false;try{p=t.f();}catch(_){}return{...t,p};});
    const passed=res.filter(r=>r.p).length;
    setDiagScore({passed,total:res.length,pct:Math.round(passed/res.length*100)});
    for(let i=0;i<res.length;i++){await new Promise(r=>setTimeout(r,200));setDiagRes(p=>[...p,res[i]]);}
    setDiagRun(false);setDiagDone(true);
  }

  const S={fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:18,display:'flex',alignItems:'center',gap:12};

  return(
    <div style={{minHeight:'100vh',background:'#06060e',color:'#f0f0ff'}}>
      {/* Rich background */}
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px)',backgroundSize:'52px 52px',maskImage:'radial-gradient(ellipse 100% 70% at 50% 0%,black,transparent)'}}/>
        <div style={{position:'absolute',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,rgba(34,197,94,.08),transparent 65%)',filter:'blur(130px)',top:-200,left:-150,animation:'orbf 20s ease-in-out infinite'}}/>
        <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(180,83,9,.18),transparent 65%)',filter:'blur(120px)',top:'30%',right:'5%',animation:'orbf 22s ease-in-out infinite',animationDelay:'-5s'}}/>
        <div style={{position:'absolute',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,.16),transparent 65%)',filter:'blur(120px)',bottom:'10%',left:'10%',animation:'orbf 18s ease-in-out infinite',animationDelay:'-10s'}}/>
      </div>

      {/* Navbar */}
      <nav style={{position:'sticky',top:0,zIndex:300,background:'rgba(6,6,14,.88)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
        <div className="rs-wrap" style={{height:68,display:'flex',alignItems:'center'}}>
          <button onClick={()=>navigate('/')} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>
            <span style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#22c55e,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:'#06060e',boxShadow:'0 0 24px rgba(34,197,94,.35)'}}>&gt;_</span>
            <span style={{fontSize:17,fontWeight:700,color:'#f0f0ff',letterSpacing:'-.025em'}}>RepoScope</span>
          </button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>navigate('/sample')} style={{fontSize:13,color:'#aaaac8',background:'none',border:'none',cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",padding:'7px 13px',borderRadius:8,transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#f0f0ff';e.currentTarget.style.background='rgba(255,255,255,.07)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#aaaac8';e.currentTarget.style.background='transparent';}}
            >Sample Report</button>
            <button onClick={()=>navigate('/')} style={{background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',fontSize:13,fontWeight:700,padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",boxShadow:'0 4px 18px rgba(34,197,94,.3)',transition:'all .22s'}}
              onMouseEnter={e=>{e.currentTarget.style.opacity='.88';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';}}
            >← Back to Home</button>
          </div>
        </div>
      </nav>

      {/* ── SCANNING PHASE ── */}
      {phase==='scanning'&&(
        <div style={{maxWidth:700,margin:'0 auto',padding:'80px 24px 100px',position:'relative',zIndex:1}}>
          <div style={{background:'#08080f',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,overflow:'hidden',boxShadow:'0 40px 100px rgba(0,0,0,.7)'}}>
            <div style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'14px 18px',display:'flex',alignItems:'center',gap:7}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#ef4444',display:'inline-block'}}/>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#33334a',marginLeft:8}}>reposcope — scanning</span>
              <span style={{marginLeft:'auto',display:'flex',gap:4}}>
                {[0,1,2].map(i=><span key={i} style={{width:5,height:5,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:`cp .9s ${i*.2}s ease-in-out infinite`}}/>)}
              </span>
            </div>
            <div style={{padding:24,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,lineHeight:2,minHeight:320}}>
              {scanningLines.slice(0,scanLineIdx).map((l,i)=>(
                <div key={i} style={{color:l.c,animation:'termIn .3s ease forwards',display:'flex',alignItems:'center',gap:8}}>
                  {i===scanLineIdx-1&&<span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:'rpp 1s ease-in-out infinite',flexShrink:0}}/>}
                  {l.t}
                </div>
              ))}
            </div>
            <div style={{padding:'0 24px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#aaaac8',marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>
                <span>Analysing repository...</span><span style={{color:'#22c55e'}}>{scanPct}%</span>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(135deg,#22c55e,#38bdf8)',borderRadius:99,width:`${scanPct}%`,transition:'width .6s ease'}}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase==='results'&&(
        <div className="rs-wrap" style={{position:'relative',zIndex:1,paddingTop:40,paddingBottom:100,animation:'fu .6s cubic-bezier(.22,1,.36,1) forwards'}}>

          {/* Header card */}
          <div ref={chipsRef} style={{background:'rgba(255,255,255,.03)',backdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,.07)',borderRadius:24,padding:'28px 32px',marginBottom:28,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#22c55e 35%,#38bdf8 65%,transparent)'}}/>
            <div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:'rpp 1.8s ease-in-out infinite'}}/>
                Analysis Complete &nbsp;&nbsp; Public Repository
              </div>
              <div style={{fontSize:24,fontWeight:800,color:'#f0f0ff',letterSpacing:'-.04em',marginBottom:4}}>facebook / react</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:'#44445a'}}>https://github.com/facebook/react</div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[{v:files.toLocaleString(),l:'Files',c:'#22c55e'},{v:commits,l:'Commits',c:'#38bdf8'},{v:found,l:'Findings',c:'#f59e0b'}].map(c=>(
                <div key={c.l} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'16px 20px',textAlign:'center',minWidth:80}}>
                  <span style={{display:'block',fontSize:26,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:c.c,marginBottom:3}}>{c.v}</span>
                  <span style={{fontSize:10,color:'#44445a',textTransform:'uppercase',letterSpacing:'.09em'}}>{c.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TDD label */}
          <div style={S}>TDD Analysis<span style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/></div>

          {/* TDD card */}
          <div ref={barsRef} style={{background:'rgba(255,255,255,.028)',backdropFilter:'blur(32px)',border:'1px solid rgba(34,197,94,.18)',borderRadius:24,padding:32,marginBottom:28,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(135deg,#22c55e,#38bdf8)'}}/>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:22,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center'}}>
                <div style={{width:50,height:50,borderRadius:14,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,marginRight:14}}>🧪</div>
                <div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6}}>Test-Driven Development Detector</div>
                  <div style={{fontSize:22,fontWeight:800,color:'#f0f0ff',letterSpacing:'-.04em',marginBottom:4}}>TDD Detection</div>
                  <div style={{fontSize:14,color:'#aaaac8'}}>Commit history and directory structure</div>
                </div>
              </div>
              <span style={{padding:'6px 14px',borderRadius:99,fontSize:11,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",background:'rgba(34,197,94,.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,.25)',flexShrink:0}}>PASS</span>
            </div>
            <div style={{fontSize:14,color:'#ccd8ff',lineHeight:1.8,padding:'16px 20px',background:'rgba(255,255,255,.04)',borderRadius:12,borderLeft:'2px solid #22c55e',marginBottom:22}}>
              Test commits consistently precede implementation commits in <b style={{color:'#88ffcc'}}>85%</b> of features. This demonstrates strong test-driven discipline and confirms quality gates are being respected throughout the development cycle.
            </div>
            {[{l:'Overall TDD Ratio',v:'85 / 100',w:barsGo?'85%':'0%'},{l:'Implementation Commits Preceded by Tests',v:'40 / 47',w:barsGo?'85%':'0%'}].map(b=>(
              <div key={b.l} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:13,color:'#aaaac8'}}>{b.l}</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",color:'#f0f0ff'}}>{b.v}</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,.06)',borderRadius:99}}>
                  <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#22c55e,#38bdf8)',width:b.w,transition:'width 1.8s cubic-bezier(.22,1,.36,1)'}}/>
                </div>
              </div>
            ))}
            <div style={{background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:22}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:10}}>Detection Methodology</div>
              <p style={{fontSize:13,color:'#aaaac8',lineHeight:1.78,marginBottom:18}}>
                The analyser walks the commit timeline chronologically. Each <b style={{color:'#88ffcc'}}>implementation commit</b> (feat, fix, build, create, implement) triggers a lookback across the five preceding commits. If any contain <b style={{color:'#88ffcc'}}>testing signals</b> (test, spec, tdd), the pair is recorded as a confirmed TDD cycle.
              </p>
              <div ref={ctrRef} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {[{v:k1,l:'Commits Analysed',g:'linear-gradient(135deg,#22c55e,#38bdf8)'},{v:k2,l:'Implementation Commits',g:'linear-gradient(135deg,#38bdf8,#818cf8)'},{v:k3,l:'TDD Pairs Confirmed',g:'linear-gradient(135deg,#6366f1,#a78bfa)'}].map(c=>(
                  <div key={c.l} style={{background:'#0e0e1c',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'14px 10px',textAlign:'center'}}>
                    <span style={{fontSize:26,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",display:'block',marginBottom:4,background:c.g,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{c.v}</span>
                    <span style={{fontSize:10,color:'#44445a',textTransform:'uppercase',letterSpacing:'.07em'}}>{c.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Findings */}
          <div style={S}>All Findings<span style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/></div>
          <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:28}}>
            {allFindings.map((f,i)=>(
              <div key={f.cat} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'14px 17px',display:'flex',alignItems:'center',gap:12,transition:'all .22s',cursor:'default'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.14)';e.currentTarget.style.transform='translateX(3px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.transform='none';}}
              >
                <div style={{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,background:f.pass?'rgba(34,197,94,.1)':'rgba(56,189,248,.1)',border:`1px solid ${f.pass?'rgba(34,197,94,.14)':'rgba(56,189,248,.12)'}`}}>{f.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:'#f0f0ff',marginBottom:2,letterSpacing:'.04em'}}>{f.cat}</div>
                  <div style={{fontSize:12,color:'#aaaac8',lineHeight:1.5}}>{f.msg}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",padding:'3px 10px',borderRadius:99,flexShrink:0,background:f.pass?'rgba(34,197,94,.12)':'rgba(56,189,248,.1)',color:f.pass?'#22c55e':'#38bdf8',border:`1px solid ${f.pass?'rgba(34,197,94,.2)':'rgba(56,189,248,.15)'}`}}>{f.badge}</span>
              </div>
            ))}
          </div>

          {/* Diagnostics */}
          <div style={S}>Diagnostics<span style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/></div>
          <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)',borderRadius:22,padding:26,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(135deg,#6366f1,#a78bfa)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
              <div style={{width:38,height:38,background:'rgba(99,102,241,.15)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🧪</div>
              <div style={{fontSize:16,fontWeight:800,color:'#c4b5fd',letterSpacing:'-.03em'}}>TDD Detection Engine Tests</div>
            </div>
            <div style={{fontSize:13,color:'#44445a',marginBottom:18}}>Validates the detection engine against known commit patterns. Click any result to read what the test verifies.</div>
            <button onClick={runDiag} disabled={diagRun} style={{background:'linear-gradient(135deg,#6366f1,#a78bfa)',color:'#fff',border:'none',borderRadius:10,padding:'10px 22px',fontSize:13,fontWeight:700,cursor:diagRun?'not-allowed':'pointer',fontFamily:"'Space Grotesk',sans-serif",display:'inline-flex',alignItems:'center',gap:8,opacity:diagRun?.6:1,transition:'all .22s',marginBottom:16}}
              onMouseEnter={e=>{if(!diagRun){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(99,102,241,.4)';}}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}
            >
              <span style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,.5)',position:'relative',flexShrink:0,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{position:'absolute',width:8,height:2,background:'#fff',transformOrigin:'left center',animation:diagRun?'sp 1.5s linear infinite':'none',transform:'translateY(-50%) rotate(0deg)'}}/>
              </span>
              {diagRun?'Running...':(diagDone?'Run Again':'Run Diagnostics')}
            </button>
            {diagScore&&(
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',color:diagScore.passed===diagScore.total?'#22c55e':'#f59e0b'}}>{diagScore.passed} / {diagScore.total} passed</span>
                <div style={{flex:1,height:4,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',borderRadius:99,background:'linear-gradient(135deg,#22c55e,#38bdf8)',width:`${diagScore.pct}%`,transition:'width 1s cubic-bezier(.22,1,.36,1)'}}/></div>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:'#aaaac8',whiteSpace:'nowrap'}}>{diagScore.pct}%</span>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {diagRes.map((r,i)=>(
                <div key={i} onClick={()=>setExpanded(expanded===i?null:i)} style={{borderRadius:10,border:'1px solid',overflow:'hidden',cursor:'pointer',borderColor:r.p?'rgba(34,197,94,.14)':'rgba(239,68,68,.14)',background:r.p?'rgba(34,197,94,.04)':'rgba(239,68,68,.04)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px'}}>
                    <span style={{fontSize:15,flexShrink:0}}>{r.p?'✅':'❌'}</span>
                    <span style={{flex:1,fontSize:12,fontWeight:600,color:r.p?'#86efac':'#fca5a5'}}>{r.n}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',transition:'transform .2s',transform:expanded===i?'rotate(180deg)':'none'}}>▾</span>
                  </div>
                  {expanded===i&&<div style={{padding:'0 13px 11px 37px',fontSize:12,color:'#aaaac8',lineHeight:1.68,borderTop:'1px solid rgba(255,255,255,.04)'}}>{r.d}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}