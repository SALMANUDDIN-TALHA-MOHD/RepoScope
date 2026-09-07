import { motion } from "framer-motion";

const lines = [
  { text: "reposcope scan github.com/nayeli/order-service", type: "cmd" },
  { text: "cloning repository...", type: "muted" },
  { text: "stack detected: Node.js, Express, PostgreSQL", type: "muted" },
  { text: "running unit tests", type: "muted" },
  { text: "47 passed, 3 failed", type: "fail" },
  { text: "running API tests against 12 endpoints", type: "muted" },
  { text: "2 endpoints return stack traces on bad input", type: "warn" },
  { text: "scanning dependencies", type: "muted" },
  { text: "1 package with a known vulnerability (lodash)", type: "warn" },
  { text: "scanning for exposed credentials", type: "muted" },
  { text: "no secrets committed to history", type: "pass" },
  { text: "report ready — 3 issues to review", type: "pass" },
];

const colorFor = {
  cmd: "text-mist",
  muted: "text-mist-faint",
  pass: "text-signal-pass",
  warn: "text-signal-warn",
  fail: "text-signal-fail",
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16, delayChildren: 0.3 },
  },
};

const line = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export default function ScanConsole() {
  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-ink-border bg-ink-soft shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-ink-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-fail/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-pass/70" />
        <span className="ml-2 font-mono text-xs text-mist-faint">
          scan session — order-service
        </span>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-2 px-5 py-5 font-mono text-[13px] leading-relaxed"
      >
        {lines.map((l, i) => (
          <motion.p key={i} variants={line} className={colorFor[l.type]}>
            {l.type === "cmd" ? (
              <>
                <span className="text-signal-pass">$</span> {l.text}
              </>
            ) : (
              <>
                <span className="text-mist-faint">→ </span>
                {l.text}
              </>
            )}
          </motion.p>
        ))}
      </motion.div>
    </div>
  );
}
