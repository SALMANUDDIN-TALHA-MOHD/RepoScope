import { useState, useEffect, useRef } from 'react';

const reviews = [
  { av:'AK', g:'linear-gradient(135deg,#22c55e,#38bdf8)', name:'Arjun Kumar',    role:'Senior Engineer · ThoughtWorks', txt:'"RepoScope caught a TDD gap in our checkout service that internal reviews missed for months. The commit-level evidence made it immediately actionable."' },
  { av:'SR', g:'linear-gradient(135deg,#6366f1,#a78bfa)',  name:'Sofia Rodriguez', role:'Tech Lead · Red Hat',             txt:'"The dependency audit flagged a critical CVE we had in production. The plain-English explanation meant the whole team understood, not just the security lead."' },
  { av:'ML', g:'linear-gradient(135deg,#92400e,#d97706,#fbbf24)', name:'Marcus Lee', role:'Eng Manager · placeholder review', txt:'"Finally a tool that analyses the whole repository, not just the latest PR. The TDD score gave our team a concrete metric to improve each sprint."', fake:true },
];

const inp = {
  width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)',
  borderRadius:9, padding:'11px 14px', fontSize:13, color:'#f0f0ff',
  fontFamily:"'Space Grotesk',sans-serif", outline:'none', marginBottom:10,
  transition:'border-color .2s', WebkitAppearance:'none',
};

export default function Community() {
  const [vis, setVis]       = useState(false);
  const [revVis, setRevVis] = useState([]);

  // Review form
  const [stars, setStars]   = useState(0);
  const [hover, setHover]   = useState(0);
  const [revName, setRevName] = useState('');
  const [revRole, setRevRole] = useState('');
  const [revText, setRevText] = useState('');
  const [revOk, setRevOk]   = useState(false);

  // Contact form
  const [cName, setCName]   = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cSubj, setCSubj]   = useState('');
  const [cMsg, setCMsg]     = useState('');
  const [conOk, setConOk]   = useState(false);

  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (e[0].isIntersecting) {
        setVis(true);
        reviews.forEach((_, i) => setTimeout(() => setRevVis(p => [...p, i]), 300 + i * 100));
        obs.disconnect();
      }
    }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Reset stars every time section scrolls out of view
  useEffect(() => {
    const obs = new IntersectionObserver(e => {
      if (!e[0].isIntersecting) {
        setStars(0); setHover(0);
      }
    }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  function submitRev(e) {
    e.preventDefault();
    if (!stars || !revName.trim() || !revText.trim()) return;
    setRevOk(true); setStars(0); setRevName(''); setRevRole(''); setRevText('');
  }

  function submitCon(e) {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cMsg.trim()) return;
    setConOk(true); setCName(''); setCEmail(''); setCSubj(''); setCMsg('');
  }

  return (
    <section id="community" ref={ref} style={{ padding:'88px 0', borderBottom:'1px solid rgba(255,255,255,.07)', position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(146,64,14,.05) 0%,transparent 50%,rgba(99,102,241,.03) 100%)' }}>
      <div className="rs-wrap" style={{ position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ opacity:vis?1:0, transform:vis?'none':'translateY(20px)', transition:'all .6s cubic-bezier(.22,1,.36,1)', marginBottom:48 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#22c55e',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:14 }}>Community</p>
          <h2 style={{ fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f0ff',marginBottom:16,lineHeight:1.1 }}>
            Feedback &amp;{' '}
            <span style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>get in touch</span>
          </h2>
          <p style={{ fontSize:15,color:'#aaaac8',maxWidth:520,lineHeight:1.75 }}>Share your experience or reach out with questions, feedback, or partnership enquiries.</p>
        </div>

        {/* Forms: Get in touch LEFT, Share review RIGHT */}
        <div className="rs-cr-row" style={{ marginBottom:52 }}>

          {/* LEFT — Get in touch */}
          <div style={{ background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.18)',borderRadius:22,padding:28,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',opacity:vis?1:0,transform:vis?'none':'translateY(24px)',transition:'all .6s .1s cubic-bezier(.22,1,.36,1)' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#38bdf8,#818cf8)' }}/>
            <h3 style={{ fontSize:18,fontWeight:700,color:'#f0f0ff',marginBottom:8 }}>Get in touch</h3>
            <p style={{ fontSize:13,color:'#aaaac8',lineHeight:1.65,marginBottom:20 }}>Questions about RepoScope, partnership enquiries, or feedback? We read every message and respond within 24 hours.</p>
            <form onSubmit={submitCon} style={{ flex:1,display:'flex',flexDirection:'column' }}>
              <input value={cName}  onChange={e=>setCName(e.target.value)}  placeholder="Your name"     style={inp} onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              <input value={cEmail} onChange={e=>setCEmail(e.target.value)} placeholder="Email address" type="email" style={inp} onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              <input value={cSubj}  onChange={e=>setCSubj(e.target.value)}  placeholder="Subject"       style={inp} onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              <textarea value={cMsg} onChange={e=>setCMsg(e.target.value)} rows={4} placeholder="Your message..." style={{ ...inp,resize:'none',minHeight:88,flex:1 }} onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              <button type="submit" style={{ background:'linear-gradient(135deg,#6366f1,#a78bfa)',color:'#fff',fontWeight:700,fontSize:13,padding:'11px 22px',borderRadius:9,border:'none',cursor:'pointer',alignSelf:'flex-start',transition:'all .2s',marginTop:4,fontFamily:"'Space Grotesk',sans-serif" }}
                onMouseEnter={e=>{ e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}
              >Send Message</button>
              {conOk && <div style={{ marginTop:12,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#a5b4fc' }}>Message received. We will be in touch shortly.</div>}
            </form>
          </div>

          {/* RIGHT — Share review */}
          <div style={{ background:'rgba(34,197,94,.04)',border:'1px solid rgba(34,197,94,.14)',borderRadius:22,padding:28,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',opacity:vis?1:0,transform:vis?'none':'translateY(24px)',transition:'all .6s .2s cubic-bezier(.22,1,.36,1)' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(135deg,#22c55e,#38bdf8)' }}/>
            <h3 style={{ fontSize:18,fontWeight:700,color:'#f0f0ff',marginBottom:8 }}>Share your experience</h3>
            <p style={{ fontSize:13,color:'#aaaac8',lineHeight:1.65,marginBottom:20 }}>Tried RepoScope on your repository? Your feedback helps the community and shapes what we build next.</p>
            <form onSubmit={submitRev} style={{ flex:1,display:'flex',flexDirection:'column' }}>
              <div style={{ display:'flex',gap:6,marginBottom:16 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={()=>setStars(n)} onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
                    style={{ fontSize:26,cursor:'pointer',opacity:(hover||stars)>=n?1:.18,filter:(hover||stars)>=n?'none':'grayscale(1)',transform:(hover||stars)>=n?'scale(1.2)':'scale(1)',transition:'all .15s',display:'inline-block',WebkitTapHighlightColor:'transparent' }}>⭐</span>
                ))}
              </div>
              <div className="rs-fi-row" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <input value={revName} onChange={e=>setRevName(e.target.value)} placeholder="Your name"       style={inp} onFocus={e=>e.target.style.borderColor='rgba(34,197,94,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
                <input value={revRole} onChange={e=>setRevRole(e.target.value)} placeholder="Role at Company" style={inp} onFocus={e=>e.target.style.borderColor='rgba(34,197,94,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              </div>
              <textarea value={revText} onChange={e=>setRevText(e.target.value)} rows={4} placeholder="Tell us about your experience..." style={{ ...inp,resize:'none',minHeight:88,marginTop:10 }} onFocus={e=>e.target.style.borderColor='rgba(34,197,94,.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.07)'}/>
              <button type="submit" style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)',color:'#06060e',fontWeight:700,fontSize:13,padding:'11px 22px',borderRadius:9,border:'none',cursor:'pointer',alignSelf:'flex-start',transition:'all .2s',marginTop:4,fontFamily:"'Space Grotesk',sans-serif" }}
                onMouseEnter={e=>{ e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}
              >Submit Review</button>
              {revOk && <div style={{ marginTop:12,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#22c55e' }}>Thank you. Your review has been saved.</div>}
            </form>
          </div>
        </div>

        {/* Review cards */}
        <h3 style={{ fontSize:20,fontWeight:700,color:'#f0f0ff',marginBottom:20,opacity:vis?1:0,transition:'all .6s .3s' }}>From the community</h3>
        <div className="rs-rev-grid">
          {reviews.map((r,i)=>(
            <div key={r.name}
              style={{ background:'#0e0e1c',border:'1px solid rgba(255,255,255,.07)',borderRadius:18,padding:22,opacity:revVis.includes(i)?1:0,transform:revVis.includes(i)?'none':'translateY(20px)',transition:`all .5s ${i*.08}s cubic-bezier(.22,1,.36,1)` }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.14)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(0,0,0,.25)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              <div style={{ display:'flex',gap:3,marginBottom:12 }}>{[1,2,3,4,5].map(s=><span key={s} style={{ fontSize:14 }}>⭐</span>)}</div>
              <p style={{ fontSize:13,color:'#aaaac8',lineHeight:1.7,marginBottom:18,fontStyle:'italic' }}>{r.txt}</p>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:'50%',background:r.g,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0 }}>{r.av}</div>
                <div>
                  <div style={{ fontSize:14,fontWeight:600,color:'#f0f0ff' }}>{r.name}</div>
                  <div style={{ fontSize:11,color:'#44445a',fontFamily:"'IBM Plex Mono',monospace",marginTop:2 }}>{r.role}{r.fake?' · placeholder review':''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .rs-cr-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch}
        .rs-rev-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        @media(max-width:1024px){.rs-cr-row{grid-template-columns:1fr;gap:16px}.rs-rev-grid{grid-template-columns:repeat(2,1fr);gap:12px}}
        @media(max-width:560px){.rs-rev-grid{grid-template-columns:1fr;gap:12px}.rs-fi-row{grid-template-columns:1fr!important}}
        @media(max-width:768px){#community{padding:56px 0!important}}
        @media(max-width:480px){#community{padding:48px 0!important}}
      `}</style>
    </section>
  );
}