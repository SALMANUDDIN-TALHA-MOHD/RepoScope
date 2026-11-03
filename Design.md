# RepoScope — Design System Reference

> Complete visual specification: colours, typography, spacing, glass styles, animations, component patterns, responsive breakpoints, and naming conventions. Keep this file as Claude context so every new week's UI is pixel-consistent with the existing dashboard.

---

## 1. Colour Tokens

All colours are defined as the constant `C` at the top of `ScanResult.jsx`. Never hard-code a hex that belongs in `C`.

```js
const C = {
  green:  '#22c55e',   // pass states, tested functions, positive metrics
  cyan:   '#38bdf8',   // AST coverage accent, links, info highlights
  amber:  '#f59e0b',   // warnings, code quality, dependency audit accent
  purple: '#818cf8',   // medium severity, AST badge, duplicate blocks
  pink:   '#f472b6',   // Week 7 security placeholder
  muted:  '#aaaac8',   // secondary text, descriptions, subtitles
  faint:  '#44445a',   // disabled states, column headers, placeholders
};
```

### Semantic severity colours (dependency audit / CVE)

| Severity | Hex | Usage |
|----------|-----|-------|
| critical | `#ef4444` | Critical CVEs, very high complexity |
| high | `C.amber` `#f59e0b` | High CVEs, moderate warnings |
| medium | `C.purple` `#818cf8` | Medium CVEs |
| low | `C.green` `#22c55e` | Low CVEs, clean states |
| unknown | `C.faint` `#44445a` | Unknown severity, off states |

### Page background
```
#06060e   — main page background (near-black with a blue undertone)
rgba(8,8,15,.92)  — sidebar background (slightly lighter, with backdrop blur)
```

### Text colours
```
#f0f0ff   — primary headings and values (off-white with blue tint)
#c8d0f0   — body text inside cards and expanded rows
C.muted   (#aaaac8)  — secondary labels, descriptions
C.faint   (#44445a)  — disabled, placeholder, column header text
```

---

## 2. Typography

Two font families, loaded from Google Fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
```

### Space Grotesk — prose and UI

| Use | Size | Weight |
|-----|------|--------|
| Page `<h1>` | 26px | 800 |
| Section heading | 22px | 700 |
| Stat chip value | 28–30px | 800 |
| Body / descriptions | 14px | 400 |
| Card body text | 13px | 400 |
| Small labels | 11–12px | 400–600 |
| Button text | 13–14px | 700 |
| Sidebar item label | 13px | 400 (active: 600) |

Default `fontFamily` for all prose: `'Space Grotesk', sans-serif` (set on `<body>` / root `div`).

### IBM Plex Mono — numbers, codes, badges, headers

Applied with `fontFamily: "'IBM Plex Mono', monospace"` inline. Used for:

- Stat chip values (28–40px, weight 800)
- Section micro-labels / eyebrow text (9–10px, UPPERCASE, letterSpacing `.12em`–`.16em`)
- Badge pills (9–11px)
- CVE IDs, package names, version strings (10–11px)
- `<code>` inline snippets
- Commit SHA hashes (10px)
- Progress percentage (10px)
- Sidebar badge text (9px)
- All table column header text (9px, UPPERCASE, letterSpacing `.08em`)

---

## 3. The `glass()` Helper

Every card in RepoScope uses glassmorphism. The helper is defined once at the top of the file:

```js
const glass = (accent) => ({
  background: accent
    ? `linear-gradient(135deg, ${accent}18 0%, rgba(255,255,255,.04) 100%)`
    : 'linear-gradient(135deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.03) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${accent ? accent + '30' : 'rgba(255,255,255,.1)'}`,
  borderRadius: 20,
});
```

### Usage patterns

```js
// Neutral card (no accent colour)
<div style={{ ...glass(), padding: 22 }}>

// Accented card (uses accent at 18% opacity background, 30% border)
<div style={{ ...glass(C.amber), padding: 22 }}>
<div style={{ ...glass('#ef4444'), padding: 22 }}>
<div style={{ ...glass(C.green), padding: 22 }}>
```

### Accent hex suffixes used in the codebase

| Suffix | Opacity | Use |
|--------|---------|-----|
| `18` | ~9% | Card background gradient start |
| `08` | ~3% | Subtle tint on nested sub-cards |
| `12` | ~7% | Hover / expanded row background |
| `30` | ~19% | Card border colour |
| `25` | ~15% | Nested card border |
| `20` | ~13% | Light border |
| `15` | ~8% | Badge background |
| `1f` | ~12% | Nav badge background |
| `40` | ~25% | Expanded row border |

---

## 4. Spacing & Sizing

### Card padding
```
Large summary card:   padding: 28–32px
Standard card:        padding: 20–22px
Compact / inner card: padding: 14–18px
Table row:            padding: 9px 10px–12px
Badge:                padding: 2px 7px–10px
Button (primary):     padding: 10px–12px 24px–32px
```

### Border radius
```
Page cards (glass):   borderRadius: 20
Inner sub-cards:      borderRadius: 8–12
Badge pills:          borderRadius: 99 (fully rounded)
Small chips/tags:     borderRadius: 4–8
Primary button:       borderRadius: 10
Nav items:            borderRadius: 10
```

### Gap / grid
```
Stat chips row:         gap: 12,  gridTemplateColumns: repeat(4,1fr)
Two-column layout:      gap: 14,  gridTemplateColumns: 1fr 1fr
Three-column layout:    gap: 10,  gridTemplateColumns: repeat(3,1fr)
Severity count grid:    gap: 8,   gridTemplateColumns: repeat(4,1fr) or repeat(5,1fr)
Card vertical stack:    gap: 14–16, marginBottom: 14–16
Nav item margin:        marginBottom: 3
```

### Top accent stripe (on major summary cards)
```js
position: 'absolute', top: 0, left: 0, right: 0, height: 3,
background: `linear-gradient(90deg, ${accentColour}, transparent)`
```

---

## 5. Animations & Transitions

All keyframes are defined in the `<style>` block at the bottom of the file:

```css
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes orbf    { 0%,100% { opacity:.6; transform:scale(1); }
                     50%     { opacity:1;  transform:scale(1.1); } }
@keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes rpp     { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,.4); }
                     70%     { box-shadow:0 0 0 6px rgba(34,197,94,0); } }
@keyframes slideUp { from { opacity:0; transform:translateY(18px); }
                     to   { opacity:1; transform:translateY(0); } }
```

### Where each animation is used

| Animation | Element | Duration |
|-----------|---------|----------|
| `spin` | Scanning spinner rings | 2s / 3s / 2.5s linear |
| `orbf` | Background orb blobs | 18s / 20s / 24s ease-in-out |
| `pulse` | Live dot, scanning step dot | 1s–2s ease-in-out infinite |
| `rpp` | Sidebar "Scan complete" green dot (ripple) | 2s ease-in-out infinite |
| `slideUp` | Every tab panel on mount | 0.4s cubic-bezier(.22,1,.36,1) |

### Hover transitions (inline, not keyframe)
```js
// Card lift on hover
onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-2px)'; }
onMouseLeave: e => { e.currentTarget.style.transform = 'none'; }
transition: 'all .25s'

// Deeper lift for stat chips
onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-3px)';
                     e.currentTarget.style.boxShadow = `0 16px 40px ${chip.c}22`; }
onMouseLeave: e => { e.currentTarget.style.transform = 'none';
                     e.currentTarget.style.boxShadow = 'none'; }

// Row highlight on hover (table rows)
transition: 'all .15s'

// Expand chevron rotation
transition: 'transform .2s'
transform: isOpen ? 'rotate(180deg)' : 'none'
```

### Progress bar transition
```js
// TDD ratio bar and main scan progress bar:
transition: 'width 1.8s cubic-bezier(.22,1,.36,1)'
// Scan progress bar:
transition: 'width .6s ease'
```

---

## 6. Background Orbs

Three fixed blobs sit behind everything at `z-index: 0` using `position: fixed; inset: 0; pointerEvents: none`:

```js
{ width:700, height:700, color:'rgba(34,197,94,.07)',  top:-200,  left:-200,  blur:100, dur:'20s',  delay:0 }
{ width:500, height:500, color:'rgba(56,189,248,.06)',  bottom:-100, right:-100, blur:100, dur:'24s',  delay:'-6s' }
{ width:400, height:400, color:'rgba(129,140,248,.05)', top:'40%', right:'20%', blur:80,  dur:'18s',  delay:'-3s' }
```

Each is a `borderRadius: '50%'` div with `radial-gradient(circle, <colour>, transparent 65%)` and `filter: blur(<n>px)`, animated with `orbf`.

---

## 7. Badge / Pill Patterns

### Nav sidebar badge
```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 9
padding: '2px 7px'
borderRadius: 99
background: `${badgeColor}18`
color: badgeColor
border: `1px solid ${badgeColor}30`
```

### Status pill (large — on card top-right)
```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 10 (card) / 13 (major summary card)
fontWeight: 700
padding: '4px 10px' / '8px 20px'
borderRadius: 99
background: `${colour}15` or `rgba(r,g,b,.15)`
color: colour
border: `1px solid ${colour}30` or `rgba(r,g,b,.3)`
```

### Severity chip (CVE table)
```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 10
padding: '2px 7px'
borderRadius: 99
textTransform: 'uppercase'
background: `${sevColor}18`
color: sevColor
border: `1px solid ${sevColor}30`
```

### Function name tag (AST tested / untested)
```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 11
padding: '4px 10px'
borderRadius: 6
// untested:
background: 'rgba(239,68,68,.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.2)'
// tested:
background: 'rgba(34,197,94,.1)', color: '#86efac', border: '1px solid rgba(34,197,94,.2)'
```

### Commit type label (TDD tab)
```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 9
padding: '2px 7px'
borderRadius: 99
width: 36, textAlign: 'center'
// test:  background `${C.green}15`, color C.green, border `1px solid ${C.green}25`
// impl:  background `${C.cyan}15`,  color C.cyan,  border `1px solid ${C.cyan}25`
// other: background `${C.faint}15`, color C.faint
```

---

## 8. Eyebrow / Section Label Pattern

Appears at the top of every tab and every major card:

```js
fontFamily: "'IBM Plex Mono', monospace"
fontSize: 9–10
color: <tab accent colour>  // e.g. C.green for overview, C.amber for quality
textTransform: 'uppercase'
letterSpacing: '.12em' (card labels) / '.16em' (tab top labels)
marginBottom: 5–8
```

---

## 9. Scanning Screen

Three concentric spinner rings:
```js
sizes:    [160, 120, 80]
colors:   [C.green, C.cyan, C.purple]
durations: ['2s', '3s', '2.5s']
ring[1] direction: 'reverse'
border:   '2px solid transparent'
borderTopColor + borderRightColor: `${color}40`
boxShadow: `0 0 20px ${color}33`
```

Centre pulse dot:
```js
width: 28, height: 28, borderRadius: '50%'
background: 'linear-gradient(135deg,#22c55e,#38bdf8)'
boxShadow: '0 0 24px rgba(34,197,94,.6)'
animation: 'pulse 2s ease-in-out infinite'
```

Step list items: done = green `✓`, active = cyan `·` with pulse dot, pending = muted number.

---

## 10. Sidebar

```
width: 260px
background: rgba(8,8,15,.92)
backdropFilter: blur(32px)
borderRight: 1px solid rgba(255,255,255,.07)
position: sticky, top: 0, height: 100vh
scrollbarColor: #e53e3e #0e0e1c   (thin, 4px)
```

Logo block: 30×30px rounded-8 gradient `linear-gradient(135deg,#22c55e,#38bdf8)` with `>_` in IBM Plex Mono 11px weight 700, colour `#06060e`.

Repo status card: `glass(C.green)` with `rpp` ripple dot (6px, `#22c55e`).

Active nav item: `background: rgba(34,197,94,.1)`, icon colour `C.green`, label weight 600, colour `#f0f0ff`.

Divider: `height:1, background: rgba(255,255,255,.06), margin: 16px 8px`.

"Coming soon" items: opacity 0.4, no hover, no click.

---

## 11. Responsive Breakpoints

Defined in the `<style>` block via CSS class names applied to grid containers:

```css
/* 900px breakpoint */
@media(max-width:900px) {
  .rs-three-col  { grid-template-columns: 1fr !important; }
  .rs-two-col    { grid-template-columns: 1fr !important; }
  .rs-chips      { grid-template-columns: 1fr 1fr !important; }
  .rs-smell-table { grid-template-columns: 1fr auto auto !important; }
  .rs-smell-table > *:nth-child(1) { display: none; }   /* hide type badge */
  .rs-dep-table  { grid-template-columns: 80px 1fr 90px 110px !important; }
  .rs-dep-table > *:nth-child(5),
  .rs-dep-table > *:nth-child(6),
  .rs-dep-table > *:nth-child(7) { display: none; }     /* hide summary/fixed/published */
}

/* 700px breakpoint */
@media(max-width:700px) {
  .rs-smell-table { grid-template-columns: 1fr auto !important; }
  .rs-smell-table > *:nth-child(3) { display: none; }   /* hide file name */
  .rs-dep-table   { grid-template-columns: 80px 1fr !important; }
  .rs-dep-table > *:nth-child(3),
  .rs-dep-table > *:nth-child(4) { display: none; }     /* hide version/CVE-ID */
}
```

### CSS class → grid element map

| Class | Element | Default columns |
|-------|---------|-----------------|
| `rs-chips` | Stat chip row (4-up) | `repeat(4,1fr)` |
| `rs-two-col` | Two-column card layout | `1fr 1fr` |
| `rs-three-col` | Three-column layout | `repeat(3,1fr)` |
| `rs-smell-table` | Code smell table rows | `110px 1fr auto auto` |
| `rs-dep-table` | CVE table rows | `80px 130px 90px 110px 1fr 80px 80px` |

---

## 12. Inline Code Snippet Style

Used inside expanded rows and description text:

```js
// Neutral / file path
background: 'rgba(255,255,255,.08)', color: C.faint,
padding: '1px 6px', borderRadius: 4,
fontFamily: "'IBM Plex Mono',monospace"

// Package name (cyan)
background: 'rgba(56,189,248,.1)', color: '#38bdf8',
padding: '1px 5px', borderRadius: 4, fontSize: 11

// Fixed version (green)
background: 'rgba(34,197,94,.1)', color: C.green,
padding: '1px 5px', borderRadius: 4, fontSize: 11
```

---

## 13. Progress Bar

```js
// Track
height: 4–8px
background: 'rgba(255,255,255,.06)'
borderRadius: 99
overflow: 'hidden'

// Fill
height: '100%'
borderRadius: 99
background: `linear-gradient(90deg, ${colour}, ${colour}88)`
width: `${percent}%`
transition: 'width 1.8s cubic-bezier(.22,1,.36,1)'
boxShadow: `0 0 12–16px ${colour}44`
```

---

## 14. Expand / Collapse Row Pattern

Used in complexity table, smell table, CVE table, diagnostics:

```js
// Collapsed row
background: 'rgba(255,255,255,.03)'
border: `1px solid ${colour}20`
borderRadius: 8
cursor: 'pointer'

// Expanded row (top half)
background: `${colour}12`
border: `1px solid ${colour}40`
borderRadius: '8px 8px 0 0'

// Expanded detail panel (bottom half)
background: `${colour}08`
border: `1px solid ${colour}30`
borderTop: 'none'
borderRadius: '0 0 8px 8px'
padding: '12–16px'

// Chevron indicator
fontSize: 10–11, color: C.faint
transition: 'transform .2s'
transform: isOpen ? 'rotate(180deg)' : 'none'
```

---

## 15. Tab Colour Assignments

Each tab has a fixed accent colour used for its eyebrow label, nav badge, and card accents:

| Tab | Accent colour |
|-----|--------------|
| Overview | `C.green` |
| TDD Detection | dynamic: `C.green` (pass) / `C.amber` (warn) / `C.purple` (info) |
| AST Coverage | `#38bdf8` (C.cyan) |
| Code Quality | dynamic: from `qualityRatingColour(overallRating)` |
| Dependencies | dynamic: from `depBadgeColor` (critical→`#ef4444`, high→amber, medium→purple, pass→green, off→faint) |
| Diagnostics | `C.green` |

---

## 16. Key State Variables

```js
const [activeTab,   setActiveTab]   = useState('overview');   // current tab
const [expanded,    setExpanded]    = useState(null);         // open row in quality tab: 'fn0', 'smell3'
const [expandedFn,  setExpandedFn]  = useState(null);         // open row in dep tab: 'v0'
const [smellFilter, setSmellFilter] = useState('all');        // quality tab filter
const [countersGo,  setCountersGo]  = useState(false);        // counter animation gate
```

`expanded` and `expandedFn` are kept separate so quality tab and dep tab each have independent open state.

---

## 17. useCounter Hook

Animates a number from 0 to `target` over `dur` ms with a cubic ease-out, starting only when `go` becomes true:

```js
function useCounter(target, dur, go) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!go || !target) return;
    const s = performance.now();
    const raf = { id: null };
    const tick = now => {
      const p = Math.min((now - s) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) raf.id = requestAnimationFrame(tick);
    };
    raf.id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.id);
  }, [go, target, dur]);
  return val;
}
```

Counters fire 400ms after `phase === 'complete'`. Durations: files 1800ms, commits 1400ms, TDD% 2200ms, code commits 1600ms, pairs 1800ms.

---

## 18. Scrollbar Style

```css
::-webkit-scrollbar       { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
/* Sidebar uses scrollbar-color: #e53e3e #0e0e1c (Firefox) */
```

---

## 19. Global Reset

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
```

---

## 20. Adding a New Week's Tab — Checklist

When adding a new check (e.g. Week 7 Security), follow this exact pattern:

1. **Backend** — create `checks/newCheck.js` exporting `{ name, description, isDefault: true, run }`. Register in `CHECKS_REGISTRY` in `scanOrchestrator.js`.
2. **Derived state** — add `const newCheck = scanData?.newCheckKey ?? null;` after the existing derived state block (around line 182).
3. **NAV array** — add `{ id:'newTab', label:'Label', icon:'⬟', badge: ..., badgeColor: ... }` before `{ id:'diagnostics' }`.
4. **Sidebar coming-soon list** — remove the corresponding placeholder entry.
5. **Overview upcoming-checks grid** — remove the corresponding placeholder item.
6. **Overview card** — add a `{newCheck && ( <div style={{ ...glass(accentColour), ... }}> )}` card after the last existing overview card.
7. **Tab panel** — add `{activeTab === 'newTab' && ( <div style={{ animation:'slideUp .4s ...' }}> ... </div> )}` before the Diagnostics tab.
8. **CSS** — add any new responsive table class to the `<style>` block following the `rs-dep-table` pattern.
9. **No UI changes** — never touch existing tab panels, colour tokens, `glass()`, font imports, or the `useCounter` hook.