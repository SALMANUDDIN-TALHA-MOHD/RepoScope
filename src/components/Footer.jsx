export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-border bg-ink-soft">
      <div className="mx-auto max-w-content px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-signal-pass/40 bg-signal-pass/10 font-mono text-sm text-signal-pass">
                &gt;_
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-mist">
                RepoScope
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mist-muted">
              Know what is actually wrong with your repository — before your next release.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-sm text-mist-muted">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-mist-faint uppercase tracking-widest">
                Checks
              </span>
              <a href="#checks" className="hover:text-mist transition-colors">Unit tests</a>
              <a href="#checks" className="hover:text-mist transition-colors">Dependencies</a>
              <a href="#checks" className="hover:text-mist transition-colors">Secrets</a>
              <a href="#checks" className="hover:text-mist transition-colors">API security</a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-mist-faint uppercase tracking-widest">
                Project
              </span>
              <a href="#how-it-works" className="hover:text-mist transition-colors">How it works</a>
              <a href="#sample" className="hover:text-mist transition-colors">Sample report</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-mist transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-ink-border pt-6 md:flex-row md:items-center">
          <p className="font-mono text-xs text-mist-faint">
            &copy; {year} RepoScope. Built for academic independent study — Fall 2026.
          </p>
          <p className="font-mono text-xs text-mist-faint">
            React &middot; Node.js &middot; Supabase &middot; Vercel
          </p>
        </div>
      </div>
    </footer>
  );
}
