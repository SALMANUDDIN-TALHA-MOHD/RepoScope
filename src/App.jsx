import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Checks from "./components/Checks.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import SampleReport from "./components/SampleReport.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-mist">
      <Navbar />
      <main>
        <Hero />
        <Checks />
        <HowItWorks />
        <SampleReport />
      </main>
      <Footer />
    </div>
  );
}
