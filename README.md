# RepoScope — Week 3

A web app that analyses a GitHub repository for test coverage, code quality,
dependency vulnerabilities, security issues, and TDD usage, then explains
everything in plain English.

## Project layout

```
reposcope/                   ← frontend (React + Vite)
├── src/
│   ├── components/          ← all page sections
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── ScanConsole.jsx
│   │   ├── Checks.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── SampleReport.jsx
│   │   └── Footer.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── .env.example

backend/                     ← Express backend (Node.js)
├── src/
│   ├── server.js            ← entry point, port 5000
│   ├── routes/
│   │   └── scan.js          ← POST /api/scan · GET /api/scan/:id
│   └── services/
│       ├── githubService.js   ← GitHub REST API calls
│       ├── tddDetector.js     ← TDD commit pattern analysis
│       ├── scanOrchestrator.js← coordinates all services
│       └── supabaseService.js ← Postgres reads and writes
├── package.json
└── .env.example
```

## Running locally

### Frontend
```
npm install
npm run dev
# open http://localhost:5173
```

### Backend
```
cd backend
cp .env.example .env
# add your GITHUB_TOKEN to .env
npm install
npm start
# running on http://localhost:5000
```

No API keys are needed to view the frontend.
The backend needs a GitHub token to call the GitHub API.
