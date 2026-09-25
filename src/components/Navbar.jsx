import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const links = [
  { label:'How It Works',   href:'#how-it-works' },
  { label:'What It Checks', href:'#checks' },
  { label:'Sample Report',  href:'/sample', page:true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header style={{
        position:'sticky', top:0, zIndex:300,
        background:'rgba(6,6,14,.88)',
        backdropFilter:'blur(32px) saturate(180%)',
        WebkitBackdropFilter:'blur(32px) saturate(180%)',
        borderBottom:'1px solid rgba(255,255,255,.07)',
        width:'100%',
      }}>
        <div className="rs-wrap" style={{ height:68, display:'flex', alignItems:'center', gap:6 }}>
          {/* Logo */}
          <button onClick={() => { navigate('/'); setOpen(false); }}
            style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <span style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#22c55e,#38bdf8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:'#06060e', boxShadow:'0 0 24px rgba(34,197,94,.35)', flexShrink:0 }}>&gt;_</span>
            <span style={{ fontSize:17, fontWeight:700, color:'#f0f0ff', letterSpacing:'-.025em' }}>RepoScope</span>
          </button>

          {/* Desktop links */}
          <nav className="rs-nav-links" style={{ display:'flex', gap:2, marginLeft:20 }}>
            {links.map(l => (
              <a key={l.href} href={l.page ? undefined : l.href} onClick={l.page ? () => navigate(l.href) : undefined}
                style={{ fontSize:13, color:'#aaaac8', padding:'7px 13px', borderRadius:8, textDecoration:'none', transition:'all .2s', whiteSpace:'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.color='#f0f0ff'; e.currentTarget.style.background='rgba(255,255,255,.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.color='#aaaac8'; e.currentTarget.style.background='transparent'; }}
              >{l.label}</a>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="rs-nav-right" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
            <button style={{ fontSize:13, color:'#aaaac8', background:'none', border:'none', cursor:'pointer', padding:'7px 10px', transition:'color .2s', fontFamily:"'Space Grotesk',sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.color='#f0f0ff'}
              onMouseLeave={e => e.currentTarget.style.color='#aaaac8'}
            >Sign In</button>
            <a href="#scan" style={{ background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', fontSize:13, fontWeight:700, padding:'8px 18px', borderRadius:8, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 4px 18px rgba(34,197,94,.3)', transition:'all .22s', display:'inline-block', fontFamily:"'Space Grotesk',sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(34,197,94,.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 18px rgba(34,197,94,.3)'; }}
            >Scan a repository</a>
          </div>

          {/* Hamburger */}
          <button className="rs-ham" onClick={() => setOpen(v => !v)}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', padding:6, lineHeight:0, display:'none' }} aria-label="Menu">
            {open
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0f0ff" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaaac8" strokeWidth="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></svg>}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', background:'rgba(6,6,14,.97)' }}>
            <div className="rs-wrap" style={{ paddingTop:16, paddingBottom:20, display:'flex', flexDirection:'column', gap:4 }}>
              {links.map(l => (
                <a key={l.href} href={l.page ? undefined : l.href} onClick={l.page ? () => navigate(l.href) : undefined} onClick={() => setOpen(false)}
                  style={{ display:'block', padding:'10px 0', fontSize:15, color:'#aaaac8', textDecoration:'none', borderBottom:'1px solid rgba(255,255,255,.04)', transition:'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f0f0ff'}
                  onMouseLeave={e => e.currentTarget.style.color='#aaaac8'}
                >{l.label}</a>
              ))}
              <a href="#scan" onClick={() => setOpen(false)} style={{ marginTop:14, display:'block', textAlign:'center', background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', fontWeight:700, fontSize:14, padding:13, borderRadius:10, textDecoration:'none', fontFamily:"'Space Grotesk',sans-serif" }}>
                Scan a repository
              </a>
            </div>
          </div>
        )}
      </header>

      <style>{`
        .rs-nav-links,.rs-nav-right{display:flex}
        .rs-ham{display:none!important}
        @media(max-width:768px){
          .rs-nav-links,.rs-nav-right{display:none!important}
          .rs-ham{display:flex!important}
        }
      `}</style>
    </>
  );
}