import { useState, useEffect, useRef } from 'react';

const cards = [
  { icon:'🧪', name:'TDD Detection',    desc:'Analyses commit history chronologically to detect test-first patterns using both message keywords and directory structure.',   tag:'Live Now', live:true,  accent:'34,197,94',   glow:'rgba(34,197,94,.15)' },
  { icon:'📋', name:'Test Coverage',    desc:'AST-based analysis that maps test functions to source functions. Identifies exactly which branches and paths are untested.',   tag:'Upcoming', live:false, accent:'56,189,248',  glow:'rgba(56,189,248,.12)' },
  { icon:'📦', name:'Dependency Audit', desc:'Audits every declared package against the NVD database. Flags CVEs with severity scores and available fix versions.',         tag:'Upcoming', live:false, accent:'245,158,11', glow:'rgba(245,158,11,.12)' },
  { icon:'⚙️', name:'Code Quality',    desc:'Measures cyclomatic complexity, detects code smells, and identifies duplicate blocks across all source files.',                tag:'Upcoming', live:false, accent:'129,140,248', glow:'rgba(129,140,248,.12)' },
  { icon:'🔒', name:'Security Scan',    desc:'OWASP Top 10 pattern matching, exposed credential detection, and secret scanning across all committed files.',                 tag:'Upcoming', live:false, accent:'239,68,68',   glow:'rgba(239,68,68,.12)' },
  { icon:'✨', name:'AI Summary',       desc:'Gemini synthesises every finding into a plain-English report with prioritised recommendations your whole team can act on.',   tag:'Upcoming', live:false, accent:'244,114,182', glow:'rgba(244,114,182,.12)' },
];

export default function Checks() {
  const [vis, setVis] = useState([]);
  const [hdr, setHdr] = useState(false);
  const [hov, setHov] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (e[0].isIntersecting) {
        setHdr(true);
        cards.forEach((_, i) => setTimeout(() => setVis(p => [...p, i]), i * 90));
        obs.disconnect();
      }
    }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="checks" ref={ref} style={{ padding:'88px 0', borderBottom:'1px solid rgba(255,255,255,.07)', position:'relative', overflow:'hidden', background:'linear-gradient(180deg,transparent,rgba(124,45,18,.05) 50%,transparent)' }}>
      <div style={{ position:'absolute',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(129,140,248,.07),transparent 70%)',top:-80,right:'8%',filter:'blur(60px)',pointerEvents:'none' }}/>

      <div className="rs-wrap" style={{ position:'relative',zIndex:1 }}>
        <div style={{ opacity:hdr?1:0,transform:hdr?'none':'translateY(20px)',transition:'all .6s cubic-bezier(.22,1,.36,1)',marginBottom:48 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:14 }}>What RepoScope Checks</p>
          <h2 style={{ fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f0ff',marginBottom:16,lineHeight:1.1 }}>
            Six layers of{' '}
            <span style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>repository intelligence</span>
          </h2>
          <p style={{ fontSize:15,color:'#aaaac8',maxWidth:540,lineHeight:1.75 }}>Every scan runs a complete analysis pipeline across your commit history, source structure, dependencies, and security surface.</p>
        </div>

        <div className="rs-checks-grid">
          {cards.map((c, i) => {
            const isHov = hov === i;
            return (
              <div key={c.name}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
                style={{
                  // Glass morphism base
                  background: isHov
                    ? `linear-gradient(135deg,rgba(${c.accent},.12) 0%,rgba(255,255,255,.06) 100%)`
                    : 'linear-gradient(135deg,rgba(255,255,255,.06) 0%,rgba(255,255,255,.02) 100%)',
                  backdropFilter:'blur(24px)',
                  WebkitBackdropFilter:'blur(24px)',
                  border:`1px solid ${isHov ? `rgba(${c.accent},.4)` : 'rgba(255,255,255,.1)'}`,
                  borderRadius:20,
                  padding:'26px 22px',
                  position:'relative',
                  overflow:'hidden',
                  cursor:'default',
                  opacity: vis.includes(i) ? 1 : 0,
                  transform: vis.includes(i)
                    ? isHov ? 'translateY(-6px) scale(1.02)' : 'none'
                    : 'translateY(28px) scale(.97)',
                  transition:`opacity .55s ${i*.08}s, transform .4s cubic-bezier(.22,1,.36,1), border-color .25s, background .25s`,
                  boxShadow: isHov
                    ? `0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(${c.accent},.2), inset 0 1px 0 rgba(255,255,255,.12)`
                    : 'inset 0 1px 0 rgba(255,255,255,.06)',
                }}
              >
                {/* Glass shine overlay */}
                <div style={{ position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,.06),transparent)',pointerEvents:'none',borderRadius:'20px 20px 0 0' }}/>
                {/* Accent glow bottom */}
                {isHov && <div style={{ position:'absolute',bottom:0,left:0,right:0,height:80,background:`linear-gradient(0deg,${c.glow},transparent)`,pointerEvents:'none' }}/>}

                <div style={{ position:'relative',zIndex:1 }}>
                  <div style={{ width:48,height:48,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:18,background:`rgba(${c.accent},.12)`,border:`1px solid rgba(${c.accent},.25)`,boxShadow:isHov?`0 0 20px rgba(${c.accent},.3)`:undefined,transition:'all .3s',transform:isHov?'scale(1.1) rotate(-4deg)':'none' }}>{c.icon}</div>
                  <div style={{ fontSize:15,fontWeight:700,color:isHov?`rgb(${c.accent})`:'#f0f0ff',marginBottom:10,transition:'color .2s' }}>{c.name}</div>
                  <div style={{ fontSize:13,color:'#aaaac8',lineHeight:1.65,marginBottom:14 }}>{c.desc}</div>
                  <span style={{ display:'inline-block',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,padding:'3px 10px',borderRadius:6,background:c.live?'rgba(34,197,94,.12)':'rgba(129,140,248,.1)',color:c.live?'#22c55e':'#818cf8',border:c.live?'1px solid rgba(34,197,94,.2)':undefined }}>{c.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .rs-checks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media(max-width:1024px){.rs-checks-grid{grid-template-columns:repeat(2,1fr);gap:14px}}
        @media(max-width:520px){.rs-checks-grid{grid-template-columns:1fr;gap:12px}}
        @media(max-width:768px){#checks{padding:56px 0!important}}
        @media(max-width:480px){#checks{padding:48px 0!important}}
      `}</style>
    </section>
  );
}