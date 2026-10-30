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
- **Themes and animals.** Multiple animal icon sets, several region palettes, light and dark. One theme, "Valley", is a Stardew Valley homage in style only: pixel art, farm palette, farm animals. Never include Stardew's name, sprites, characters or sounds.
- **Name** is "Animal Not Crossing" (private pun). Rename before any public release.
- "Cat" in the guide means "animal" in code; the chosen animal name is substituted into copy.
- Typography is the system rounded stack. No bundled fonts.
- The worker pre-generates the next puzzle while the player solves the current one.

## Tools and quirks

- `node tools/screenshot.js out.png "query" [w] [h] [actions-js]`: phone-size screenshots via headless Chrome and the DevTools protocol (no dependency). Look settings can be forced through URL params (`?palette=valley&animal=cow&theme=dark`).
- `node tools/make-icons.js` regenerates the PNG icons.
- The service worker is cache-first: while developing, unregister it or bump `CACHE_VERSION`, or changes will not show.
- Measured: random region layouts are almost never unique (0% at 10x10+), so the generator repairs layouts with the deduction engine as the objective. Difficulty: easy = levels 1-2, medium = level 3 with few level-3 steps, hard = many. See PERF.md.

## Layout

```
index.html  manifest.webmanifest  sw.js  icons/
src/main.js            wiring, screens, owns game state
src/core/              rng, rules, solver, generator, techniques, difficulty, hints, game, daily, spec, stats
src/ui/                board, controls, screens, animals, themes, palettes, style.css
src/store/storage.js   localStorage wrapper, every access in try/catch
src/worker/            generate.worker.js
test/                  *.test.js, reference-solver.js, uniqueness.bench.js
tools/serve.js         dev server
```
