import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "What it checks", href: "#checks" },
  { label: "Sample report", href: "#sample" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-border/80 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-signal-pass/40 bg-signal-pass/10 font-mono text-sm text-signal-pass">
            &gt;_
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            RepoScope
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-mist-muted transition-colors hover:text-mist"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#sample"
            className="text-sm text-mist-muted transition-colors hover:text-mist"
          >
            Sign in
          </a>
          <a
            href="#scan"
            className="rounded-md bg-mist px-4 py-2 text-sm font-medium text-ink transition-all duration-200 hover:scale-[1.04] hover:bg-signal-pass"
          >
            Scan a repository
          </a>
        </div>

        <button
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-ink-border px-6 py-4 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-mist-muted"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#scan"
                onClick={() => setOpen(false)}
                className="rounded-md bg-mist px-4 py-2 text-center text-sm font-medium text-ink"
              >
                Scan a repository
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
