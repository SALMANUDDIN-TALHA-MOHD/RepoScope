import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Shield, GitBranch, Zap } from "lucide-react";
import ScanConsole from "./ScanConsole.jsx";

const badges = [
  { icon: Shield, label: "Security scan" },
  { icon: GitBranch, label: "TDD detection" },
  { icon: Zap, label: "AI summary" },
];

export default function Hero() {
  const [repoUrl, setRepoUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (repoUrl.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  }

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-ink-border"
    >
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-signal-pass/5 via-ink to-ink" />
      {/* Grid texture */}
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-40" />
      {/* Radial glow top-left */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-signal-pass/8 blur-3xl" />
      {/* Radial glow bottom-right */}
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-signal-warn/6 blur-3xl" />

      <div className="relative mx-auto grid max-w-content gap-16 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">

        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-signal-pass/30 bg-signal-pass/10 px-3 py-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-signal-pass animate-pulse" />
            <span className="font-mono text-xs text-signal-pass">
              for repositories, not just pull requests
            </span>
          </motion.div>

          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Know what&apos;s actually wrong with your{" "}
            <span className="bg-gradient-to-r from-signal-pass to-cyan-400 bg-clip-text text-transparent">
              repository
            </span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mist-muted">
            Paste a GitHub link. RepoScope runs the project's tests, checks its
            dependencies and endpoints for security gaps, detects TDD patterns
            in your commit history, and explains everything in plain English.
          </p>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {badges.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-border bg-ink-soft px-3 py-1.5 font-mono text-xs text-mist-muted"
              >
                <Icon size={11} className="text-signal-pass" />
                {label}
              </span>
            ))}
          </motion.div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            id="scan"
          >
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/your-org/your-repo"
              className="w-full rounded-md border border-ink-border bg-ink-soft px-4 py-3 font-mono text-sm text-mist placeholder:text-mist-faint focus:border-signal-pass/60 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-gradient-to-r from-signal-pass to-cyan-400 px-5 py-3 text-sm font-medium text-ink transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-signal-pass/20"
            >
              {submitted ? "Queued ✓" : "Run a scan"}
              {!submitted && <ArrowUpRight size={15} />}
            </button>
          </form>
          <p className="mt-3 font-mono text-xs text-mist-faint">
            works with public repositories &middot; no install required &middot; backend connects in week 4
          </p>
        </motion.div>

        {/* Right column — ScanConsole */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="flex justify-center md:justify-end"
        >
          <ScanConsole />
        </motion.div>
      </div>
    </section>
  );
}
