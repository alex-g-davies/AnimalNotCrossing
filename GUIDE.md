# Cat Puzzle PWA: Build Guide for Claude Code

Oct 29, 2026 · @Alex Davies

## Goal and context

Build a free, ad-free puzzle game in the style of Meowdoku that one person can play endlessly on an iPhone, offline, from a home-screen icon.

- **Player:** one casual puzzler (the owner's girlfriend). She likes Meowdoku but is put off by ads after almost every level and no paid ad-free option.
- **Why build it:** existing ad-free alternatives are paid or subscription, and none give unlimited fresh puzzles in a cat theme.
- **Owner:** an engineering manager with a CS degree who will review the code and likes decisions backed by measured data. Prefer plain, readable code over clever abstractions.
- **Success looks like:** she taps an icon, a new puzzle is ready in under one second, it works with no signal, and she never sees a repeated puzzle, an ad, a login or a paywall.
- **Hard constraints:** no backend, no accounts, no analytics, no ads, no third-party scripts. Static files only, hosted free.

## Game rules and scope

The game is a Star Battle / Queens variant: an N×N grid split into N colored regions, with one cat placed per row, column and region.

**Rules (all must hold at once)**

1. Exactly one cat in every row.
2. Exactly one cat in every column.
3. Exactly one cat in every colored region.
4. No two cats touch, including diagonally.

Every puzzle must have exactly one solution, and that solution must be reachable by deduction alone, with no trial-and-error guessing.

**In scope for v1**

- Grid sizes 6×6 to 10×10, default 8×8.
- Endless generated puzzles with a difficulty setting (easy, medium, hard).
- Tap cycle: empty, then X (marked empty), then cat, then back to empty.
- Conflict highlighting, undo, hint, timer, win screen.
- Daily puzzle from a date-based seed.
- Local stats and streaks, with export and import of that data.
- Installable PWA that works offline.

**Out of scope**

Online leaderboards, accounts, multiplayer, ads, in-app purchases, App Store release, push notifications, any server.

## Architecture and stack

Use plain JavaScript (ES modules), HTML and CSS with no build step and no runtime dependencies, so the whole app is a folder of static files. Keep all game logic in pure functions that run unchanged in Node for testing.

**Decisions**

- **No framework, no bundler.** The UI is one board and a few buttons. Revisit only if the code outgrows this.
- **Generation runs in a Web Worker** so the interface never freezes on larger grids.
- **Seeded randomness.** Use a small seeded PRNG (for example mulberry32) so a seed always reproduces the same puzzle. The daily puzzle is the seed derived from the local date.
- **Puzzle data shape.** `{ n, regions, solution }` where `regions` is an N×N array of region ids (0 to N-1) and `solution` lists the cat's column for each row.
- **Storage.** `localStorage` behind one small wrapper module, with every read and write in try/catch.
- **Art.** Draw original cat icons as inline SVG. Do not copy the name, art, sounds or layout of Meowdoku or any other game.

**File layout**

```
cat-puzzle/
  index.html
  manifest.webmanifest
  sw.js
  icons/                  180, 192, 512 px PNG + maskable 512
  src/
    main.js               wiring, game state, screens
    core/rng.js           seeded PRNG
    core/generator.js     builds a puzzle with a unique solution
    core/solver.js        counts solutions (stops at 2)
    core/techniques.js    human-style deductions for grading and hints
    core/difficulty.js    grades a puzzle by techniques needed
    ui/board.js           renders grid, handles taps, conflict display
    ui/controls.js        undo, hint, timer, new game, settings
    ui/style.css
    store/storage.js      stats, streaks, settings, export/import
    worker/generate.worker.js
  test/
    solver.test.js
    generator.test.js
    uniqueness.bench.js   1,000-puzzle verification run
  CLAUDE.md               short notes for future agent sessions
```

**Module boundaries**

| Module | Responsibility | Touches the DOM? |
| --- | --- | --- |
| `core/*` | Generation, solving, grading, hints. Pure functions only. | No |
| `ui/*` | Rendering and input. Calls `core` through the worker. | Yes |
| `store/*` | Persistence and backup. | No |
| `main.js` | Connects the above and owns current game state. | Yes |

## Puzzle generator

Generate the solution first, grow colored regions around it, then keep the layout only if a solver proves it has exactly one solution.

**Pipeline**

1. **Place the cats.** Backtrack row by row. For each row, try columns in a shuffled order (from the seeded PRNG) that are unused and at least 2 columns away from the previous row's cat. The result is a valid solution with no touching cats.
2. **Grow the regions.** Start region *i* at cat *i*'s cell. Repeatedly pick a region and claim one unassigned cell that is orthogonally next to it, until the grid is full. Pick smaller regions more often so sizes stay balanced; wildly uneven regions make puzzles trivial or ugly.
3. **Check uniqueness.** Run the counting solver (next section) on the regions alone. Accept only if it finds exactly one solution.
4. **Check solvability by logic.** Run the deduction solver. Accept only if it finishes the puzzle without guessing at or below the requested difficulty.
5. **Retry.** If a check fails, regrow the regions around the same cats, up to a fixed number of tries (start with 50). If that still fails, place new cats and start again.

**Quality rules**

- Every region is connected and non-empty.
- Avoid single-cell regions except on easy; they hand the player a free cat.
- Reject layouts where one region covers more than about 40% of the grid.

**Performance targets (measure, do not assume)**

- Median time to produce an accepted 8×8 puzzle under 100 ms on a recent iPhone-class device; 95th percentile under 500 ms.
- 10×10 hard puzzles under 2 seconds at the 95th percentile. If a size misses its target, record the numbers and propose a fix (smarter region repair, a cheaper uniqueness test) instead of silently lowering the bar.
- Log, per size and difficulty: attempts per accepted puzzle and the fraction of random region layouts that turn out unique. That fraction tells us whether the simple retry loop is good enough or the generator needs smarter repair.

**Repeats.** With random seeds, repeats at 8×8 and up are vanishingly unlikely. Keep the last few thousand seeds in storage anyway and skip any seed already played.

## Solver and difficulty grading

Two solvers do two different jobs: a fast counting solver proves uniqueness, and a human-style deduction solver grades difficulty and powers hints.

**Counting solver (`core/solver.js`).** Backtrack row by row using bitmasks for used columns and used regions, plus the previous row's column for the no-touch rule. Return the number of solutions, stopping as soon as it reaches 2. At 6×6 to 10×10 this should take well under a millisecond to a few milliseconds.

**Deduction solver (`core/techniques.js`).** Keep a candidate grid (each cell is unknown, eliminated, or cat) and apply techniques from simplest to hardest, recording which ones were needed.

| Level | Techniques | Used for |
| --- | --- | --- |
| 1 | Placing a cat eliminates its row, column, region and 8 neighbors. A row, column or region with one candidate left gets its cat. | Easy |
| 2 | A region whose candidates all sit in one row (or column) eliminates the rest of that row (or column). A row or column whose candidates all sit in one region eliminates the rest of that region. | Medium |
| 3 | The same idea for N regions confined to N rows or columns (pairs, triples), and the reverse. A cell touching every remaining candidate of a region, row or column is eliminated. | Hard |
| 4 | One-step lookahead: assume a cat in a cell, apply levels 1 to 3, and if that causes a contradiction, eliminate the cell. | Expert (optional) |

**Grading.** A puzzle's difficulty is the highest level it needs, with the step count as a tie-breaker. Reject any unique puzzle the deduction solver cannot finish, because finishing it would take guessing. That rejection is what keeps the "no guessing" promise.

**Hints.** Run the deduction solver from the player's current board. If a placed cat contradicts the stored solution, say there is a mistake first. Otherwise offer three tiers on repeated taps: highlight the area where progress is possible, name the technique in plain words, then show the move.

**Independent check.** Write a second, deliberately simple solver for tests only (for example, search region by region with plain pruned backtracking, a different order from the main solver). It must agree with the counting solver on every puzzle.

## UI/UX spec

Design for one thumb on an iPhone in portrait: the board fills the width, controls sit below it, and nothing needs precision tapping.

**Board**

- Square grid sized to the screen width, each cell at least 40 px on an iPhone SE-sized screen (about 375 px wide), so 10×10 stays tappable.
- Regions are colored with a palette that stays distinguishable for color-blind players. Also draw a thicker border between regions so color is never the only cue.
- One tap cycles empty, X, cat, empty. Support a setting that places a cat on the first tap and X on the second, for players who prefer it.
- Disable double-tap zoom and text selection on the board (`touch-action: manipulation`, `user-select: none`).
- Conflicts (two cats in a row, column or region, or touching) show a red outline on the offending cats. Do not tell the player a placement is wrong unless it breaks a rule they can see; the stored solution is used only for hints and the win check.
- Placing a cat does not auto-fill X marks by default; offer auto-X as an optional setting.

**Controls and screens**

- Bottom bar: undo, hint, new puzzle, menu. Undo has unlimited depth for the current puzzle.
- Menu: grid size, difficulty, daily puzzle, tap behavior, theme, stats, export and import.
- Optional timer that can be hidden. No time pressure, no failure state, no lives.
- Win screen: short celebration (a cat animation is fine), solve time, then one button for the next puzzle.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (light and dark themes).

**State and stats**

- Save the in-progress board after every move, so closing the app never loses a puzzle.
- Track per size and difficulty: puzzles solved, best and median time, current and best daily streak.
- Export all stats and settings as one JSON file and import it back, because home-screen app data lives only on that phone.

**Tone.** Warm and quiet. No popups, no upsells, no badges that nag.

## PWA delivery

Ship the game as a progressive web app: static files on free HTTPS hosting that the player adds to her iPhone home screen and then plays offline.

**Manifest (`manifest.webmanifest`)**

- `name`, `short_name`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `background_color`, `theme_color`.
- Icons at 192 and 512 px, plus a maskable 512 px version.
- Use relative paths everywhere so the app works from a subpath such as `/cat-puzzle/` on GitHub Pages.

**iOS specifics in `index.html`**

- `<link rel="apple-touch-icon" href="icons/icon-180.png">` (iOS uses this for the home-screen icon).
- `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-title`, and `apple-mobile-web-app-status-bar-style`.
- Viewport with `viewport-fit=cover`, and CSS `env(safe-area-inset-*)` padding so nothing hides under the notch or home bar.

**Service worker (`sw.js`)**

- Precache every app file on install (HTML, JS modules, CSS, icons, manifest), and serve cache first. No CDNs, web fonts or remote scripts; everything must be local or offline play breaks.
- Name the cache with a version constant (`cat-puzzle-v1`). On activate, delete caches with other names.
- A new version installs in the background and takes over the next time the app launches. Show a small "updated, restart to apply" note only if it proves necessary.
- **Release rule:** change the cache version in `sw.js` on every deploy, or players keep the old files. Put this in `CLAUDE.md`.

**Hosting**

- GitHub Pages is the default (free for public repos; the repo holds no secrets). Cloudflare Pages or Netlify are fine alternatives. HTTPS is required for service workers.
- Deploy by pushing to the main branch. Document the exact steps in the README.

**Installing on the iPhone**

1. Open the hosted URL in Safari.
2. Tap Share, then Add to Home Screen.
3. Launch from the new icon; it should open full-screen with no browser bar.
4. Turn on airplane mode and relaunch to confirm offline play.

**Data safety.** Call `navigator.storage.persist()` where available, and rely on the export and import feature as the real backup. Home-screen app storage is separate from Safari's and lives only on that phone.

## Testing and acceptance criteria

The riskiest bug is a puzzle with two valid answers or one that needs guessing, so the generator gets verified at volume before any polish work counts as done.

| Check | How | Pass condition |
| --- | --- | --- |
| Uniqueness | Generate at least 1,000 puzzles per grid size (6 to 10) and run the independent test solver on each | Exactly one solution, equal to the stored solution, every time |
| Logical solvability | Run the deduction solver on every accepted puzzle | Finishes with no guessing, and the graded level matches the requested difficulty |
| Determinism | Generate the same seed twice, also across the worker and Node | Identical puzzle |
| Rules validator | Property tests on random boards | Agrees with a hand-written reference check |
| Performance | `uniqueness.bench.js` writes median and 95th percentile times, attempts per puzzle and unique-layout rate per size and difficulty to `PERF.md` | Meets the targets in the generator section, or the gap is reported |
| Offline | Headless browser test: load, wait for the service worker, go offline, reload | Game loads and a puzzle can be played |
| UI | Tests for the tap cycle, undo, conflict display and win detection on a known puzzle | All pass |
| Real device | Manual run on an iPhone (below) | Every box ticked |

**Acceptance checklist (owner signs off)**

- [ ] 1,000+ puzzles per size verified unique with the independent solver; zero failures.
- [ ] `PERF.md` committed with real numbers from this machine and from the iPhone.
- [ ] Added to the iPhone home screen, opens full-screen, works in airplane mode.
- [ ] Force-quitting mid-puzzle and relaunching restores the board.
- [ ] Export, then clear data, then import restores stats and streaks.
- [ ] Board is readable and tappable at 10×10 on a small iPhone, in light and dark mode.
- [ ] No network requests after the first load (check in browser dev tools).
- [ ] No ads, trackers, analytics or external scripts anywhere in the repo.

**Rule for the agent:** if a check fails, fix the cause and rerun the full check. Do not loosen a threshold or delete a failing case to get a green run.

## Milestones and working agreements

Build in five milestones, proving the generator before touching the interface; each ends with a commit and its exit check passing.

1. **Core logic.** Seeded PRNG, rules validator, counting solver, independent test solver, generator v1 without grading. *Exit:* 1,000 8×8 puzzles verified unique.
2. **Deduction and grading.** Techniques levels 1 to 3, difficulty grading, hint engine, rejection of puzzles that need guessing. *Exit:* every accepted puzzle solved by logic alone; difficulty mix reported; `PERF.md` first version.
3. **Playable UI.** Board, tap cycle, conflicts, undo, win screen, new puzzle through the worker. *Exit:* playable in a desktop browser and in phone-size emulation.
4. **PWA and storage.** Manifest, service worker, saved boards, stats, export and import, deploy to hosting. *Exit:* installed on a real iPhone and working in airplane mode.
5. **Polish.** Original cat art, themes, daily puzzle, hint UI, 10×10 tuning, README and `CLAUDE.md`. *Exit:* the acceptance checklist is fully ticked.

**Working agreements**

- Start by writing a short plan and listing any questions. Keep going on reasonable defaults rather than waiting, and record the choices you made.
- Ask the owner before adding a dependency, changing the rules, adding any network call, or publishing anywhere other than the agreed host.
- Create `CLAUDE.md` in milestone 1 with the commands to run tests, the benchmark and a local server (service workers work on `localhost`), plus the release rule about the cache version.
- Use Node's built-in test runner. Add no test framework unless there is a clear need.
- Report measured numbers, not impressions. When something misses a target, say so and propose a fix.
- Keep commits small, with messages that say what changed and why.

**Kickoff prompt to paste into Claude Code**

```
Read GUIDE.md (this document, exported as Markdown). Build the cat puzzle PWA it describes, in order, starting with milestone 1. Begin by writing a short plan and any questions, create CLAUDE.md, then implement milestone 1 and run its exit check before moving on. Report measured results, and ask before adding dependencies or changing the rules.
```
