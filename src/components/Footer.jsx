export default function Footer() {
  const year = new Date().getFullYear();

  const Lnk = ({ label, href = '#', scroll = false }) => (
    <button
      onClick={() => {
        if (scroll && href.startsWith('#')) {
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else if (href !== '#') {
          window.open(href, '_blank');
        }
      }}
      style={{ fontSize:13, color:'#aaaac8', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0, transition:'color .2s', display:'block', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}
      onMouseEnter={e => e.currentTarget.style.color = '#f0f0ff'}
      onMouseLeave={e => e.currentTarget.style.color = '#aaaac8'}
    >{label}</button>
  );

  const Col = ({ title, children }) => (
    <div>
      <p style={{ fontSize:11,fontWeight:700,color:'#f0f0ff',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:16,fontFamily:"'IBM Plex Mono',monospace" }}>{title}</p>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>{children}</div>
    </div>
  );

  // Social icon button
  const Social = ({ href, title, children }) => (
    <a href={href} target="_blank" rel="noreferrer" title={title}
      style={{ width:34,height:34,borderRadius:8,background:'#12121e',border:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .2s',textDecoration:'none' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.18)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.background='rgba(255,255,255,.08)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.transform='none'; e.currentTarget.style.background='#12121e'; }}
    >{children}</a>
  );

  return (
    <footer style={{ borderTop:'1px solid rgba(255,255,255,.07)', background:'#0e0e1c' }}>
      <div className="rs-wrap">
        <div style={{ paddingTop:56,paddingBottom:44,borderBottom:'1px solid rgba(255,255,255,.07)' }}>
          <div className="rs-ft-grid">

            {/* Brand */}
            <div className="rs-ft-brand">
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                <span style={{ width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#22c55e,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:600,color:'#06060e',flexShrink:0 }}>&gt;_</span>
                <span style={{ fontSize:17,fontWeight:700,color:'#f0f0ff',letterSpacing:'-.025em' }}>RepoScope</span>
              </div>
              <p style={{ fontSize:13,color:'#aaaac8',lineHeight:1.7,maxWidth:240,marginBottom:22 }}>
                Understand every dimension of your repository. TDD, coverage, dependencies, security, and AI insights in one place.
              </p>
              {/* Social icons — GitHub, LinkedIn, Portfolio */}
              <div style={{ display:'flex',gap:8 }}>
                <Social href="https://github.com/SALMANUDDIN-TALHA-MOHD/RepoScope" title="GitHub Repository">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaaac8"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                </Social>
                <Social href="https://linkedin.com" title="LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaaac8"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </Social>
                <Social href="https://yourportfolio.com" title="Portfolio">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaaac8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                </Social>
              </div>
            </div>

            <Col title="Product">
              <Lnk label="How It Works"   href="#how-it-works" scroll />
              <Lnk label="What It Checks" href="#checks"       scroll />
              <Lnk label="Sample Report"  href="#sample"       scroll />
              <Lnk label="Changelog" />
            </Col>

            <Col title="Resources">
              <Lnk label="Documentation" />
              <Lnk label="API Reference" />
              <Lnk label="Blog" />
              <Lnk label="Status" />
            </Col>

            <Col title="Company">
              <Lnk label="About" />
              <Lnk label="Contact"        href="#community" scroll />
              <Lnk label="Privacy Policy" />
              <Lnk label="Terms of Service" />
            </Col>
          </div>
        </div>
      </div>

      <div className="rs-wrap">
        <div style={{ paddingTop:20,paddingBottom:20 }}>
          <div className="rs-ft-bot">
            <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#44445a' }}>© {year} RepoScope. All rights reserved.</span>
            <div style={{ display:'flex',gap:18 }}>
              {['Privacy','Terms','Cookies'].map(l=>(
                <button key={l} style={{ fontSize:12,color:'#44445a',background:'none',border:'none',cursor:'pointer',transition:'color .2s',fontFamily:"'Space Grotesk',sans-serif" }}
                  onMouseEnter={e=>e.currentTarget.style.color='#aaaac8'}
                  onMouseLeave={e=>e.currentTarget.style.color='#44445a'}
                >{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .rs-ft-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;align-items:start}
        .rs-ft-bot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        @media(max-width:1024px){.rs-ft-grid{grid-template-columns:1fr 1fr;gap:32px}.rs-ft-brand{grid-column:1/-1;margin-bottom:8px}}
        @media(max-width:480px){.rs-ft-grid{grid-template-columns:1fr 1fr;gap:24px}.rs-ft-bot{flex-direction:column;align-items:flex-start;gap:8px}}
      `}</style>
    </footer>
  );
}