import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Words with their gradient flag — each WORD is a non-breaking unit
const WORDS = [
  { t:'Understand', g:false },
  { t:'every',      g:false },
  { t:'dimension',  g:false },
  { t:'of',         g:false },
  { t:'your',       g:false },
  { t:'repository', g:true  },
];
// Total chars across all words (not counting spaces between)
const TOTAL_CHARS = WORDS.reduce((s, w) => s + w.t.length, 0);

const termLines = [
  { c:'#44445a', t:'$ reposcope analyse github.com/acme/checkout' },
  { c:'#44445a', t:'→ connecting to GitHub API...' },
  { c:'#818cf8', t:'→ stack: Node.js, Express, PostgreSQL' },
  { c:'#44445a', t:'→ fetching 247 commits...' },
  { c:'#22c55e', t:'→ TDD score: 78% — strong discipline' },
  { c:'#44445a', t:'→ auditing 48 dependencies...' },
  { c:'#f59e0b', t:'→ 1 CVE: lodash@4.17.15 (HIGH)' },
  { c:'#22c55e', t:'→ no secrets in commit history' },
  { c:'#38bdf8', t:'→ report ready — 2 findings' },
];

const atoms = [
  { bg:'rgba(34,197,94,.08)',   bd:'rgba(34,197,94,.2)',   c:'#22c55e', t:'📁 src/ 142 files' },
  { bg:'rgba(56,189,248,.08)',  bd:'rgba(56,189,248,.2)',  c:'#38bdf8', t:'🧪 tests/ 38 files' },
  { bg:'rgba(245,158,11,.08)',  bd:'rgba(245,158,11,.2)',  c:'#f59e0b', t:'📦 package.json' },
  { bg:'rgba(129,140,248,.08)', bd:'rgba(129,140,248,.2)', c:'#818cf8', t:'🔀 247 commits' },
  { bg:'rgba(244,114,182,.08)', bd:'rgba(244,114,182,.2)', c:'#f472b6', t:'⚙️ workflows' },
];

const finds = [
  { bg:'rgba(34,197,94,.1)',   bd:'rgba(34,197,94,.2)',   c:'#22c55e', t:'✓ TDD: 78%' },
  { bg:'rgba(245,158,11,.1)',  bd:'rgba(245,158,11,.2)',  c:'#f59e0b', t:'⚠ 1 CVE found' },
  { bg:'rgba(129,140,248,.1)', bd:'rgba(129,140,248,.2)', c:'#818cf8', t:'✓ no secrets' },
  { bg:'rgba(56,189,248,.1)',  bd:'rgba(56,189,248,.2)',  c:'#38bdf8', t:'✓ quality: good' },
];

const badges = [
  { c:'#22c55e', l:'TDD Detection' },
  { c:'#38bdf8', l:'Security Audit' },
  { c:'#f59e0b', l:'Dependency Scan' },
  { c:'#f472b6', l:'AI Summary' },
];

// A single word rendered char-by-char. Each word is wrapped in
// a span with white-space:nowrap so it NEVER breaks mid-word.
function AnimatedWord({ word, charOffset, visChars, isGrad }) {
  return (
    <span style={{ display:'inline-block', whiteSpace:'nowrap' }}>
      {word.split('').map((ch, ci) => {
        const globalIdx = charOffset + ci;
        const visible = globalIdx < visChars;
        return (
          <span key={ci} aria-hidden="true" style={{
            display: 'inline-block',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(16px) scale(.85)',
            transition: visible
              ? `opacity .2s ease, transform .25s cubic-bezier(.34,1.4,.64,1)`
              : 'none',
            ...(isGrad
              ? { background:'linear-gradient(135deg,#22c55e,#38bdf8 50%,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }
              : { color:'#f0f0ff' }),
          }}>{ch}</span>
        );
      })}
    </span>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const [repoUrl,  setRepoUrl]  = useState('');
  const [visChars, setVisChars] = useState(0);
  const [termIdx,  setTermIdx]  = useState(0);
  const [atomVis,  setAtomVis]  = useState([]);
  const [arrowVis, setArrowVis] = useState(false);
  const [findVis,  setFindVis]  = useState([]);
  const [inView,   setInView]   = useState(false);
  const [badgeVis, setBadgeVis] = useState([]);

  const secRef    = useRef(null);
  const timerRef  = useRef(null);
  const atomTimer = useRef(null);
  const charTimer = useRef(null);
  const loopTimer = useRef(null);

  const startCharLoop = useCallback(() => {
    clearTimeout(charTimer.current);
    clearTimeout(loopTimer.current);
    setVisChars(0);
    let idx = 0;
    const tick = () => {
      idx++;
      setVisChars(idx);
      if (idx < TOTAL_CHARS) {
        charTimer.current = setTimeout(tick, 40);
      } else {
        loopTimer.current = setTimeout(startCharLoop, 2800);
      }
    };
    charTimer.current = setTimeout(tick, 80);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setInView(true);
        startCharLoop();
        setBadgeVis([]);
        badges.forEach((_, i) =>
          setTimeout(() => setBadgeVis(p => [...p, i]), 1100 + i * 130)
        );
      } else {
        setInView(false);
        clearTimeout(charTimer.current);
        clearTimeout(loopTimer.current);
        clearTimeout(timerRef.current);
        clearTimeout(atomTimer.current);
        setVisChars(0);
        setTermIdx(0); setAtomVis([]); setArrowVis(false); setFindVis([]); setBadgeVis([]);
      }
    }, { threshold: 0.15 });
    if (secRef.current) obs.observe(secRef.current);
    return () => obs.disconnect();
  }, [startCharLoop]);

  // Terminal — only re-runs when inView becomes true
  useEffect(() => {
    if (!inView) { clearTimeout(timerRef.current); return; }
    // Reset terminal state immediately to avoid stale content flash
    setTermIdx(0);
    let idx = 0;
    const tick = () => {
      idx++;
      setTermIdx(idx);
      if (idx < termLines.length) timerRef.current = setTimeout(tick, 420);
    };
    timerRef.current = setTimeout(tick, 400);
    return () => clearTimeout(timerRef.current);
  }, [inView]);

  // Atoms + finds
  useEffect(() => {
    if (!inView) return;
    let dead = false;
    setAtomVis([]); setArrowVis(false); setFindVis([]);
    let i = 0;
    const next = () => {
      if (dead) return;
      if (i < atoms.length) {
        const ci = i; setAtomVis(p => [...p, ci]); i++;
        atomTimer.current = setTimeout(next, 190);
      } else {
        setTimeout(() => {
          if (dead) return;
          setArrowVis(true);
          let j = 0;
          const nf = () => { if (dead || j >= finds.length) return; const cj = j; setFindVis(p => [...p, cj]); j++; setTimeout(nf, 150); };
          setTimeout(nf, 260);
        }, 160);
      }
    };
    atomTimer.current = setTimeout(next, 750);
    return () => { dead = true; clearTimeout(atomTimer.current); };
  }, [inView]);

  // Build char offsets per word
  let charOffset = 0;
  const wordOffsets = WORDS.map(w => { const o = charOffset; charOffset += w.t.length; return o; });

  return (
    <section id="top" ref={secRef} style={{ padding:'88px 0 100px', borderBottom:'1px solid rgba(255,255,255,.07)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute',width:900,height:900,borderRadius:'50%',background:'radial-gradient(circle,rgba(34,197,94,.08),transparent 65%)',top:-350,left:-250,filter:'blur(130px)',pointerEvents:'none',animation:'orbf 20s ease-in-out infinite' }}/>
      <div style={{ position:'absolute',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,45,18,.2),transparent 65%)',top:'20%',right:'3%',filter:'blur(130px)',pointerEvents:'none',animation:'orbf 20s ease-in-out infinite',animationDelay:'-4s' }}/>

      <div className="rs-wrap">
        <div className="rs-hero-grid">

          {/* LEFT */}
          <div>
            {/* Headline — each word is nowrap so "dimension" can NEVER split */}
            <h1 aria-label="Understand every dimension of your repository"
              style={{ fontSize:'clamp(34px,4.2vw,56px)', fontWeight:800, lineHeight:1.14, letterSpacing:'-.04em', marginBottom:22 }}>
              {WORDS.map((w, wi) => (
                <span key={wi}>
                  <AnimatedWord
                    word={w.t}
                    charOffset={wordOffsets[wi]}
                    visChars={visChars}
                    isGrad={w.g}
                  />
                  {wi < WORDS.length - 1 && '\u00A0'}
                </span>
              ))}
            </h1>

            <p style={{ fontSize:15,color:'#aaaac8',lineHeight:1.78,maxWidth:480,marginBottom:28,opacity:0,animation:'fu .7s .9s forwards' }}>
              Paste a GitHub link. RepoScope analyses your commit history for TDD patterns, audits dependencies for vulnerabilities, detects security risks, and delivers every finding in clear, actionable English.
            </p>

            {/* Badges */}
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:32 }}>
              {badges.map((b, i) => (
                <span key={b.l} style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  border:`1px solid ${b.c}55`,background:`${b.c}14`,
                  padding:'7px 14px',borderRadius:99,
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:b.c,fontWeight:600,
                  boxShadow:badgeVis.includes(i)?`0 0 16px ${b.c}44,inset 0 0 8px ${b.c}11`:'none',
                  opacity:badgeVis.includes(i)?1:0,
                  transform:badgeVis.includes(i)?'scale(1) translateY(0)':'scale(.75) translateY(10px)',
                  transition:'all .45s cubic-bezier(.34,1.56,.64,1)',
                }}>
                  <span style={{ width:6,height:6,borderRadius:'50%',background:b.c,display:'inline-block',boxShadow:`0 0 7px ${b.c}` }}/>
                  {b.l}
                </span>
              ))}
            </div>

            <form id="scan" onSubmit={e => { e.preventDefault(); navigate('/scan'); }}
              className="rs-hero-form" style={{ display:'flex',gap:10,marginBottom:14,opacity:0,animation:'fu .6s 1.1s forwards' }}>
              <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                placeholder="github.com/your-org/your-repo"
                style={{ flex:1,minWidth:0,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'13px 16px',fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:'#f0f0ff',outline:'none',transition:'all .2s' }}
                onFocus={e => { e.target.style.borderColor='rgba(34,197,94,.5)'; e.target.style.boxShadow='0 0 0 3px rgba(34,197,94,.1)'; }}
                onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,.08)'; e.target.style.boxShadow='none'; }}
              />
              <button type="submit"
                style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',fontSize:14,fontWeight:700,padding:'13px 28px',borderRadius:9,border:'none',cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(34,197,94,.35)',transition:'all .22s',flexShrink:0,fontFamily:"'Space Grotesk',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(34,197,94,.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(34,197,94,.35)'; }}
              >Analyse ↗</button>
            </form>

            <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a',opacity:0,animation:'fu .6s 1.2s forwards' }}>
              works with public repositories &nbsp;·&nbsp; no installation required
            </p>
          </div>

          {/* RIGHT — Terminal, no fixed height so never clips */}
          <div style={{ opacity:0,animation:'fu .8s .3s forwards' }}>
            <div style={{ background:'#08080f',border:'1px solid rgba(255,255,255,.1)',borderRadius:18,overflow:'hidden',boxShadow:'0 40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06)' }}>
              {/* Title bar */}
              <div style={{ background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'13px 16px',display:'flex',alignItems:'center',gap:7 }}>
                <span style={{ width:10,height:10,borderRadius:'50%',background:'#ef4444',display:'inline-block' }}/>
                <span style={{ width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block' }}/>
                <span style={{ width:10,height:10,borderRadius:'50%',background:'#22c55e',display:'inline-block' }}/>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#33334a',marginLeft:8 }}>reposcope — analysis session</span>
              </div>

              {/* Terminal body — lines appear one by one, no fixed height */}
              <div style={{ padding:18,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,lineHeight:1.9,minHeight:190 }}>
                {termLines.map((l, i) => (
                  <div key={`${inView}-${i}`} style={{
                    color:l.c,
                    opacity: i < termIdx ? 1 : 0,
                    transform: i < termIdx ? 'translateX(0)' : 'translateX(-10px)',
                    transition: i < termIdx ? 'opacity .3s ease, transform .3s ease' : 'none',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>{l.t}</div>
                ))}
              </div>

              {/* Decompose section */}
              <div style={{ padding:'12px 18px 16px',borderTop:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.02)' }}>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#33334a',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:8 }}>Repository decomposed into</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginBottom:8,minHeight:26 }}>
                  {atoms.map((a,i) => (
                    <span key={i} style={{ display:'inline-flex',alignItems:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:'3px 8px',borderRadius:5,border:`1px solid ${a.bd}`,background:a.bg,color:a.c,opacity:atomVis.includes(i)?1:0,transform:atomVis.includes(i)?'none':'translateY(6px) scale(.92)',transition:'all .4s cubic-bezier(.34,1.56,.64,1)',whiteSpace:'nowrap' }}>{a.t}</span>
                  ))}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#33334a',marginBottom:7,opacity:arrowVis?1:0,transition:'opacity .4s' }}>↓ &nbsp;running analysis pipeline...</div>
                <div style={{ display:'flex',gap:5,flexWrap:'wrap',minHeight:24 }}>
                  {finds.map((f,i) => (
                    <span key={i} style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:'3px 8px',borderRadius:5,border:`1px solid ${f.bd}`,background:f.bg,color:f.c,opacity:findVis.includes(i)?1:0,transform:findVis.includes(i)?'scale(1)':'scale(.88)',transition:'all .35s cubic-bezier(.34,1.56,.64,1)',whiteSpace:'nowrap' }}>{f.t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .rs-hero-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:56px;align-items:center}
        @media(max-width:1024px){.rs-hero-grid{grid-template-columns:1fr;gap:40px}}
        @media(max-width:640px){.rs-hero-form{flex-direction:column!important}.rs-hero-form button{width:100%!important}}
        @media(max-width:768px){section[id="top"]{padding:48px 0 56px!important}}
      `}</style>
    </section>
  );
}