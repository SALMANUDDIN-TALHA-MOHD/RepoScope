import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle } from "lucide-react";

const checks = [
  {
    id: "01",
    name: "Unit test run",
    detail:
      "Detects the project's test framework and runs the existing suite, so you see what already fails before you touch anything.",
    status: "pass",
    statusLabel: "runs automatically",
  },
  {
    id: "02",
    name: "API & automation checks",
    detail:
      "Sends real requests to the app's endpoints — missing input validation, broken auth, and endpoints that leak stack traces show up here.",
    status: "warn",
    statusLabel: "2 patterns flagged on average",
  },
  {
    id: "03",
    name: "Dependency vulnerability audit",
    detail:
      "Cross-checks every package in the lockfile against known vulnerability databases and flags outdated, high-risk versions with CVE IDs.",
    status: "warn",
    statusLabel: "checked against public CVE data",
  },
  {
    id: "04",
    name: "Secret & credential scan",
    detail:
      "Walks the commit history for API keys, tokens, and passwords that were committed and never rotated — including deleted files.",
    status: "pass",
    statusLabel: "scans full git history",
  },
  {
    id: "05",
    name: "TDD commit detection",
    detail:
      "Reads the commit timeline to check whether test commits appear before code commits — a signature of Test-Driven Development. Congratulates or encourages based on findings.",
    status: "pass",
    statusLabel: "professor suggestion ★",
  },
];

const dot = {
  pass: "bg-signal-pass",
  warn: "bg-signal-warn",
};

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Checks() {
  return (
    <section id="checks" className="relative border-b border-ink-border overflow-hidden">
      {/* Subtle gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink-soft/30 to-ink" />

      <div className="relative mx-auto max-w-content px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-lg"
        >
          <p className="font-mono text-xs text-signal-pass uppercase tracking-widest">what it checks</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Five checks,{" "}
            <span className="bg-gradient-to-r from-mist to-mist-muted bg-clip-text text-transparent">
              one report
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mist-muted">
            Each scan walks through the same checklist a careful reviewer would
            use — just faster, and every time.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 divide-y divide-ink-border border-y border-ink-border"
        >
          {checks.map((c) => (
            <motion.div
              key={c.id}
              variants={itemVariants}
              className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 transition-colors hover:bg-ink-soft/40 md:grid-cols-[3rem_1fr_auto] px-2 rounded-lg"
            >
              <span className="font-mono text-sm text-signal-pass/70 pt-0.5">
                {c.id}
              </span>
              <div>
                <h3 className="font-display text-lg font-medium group-hover:text-signal-pass transition-colors duration-200">
                  {c.name}
                </h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-mist-muted">
                  {c.detail}
                </p>
              </div>
              <div className="col-span-2 mt-2 flex items-center gap-2 md:col-span-1 md:mt-0 md:justify-self-end md:self-start">
                <span className={`h-1.5 w-1.5 rounded-full ${dot[c.status]}`} />
                <span className="font-mono text-xs text-mist-faint">{c.statusLabel}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
