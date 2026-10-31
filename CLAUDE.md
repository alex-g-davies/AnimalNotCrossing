# Animal Not Crossing: notes for agent sessions

Static, dependency-free puzzle PWA. The full build guide is `GUIDE.md`; read it before changing rules, scope or architecture. This file holds the operational facts.

## Commands

```
npm test          # node --test test/   (Node >= 20, built-in runner, no framework)
npm run bench     # node test/uniqueness.bench.js  -> rewrites PERF.md with measured numbers
npm run serve     # node tools/serve.js -> http://localhost:8080/  (service worker works on localhost)
```

## Release rule

Change `CACHE_VERSION` in `sw.js` on every deploy. Players keep the old files otherwise.
Deploy is a push to `main`; GitHub Pages serves the repo root.

## Hard constraints (from GUIDE.md)

- No dependencies, no build step, no framework. Plain ES modules, HTML, CSS.
- No network calls, CDNs, web fonts, analytics, ads or third-party scripts. Everything local.
- `src/core/*` is pure and runs unchanged in Node. UI code never imports DOM into core.
- Every puzzle has exactly one solution and is solvable by deduction alone. Never loosen a threshold or delete a failing case to get a green run.
- Ask the owner before adding a dependency, changing the rules, adding a network call, or publishing anywhere but GitHub Pages.
- Report measured numbers, not impressions.

## Decisions made with the owner (Oct 29, 2026)

- **Loss state exists.** Placing an animal on a cell not in the stored solution is a mistake. Limits per difficulty: easy 5, medium 4, hard 3 (constants in `src/core/game.js`). X marks never count. Undo does not refund a mistake. A "relaxed" setting disables the limit.
- **Every game ends with a loving message**, win or loss, from `src/messages.js`. Shuffled cycle, no immediate repeats. The owner personalises the list.
- **Sizes 6 to 12.** 12×12 is labelled "large"; its cells are allowed below the 40 px minimum (about 29 px on an iPhone SE).
- **Themes and animals.** The animal icons are the owner's kawaii portraits: source sheet `art/Kawaii Animal Icon Grid.png`, cut into transparent 256 px PNGs in `img/animals/` by `node tools/cut-sheet.js` (see the command in README). Several region palettes, light and dark. One theme, "Valley", is a Stardew Valley homage in style only: pixel art, farm palette, and its own pixel sprites for the same twelve animals. Never include Stardew's name, sprites, characters or sounds.
- **Name** is "Animal Not Crossing" (private pun). Rename before any public release.
- "Cat" in the guide means "animal" in code; the chosen animal name is substituted into copy.
- **Issue #1 feedback (Oct 30, 2026).** Size, difficulty, animal and colours each accept "random", picked once per puzzle (`src/core/spec.js`). Win streaks overall and per combination (`src/core/stats.js`); a loss or leaving a started puzzle ends one. **Climb mode** (`src/core/climb.js`): ladder 6×6 easy to 12×12 hard, countdown of 5 s per cell shrinking 15% a stage past the ladder, normal mistake limits, relaxed ignored. Icons were replaced by the owner's art (Oct 30, 2026).
- **Second feedback round (Oct 30, 2026).** About a third of the end messages are cheeky (grouped at the end of each list in `src/messages.js`). The end card compares the time with earlier wins at that size and difficulty (`compareTime` in stats.js). Every tenth finished game, "Next" first shows a feedback card (`feedbackDue`); answers are tallied locally under `KEYS.feedback` and shown in Stats. "Advanced mode" (menu, Look) swaps every animal icon for `src/ui/advanced.js`, an adult joke the owner asked for; keep it behind the toggle, off by default. New animals wait on an art sheet from the owner.
- **Issue #2 (Oct 31, 2026).** A "Lines" setting (Look section) scales the internal board lines: fine 0.6×, normal 1×, bold 1.5×, heavy 2.1× of the thin 1 px cell lines and thick 3 px region borders (`--line-scale` in style.css). The outer frame does not change.
- Typography is the system rounded stack; the only bundled font is Pixelify Sans (OFL) for Valley.
- The worker pre-generates the next puzzle while the player solves the current one.

## Tools and quirks

- `node tools/screenshot.js out.png "query" [w] [h] [actions-js]`: phone-size screenshots via headless Chrome and the DevTools protocol (no dependency). Look settings can be forced through URL params (`?palette=valley&animal=cow&theme=dark&lines=heavy`).
- `node tools/make-icons.js` regenerates the app icons from `img/animals/cat.png` (headless Chrome canvas).
- `node tools/cut-sheet.js art/sheet.png 4 3 256 img/animals cat,dog,...` re-cuts the animal portraits from the sheet; set `CUT_DEBUG=dir` to also write keying masks.
- The service worker is cache-first: while developing, unregister it or bump `CACHE_VERSION`, or changes will not show.
- Measured: random region layouts are almost never unique (0% at 10x10+), so the generator repairs layouts with the deduction engine as the objective. Difficulty: easy = levels 1-2, medium = level 3 with few level-3 steps, hard = many. See PERF.md.

## Layout

```
index.html  manifest.webmanifest  sw.js  icons/
src/main.js            wiring, screens, owns game state
src/core/              rng, rules, solver, generator, techniques, difficulty, hints, game, daily, spec, stats, climb
src/ui/                board, controls, screens, animals, themes, palettes, style.css
src/store/storage.js   localStorage wrapper, every access in try/catch
src/worker/            generate.worker.js
test/                  *.test.js, reference-solver.js, uniqueness.bench.js
tools/serve.js         dev server
```
