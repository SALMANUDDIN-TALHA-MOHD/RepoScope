import { motion } from "framer-motion";

const findings = [
  { label: "Test coverage", value: "47 / 50 tests passing", status: "warn" },
  { label: "Vulnerable dependencies", value: "1 package — lodash (moderate)", status: "warn" },
  { label: "Exposed secrets", value: "None found in commit history", status: "pass" },
  { label: "Endpoint safety", value: "2 endpoints return raw error traces", status: "warn" },
  { label: "TDD detection", value: "TDD patterns detected — 68% ratio ★", status: "pass" },
];

const dot = {
  pass: "bg-signal-pass",
  warn: "bg-signal-warn",
  fail: "bg-signal-fail",
};

export default function SampleReport() {
  return (
    <section id="sample" className="relative border-b border-ink-border overflow-hidden">
      {/* Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-signal-warn/4 via-ink to-ink" />

      <div className="relative mx-auto grid max-w-content gap-12 px-6 py-24 md:grid-cols-2 md:items-start">

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="font-mono text-xs text-signal-pass uppercase tracking-widest">sample report</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Read like a note from a{" "}
            <span className="bg-gradient-to-r from-mist to-mist-muted bg-clip-text text-transparent">
              colleague
            </span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mist-muted">
            The summary at the top of every report is written prose, not a table
            of pass/fail flags. It says what's worth fixing before your next
            release and what can wait.
          </p>

          {/* Stats row */}
          <div className="mt-8 flex gap-8">
            {[
              { number: "5", label: "checks run" },
              { number: "< 60s", label: "scan time" },
              { number: "100%", label: "plain English" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-bold text-signal-pass">{s.number}</p>
                <p className="mt-0.5 font-mono text-xs text-mist-faint">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Report card */}
        <motion.div
          initial={{ opacity: 0, x: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          className="rounded-xl border border-ink-border bg-ink-soft p-6 shadow-2xl shadow-black/30"
        >
          {/* Card header */}
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-mist-faint">order-service &mdash; scanned just now</p>
            <span className="rounded-full border border-signal-pass/30 bg-signal-pass/10 px-2 py-0.5 font-mono text-xs text-signal-pass">
              health 72/100
            </span>
          </div>

          {/* AI summary */}
          <div className="mt-4 rounded-lg border border-signal-pass/20 bg-signal-pass/5 p-4">
            <p className="font-mono text-xs text-signal-pass mb-2">AI Summary</p>
            <p className="text-sm leading-relaxed text-mist">
              Your test suite is in decent shape, but three of the failing tests
              point to the same checkout function — worth looking at first. The
              lodash version in use has a known fix available. Nothing in your
              git history looks like a leaked credential. Good TDD habits
              detected in 68% of your feature commits.
            </p>
          </div>

          {/* Findings list */}
          <div className="mt-5 divide-y divide-ink-border border-t border-ink-border">
            {findings.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-sm text-mist-muted">{f.label}</span>
                <span className="flex items-center gap-2 font-mono text-xs text-mist text-right">
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot[f.status]}`} />
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
