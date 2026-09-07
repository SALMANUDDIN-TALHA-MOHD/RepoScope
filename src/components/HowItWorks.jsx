import { motion } from "framer-motion";
import { Link, Cpu, FileText } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Link,
    title: "Paste a repository link",
    detail:
      "Any public GitHub repository. RepoScope reads the code the same way a new contributor would — starting with the file tree and the package manifest.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "Five checks run in parallel",
    detail:
      "Tests, endpoint checks, dependency audit, secret scan, and TDD commit detection all run simultaneously. Nothing is written back to your repository.",
  },
  {
    step: "03",
    icon: FileText,
    title: "You get a report you can act on",
    detail:
      "Each finding is explained in plain language with the file and line it came from, ranked by how much it actually matters — plus an AI-generated summary.",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-b border-ink-border overflow-hidden">
      {/* Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-signal-pass/4 via-ink to-ink" />

      <div className="relative mx-auto max-w-content px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-mono text-xs text-signal-pass uppercase tracking-widest">how a scan runs</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps to a{" "}
            <span className="bg-gradient-to-r from-signal-pass to-cyan-400 bg-clip-text text-transparent">
              complete picture
            </span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                variants={cardVariants}
                className="group relative rounded-xl border border-ink-border bg-ink-soft p-6 transition-all duration-300 hover:border-signal-pass/40 hover:shadow-lg hover:shadow-signal-pass/5"
              >
                {/* Top row: number + icon */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-signal-pass/30 group-hover:text-signal-pass/60 transition-colors">
                    {s.step}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-border bg-ink group-hover:border-signal-pass/30 group-hover:bg-signal-pass/10 transition-all">
                    <Icon size={16} className="text-mist-faint group-hover:text-signal-pass transition-colors" />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-muted">{s.detail}</p>

                {/* Hover glow bottom */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-signal-pass/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
