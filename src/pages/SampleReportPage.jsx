import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer.jsx';

const findings = [
  { label:'Test coverage',           value:'47 / 50 tests passing',              s:'warn', icon:'🧪' },
  { label:'Vulnerable dependencies', value:'1 package — lodash (moderate)',       s:'warn', icon:'📦' },
  { label:'Exposed secrets',         value:'None found in commit history',         s:'pass', icon:'🔒' },
  { label:'Endpoint safety',         value:'2 endpoints return raw error traces',  s:'warn', icon:'⚙️' },
  { label:'TDD detection',           value:'TDD patterns detected — 68% ratio ★', s:'pass', icon:'📊' },
];

function useCounter(target, dur, go) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!go) return;
    const s = performance.now();
    const tick = now => {
      const p=Math.min((now-s)/dur,1), e=1-Math.pow(1-p,3);
      setVal(Math.round(e*target));
      if(p<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [go, target, dur]);
  return val;
}

export default function SampleReportPage() {
  const navigate = useNavigate();
  const [vis, setVis]         = useState(false);
  const [findVis, setFindVis] = useState([]);
  const [ctrGo, setCtrGo]     = useState(false);
  const [barGo, setBarGo]     = useState(false);
  const ref = useRef(null);

  const score  = useCounter(72,  1600, ctrGo);
  const tests  = useCounter(47,  1200, ctrGo);
  const tdd    = useCounter(68,  1400, ctrGo);
  const health = useCounter(72,  1600, barGo);

  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (e[0].isIntersecting) {
        setVis(true);
        setTimeout(() => setCtrGo(true), 400);
        setTimeout(() => setBarGo(true), 500);
        findings.forEach((_,i) => setTimeout(() => setFindVis(p=>[...p,i]), 500+i*120));
        obs.disconnect();
      }
    },{ threshold:0.08 });
    if(ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  },[]);

  return (
    <div style={{ minHeight:'100vh', background:'#06060e', color:'#f0f0ff' }}>
      {/* Rich background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px)', backgroundSize:'52px 52px', maskImage:'radial-gradient(ellipse 100% 70% at 50% 0%,black,transparent)' }}/>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,.08),transparent 65%)', filter:'blur(130px)', top:-200, left:-150, animation:'orbf 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(180,83,9,.2),transparent 65%)', filter:'blur(120px)', top:'30%', right:'5%', animation:'orbf 22s ease-in-out infinite', animationDelay:'-5s' }}/>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.18),transparent 65%)', filter:'blur(120px)', bottom:'10%', left:'10%', animation:'orbf 18s ease-in-out infinite', animationDelay:'-10s' }}/>
      </div>

      {/* Navbar */}
      <nav style={{ position:'sticky', top:0, zIndex:300, background:'rgba(6,6,14,.88)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div className="rs-wrap" style={{ height:68, display:'flex', alignItems:'center' }}>
          <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <span style={{ width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#22c55e,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:'#06060e',boxShadow:'0 0 24px rgba(34,197,94,.35)' }}>&gt;_</span>
            <span style={{ fontSize:17,fontWeight:700,color:'#f0f0ff',letterSpacing:'-.025em' }}>RepoScope</span>
          </button>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>navigate('/#scan')} style={{ fontSize:13,color:'#aaaac8',background:'none',border:'none',cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",padding:'7px 13px',borderRadius:8,transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.color='#f0f0ff';e.currentTarget.style.background='rgba(255,255,255,.07)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#aaaac8';e.currentTarget.style.background='transparent';}}
            >Try RepoScope</button>
            <button onClick={()=>navigate('/')} style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',fontSize:13,fontWeight:700,padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",boxShadow:'0 4px 18px rgba(34,197,94,.3)',transition:'all .22s' }}
              onMouseEnter={e=>{e.currentTarget.style.opacity='.88';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';}}
            >← Back to Home</button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="rs-wrap" style={{ position:'relative', zIndex:1, paddingTop:56, paddingBottom:100 }}>
        <div ref={ref}>

          {/* Page header */}
          <div style={{ opacity:vis?1:0,transform:vis?'none':'translateY(20px)',transition:'all .6s cubic-bezier(.22,1,.36,1)',marginBottom:48 }}>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:14 }}>Sample Report</p>
            <h1 style={{ fontSize:'clamp(32px,4vw,52px)',fontWeight:800,letterSpacing:'-.05em',color:'#f0f0ff',marginBottom:16,lineHeight:1.08 }}>
              Read like a note from a{' '}
              <span style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>colleague</span>
            </h1>
            <p style={{ fontSize:15,color:'#aaaac8',maxWidth:580,lineHeight:1.78 }}>
              Every RepoScope report opens with a plain-English prose summary — written like a note from a senior engineer. Below is a real example from the <code style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:'#38bdf8',background:'rgba(56,189,248,.08)',padding:'2px 7px',borderRadius:4 }}>order-service</code> repository.
            </p>
          </div>

          {/* Animated stats row */}
          <div style={{ display:'flex',gap:24,marginBottom:48,flexWrap:'wrap',opacity:vis?1:0,transform:vis?'none':'translateY(16px)',transition:'all .6s .1s cubic-bezier(.22,1,.36,1)' }}>
            {[
              { n:ctrGo?score:0,  suffix:'',    label:'Health score',     c:'#22c55e' },
              { n:ctrGo?tests:0,  suffix:'/50', label:'Tests passing',    c:'#38bdf8' },
              { n:ctrGo?tdd:0,    suffix:'%',   label:'TDD ratio',        c:'#818cf8' },
              { n:5,              suffix:'',    label:'Checks run',       c:'#f59e0b', static:true },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:'20px 24px',flexShrink:0 }}>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:28,fontWeight:800,color:s.c,marginBottom:4 }}>{s.n}{s.suffix}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a',textTransform:'uppercase',letterSpacing:'.08em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Main report card */}
          <div style={{ background:'#0e0e1c',border:'1px solid rgba(255,255,255,.07)',borderRadius:22,overflow:'hidden',boxShadow:'0 40px 100px rgba(0,0,0,.5)',opacity:vis?1:0,transform:vis?'none':'translateY(24px)',transition:'all .7s .15s cubic-bezier(.22,1,.36,1)',position:'relative' }}>
            {/* Top gradient line */}
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(34,197,94,.6) 35%,rgba(56,189,248,.6) 65%,transparent)' }}/>

            {/* Card header */}
            <div style={{ padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,color:'#f0f0ff',marginBottom:4 }}>order-service</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a' }}>github.com/acme/order-service · scanned just now</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                {/* Animated health bar */}
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:100,height:6,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden' }}>
                    <div style={{ height:'100%',background:'linear-gradient(90deg,#22c55e,#38bdf8)',borderRadius:99,width:barGo?`${health}%`:'0%',transition:'width 1.8s cubic-bezier(.22,1,.36,1)' }}/>
                  </div>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:'#22c55e' }}>{health}/100</span>
                </div>
                <span style={{ background:'rgba(34,197,94,.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,.2)',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,padding:'4px 10px',borderRadius:6 }}>COMPLETE</span>
              </div>
            </div>

            {/* AI Summary */}
            <div style={{ padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,.07)',background:'rgba(34,197,94,.03)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.12em' }}>AI Summary</span>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:'rpp 2s ease-in-out infinite' }}/>
              </div>
              <p style={{ fontSize:14,color:'#f0f0ff',lineHeight:1.85,maxWidth:680 }}>
                Your test suite is in decent shape, but <strong style={{ color:'#f59e0b' }}>three of the failing tests point to the same checkout function</strong> — worth looking at first before anything else. The <strong style={{ color:'#f59e0b' }}>lodash version in use has a known fix available</strong> (CVE-2021-23337, moderate severity) and should be patched in your next release. Nothing in your git history looks like a leaked credential, which is a good sign. <strong style={{ color:'#22c55e' }}>Good TDD habits detected in 68% of your feature commits</strong> — your team is mostly writing tests before implementation, though there's room to close the remaining gap.
              </p>
            </div>

            {/* Findings */}
            <div style={{ padding:'8px 28px 24px' }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#44445a',textTransform:'uppercase',letterSpacing:'.14em',padding:'16px 0 8px' }}>All Findings</div>
              {findings.map((f,i)=>(
                <div key={f.label}
                  style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:i<findings.length-1?'1px solid rgba(255,255,255,.05)':'none',flexWrap:'wrap',opacity:findVis.includes(i)?1:0,transform:findVis.includes(i)?'none':'translateX(14px)',transition:`all .45s ${i*.05}s` }}
                >
                  <span style={{ fontSize:18,flexShrink:0 }}>{f.icon}</span>
                  <span style={{ fontSize:13,color:'#aaaac8',flex:'0 0 180px',minWidth:120 }}>{f.label}</span>
                  <span style={{ display:'flex',alignItems:'center',gap:8,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:'#f0f0ff',flex:1 }}>
                    <span style={{ width:7,height:7,borderRadius:'50%',background:f.s==='pass'?'#22c55e':'#f59e0b',flexShrink:0,display:'inline-block' }}/>{f.value}
                  </span>
                  <span style={{ padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",background:f.s==='pass'?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)',color:f.s==='pass'?'#22c55e':'#f59e0b',flexShrink:0 }}>{f.s==='pass'?'PASS':'WARN'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop:64,padding:'48px',background:'rgba(34,197,94,.04)',border:'1px solid rgba(34,197,94,.14)',borderRadius:22,textAlign:'center',opacity:vis?1:0,transform:vis?'none':'translateY(20px)',transition:'all .7s .3s cubic-bezier(.22,1,.36,1)' }}>
            <h2 style={{ fontSize:'clamp(24px,3.5vw,36px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f0ff',marginBottom:16 }}>
              Ready to scan your repository?
            </h2>
            <p style={{ fontSize:15,color:'#aaaac8',maxWidth:460,margin:'0 auto 28px',lineHeight:1.72 }}>
              Get a report like this for your own codebase in under 60 seconds. Paste your GitHub URL and we'll handle the rest.
            </p>
            <button onClick={()=>navigate('/')} style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',fontSize:15,fontWeight:700,padding:'14px 36px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",boxShadow:'0 4px 24px rgba(34,197,94,.4)',transition:'all .22s' }}
              onMouseEnter={e=>{e.currentTarget.style.opacity='.88';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 36px rgba(34,197,94,.5)';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 24px rgba(34,197,94,.4)';}}
            >Analyse My Repository ↗</button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}