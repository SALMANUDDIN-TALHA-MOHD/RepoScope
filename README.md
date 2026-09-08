# RepoScope

> Know what is actually wrong with your repository — before your next release.

A web application that analyses any public GitHub repository for test coverage gaps,
code quality issues, dependency vulnerabilities, security problems, and TDD usage.
Every finding is explained in plain English through an AI-generated summary.

---

## Features and Functions

### Frontend
- [x] Dark-themed landing page with custom colour system (Space Grotesk + IBM Plex Mono fonts)
- [x] Animated mock terminal in the hero section (Framer Motion, staggered line-by-line)
- [x] Scroll-triggered animations on every section (whileInView, once:true)
- [x] Gradient headline and radial glow background effects
- [x] Repo URL input form (wired, calls backend from Week 4)
- [x] Five-section page: Navbar, Hero, Checks, HowItWorks, SampleReport, Footer
- [x] Fully responsive down to 375px mobile width
- [x] Mobile hamburger menu with Framer Motion slide-down animation
- [x] HowItWorks cards with hover glow effect
- [x] SampleReport card with mock AI summary and findings list
- [x] Footer with tagline, copyright, and navigation links
- [ ] Architecture section on the website (Week 4)
- [ ] Live scan progress checklist (Week 10)
- [ ] Results dashboard at /scan/:id (Week 7)
- [ ] Scan history page at /history (Week 10)
- [ ] Sign In page (Week 10)
- [ ] Sign Up page (Week 10)
- [ ] File heatmap (Week 11)
- [ ] Severity breakdown chart (Week 11)

### Backend
- [x] Express server on port 5000 with global error handler
- [x] GET /api/health endpoint
- [x] POST /api/scan endpoint (accepts GitHub URL, validates, queues pipeline)
- [x] GET /api/scan/:id endpoint (returns mock findings, real data from Week 4)
- [x] GitHub API integration: fetchFileTree, fetchFileContent, fetchCommits
- [x] TDD Detector: analyses commit history, gives congratulations or encouragement
- [x] Scan Orchestrator: coordinates all analysis services
- [x] SupabaseService: createScan, saveFindings, getScanById (stub, live from Week 4)
- [ ] AST-based test coverage analysis (Week 4)
- [ ] Supabase database fully connected (Week 4)
- [ ] Code quality checker: complexity, smells, duplicates (Week 5)
- [ ] Dependency vulnerability audit (Week 6)
- [ ] Unified pipeline with health score (Week 7)
- [ ] OWASP and secret detection (Week 8)
- [ ] AI summary via Gemini API (Week 9)
- [ ] JWT authentication middleware (Week 10)
- [ ] File heatmap endpoint (Week 11)

### Diagrams (separate files)
- [x] architecture-diagram.svg — system architecture (4-layer swimlane diagram)
- [x] uml-class-diagram.svg — UML class diagram (backend service relationships)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| Database + Auth | Supabase (Postgres, Row Level Security, JWT) |
| GitHub Integration | @octokit/rest |
| AI Summary | Google Gemini API (free tier) |
| Deployment | Vercel |

---

## Running Locally

### Frontend
```
npm install
npm run dev
```
Opens at http://localhost:5173. No API keys needed to view the page.

### Backend
```
cd backend
cp .env.example .env
# Add your GITHUB_TOKEN to .env
npm install
npm start
```
Runs at http://localhost:5000.

---

## Environment Variables

Frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Backend `.env`:
```
PORT=5000
GITHUB_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
CLIENT_ORIGIN=http://localhost:5173
```

---

## Deployment

Both the frontend and backend deploy to Vercel. Push to GitHub, import the
repository in Vercel, set Framework to Vite for the frontend, and add all
environment variables in the Vercel project settings.

---

## Academic Context

This project is being built as an independent study course during the Fall 2026
semester. The supervising professor is Professor Yacobellis, whose Software
Quality and Testing course directly inspired this tool.

Copyright 2026 RepoScope. Built for academic independent study.
