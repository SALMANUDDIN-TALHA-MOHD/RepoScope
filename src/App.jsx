import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar          from './components/Navbar.jsx';
import Hero            from './components/Hero.jsx';
import Checks          from './components/Checks.jsx';
import HowItWorks      from './components/HowItWorks.jsx';
import SampleReport    from './components/SampleReport.jsx';
import Community       from './components/Community.jsx';
import Footer          from './components/Footer.jsx';
import ScanResult      from './pages/ScanResult.jsx';
import SampleReportPage from './pages/SampleReportPage.jsx';

function HomePage() {
  return (
    <div style={{ minHeight:'100vh', background:'#06060e', color:'#f0f0ff', position:'relative' }}>
      {/* Fixed background — richer gradient with brown + purple */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        {/* Grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px)', backgroundSize:'52px 52px', maskImage:'radial-gradient(ellipse 100% 70% at 50% 0%,black,transparent)' }}/>
        {/* Orbs — green top-left, cyan bottom-right, AMBER/BROWN mid-right, PURPLE bottom-left */}
        <div style={{ position:'absolute', width:900, height:900, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,.09),transparent 65%)', filter:'blur(130px)', top:-350, left:-250, animation:'orbf 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,.06),transparent 65%)', filter:'blur(130px)', bottom:-250, right:-200, animation:'orbf 20s ease-in-out infinite', animationDelay:'-8s' }}/>
        {/* BROWN/AMBER — warm pop mid right */}
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(180,83,9,.28),transparent 65%)', filter:'blur(120px)', top:'20%', right:'5%', animation:'orbf 22s ease-in-out infinite', animationDelay:'-4s' }}/>
        {/* PURPLE — bottom left */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.22),transparent 65%)', filter:'blur(120px)', bottom:'5%', left:'8%', animation:'orbf 18s ease-in-out infinite', animationDelay:'-12s' }}/>
        {/* Extra PURPLE top right */}
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.15),transparent 65%)', filter:'blur(130px)', top:'5%', right:'25%', animation:'orbf 25s ease-in-out infinite', animationDelay:'-6s' }}/>
        {/* Extra BROWN lower */}
        <div style={{ position:'absolute', width:450, height:450, borderRadius:'50%', background:'radial-gradient(circle,rgba(146,64,14,.2),transparent 65%)', filter:'blur(120px)', bottom:'30%', left:'30%', animation:'orbf 20s ease-in-out infinite', animationDelay:'-16s' }}/>
      </div>

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Navbar always visible — sticky top:0 in its own component */}
        <Navbar />
        <main>
          <Hero />
          <Checks />
          <HowItWorks />
          <SampleReport />
          <Community />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<HomePage />} />
        <Route path="/scan"   element={<ScanResult />} />
        <Route path="/sample" element={<SampleReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}