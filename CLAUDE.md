# Animal Not Crossing: notes for agent sessions

Static, dependency-free puzzle PWA. The full build guide is `GUIDE.md`; read it before changing rules, scope or architecture. This file holds the operational facts.

## Commands

```
npm test          # node --test test/   (Node >= 20, built-in runner, no framework)
npm run bench     # node test/uniqueness.bench.js  -> rewrites PERF.md with measured numbers (parallel, ~minutes)
npm run bench:quick  # 100 puzzles per row, reusing cached rows whose core code is unchanged (--resume)
#   options: --rows 2:11:medium,1:12:hard  --workers 7  --count N  --resume
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
- **Themes and animals.** The animal icons are the owner's kawaii portraits: source sheets `art/Kawaii Animal Icon Grid.png` (first twelve) and `art/Cute Pastel Animal Faces Grid.png` (bear to seal), cut into transparent 256 px PNGs in `img/animals/` by `node tools/cut-sheet.js` (see the command in README). Several region palettes, light and dark. The "Valley" style is a Stardew Valley homage in style only: pixel art, the Farm palette, and the owner's pixel-style portraits of every animal (sheets `art/Valley Pixel Grid 1.png` and `2.png` and the later Valley sheets, cut into `img/valley/`; the farm scene and corner sprig from the first of them decorate the Valley backdrop). Never include Stardew's name, sprites, characters or sounds.
- **Name** is "Animal Not Crossing" (private pun). Rename before any public release.
- "Cat" in the guide means "animal" in code; the chosen animal name is substituted into copy.
- **Issue #1 feedback (Oct 30, 2026).** Size, difficulty, animal and colours each accept "random", picked once per puzzle (`src/core/spec.js`). Win streaks overall and per combination (`src/core/stats.js`); a loss or leaving a started puzzle ends one. **Climb mode** (`src/core/climb.js`): ladder 6×6 easy to 12×12 hard, countdown of 5 s per cell shrinking 15% a stage past the ladder, normal mistake limits, relaxed ignored. Icons were replaced by the owner's art (Oct 30, 2026).
- **Second feedback round (Oct 30, 2026).** About a third of the end messages are cheeky (grouped at the end of each list in `src/messages.js`). The end card compares the time with earlier wins at that size and difficulty (`compareTime` in stats.js). (A feedback card shown every tenth game was added here and removed again on Oct 31, 2026 at the owner's request.) "Advanced mode" (menu, Look) swaps every animal icon for `src/ui/advanced.js`, an adult joke the owner asked for; keep it behind the toggle, off by default. Twelve more animals (bear, panda, mouse, raccoon, lion, tiger, monkey, koala, deer, elephant, owl, seal) arrived as a second sheet on Oct 31, 2026; the cutter now models a tile's vertical colour gradient and prints how much background it removed per tile.
- **Issue #2 (Oct 31, 2026).** A "Lines" setting (Look section) scales the internal board lines: fine 0.6×, normal 1×, bold 1.5×, heavy 2.1× of the thin 1 px cell lines and thick 3 px region borders (`--line-scale` in style.css). The outer frame does not change.
- **Oct 31, 2026 round.** Each palette decorates the space around the board (`src/ui/backdrop.js`: grass and daisies, sprinkles, waves and bubbles, stars and hills, the Valley farm). With colours on "random", a checklist under the Colors select limits which palettes are picked (`settings.randomPalettes`, at least one). The Valley icons are the owner's pixel portraits; the hand-drawn 16×16 sprites are gone.
- **Nov 2, 2026 round (issues #3 to #8).** "Valley" is now a **Style** toggle (normal or pixel look: font, frame, pixel portraits, farm backdrop) and its colours are the "Farm" palette, usable under either style; old saves with palette "valley" are mapped. Twelve **aquatic** animals (clownfish to narwhal; the sheet repeats the seal, kept as "seal pup") and a **Christmas** palette with falling snow and twelve festive characters (sheets `art/Aquatic Animal Grid.png`, `art/Valley Aquatic Grid.png`, `art/Christmas Animal Grid.png`, `art/Valley Christmas Grid.png`); the festive set shows only with the Christmas colours (`festive`/`base` in `src/ui/animals.js`, `settings.festiveAnimal`), and the Valley Christmas sheet also gives the snowy farm strip and holly sprig. The menu's **Advanced** section tunes the climb ladder (largest board, difficulty ramp, clock; `src/core/climb.js` options, custom ladders keep their own best under `stats.climbs`); the joke icon toggle was removed at the owner's request. A standalone **Stats** page (`src/ui/statspage.js`) replaced the menu's stats block and records play time for every finished game from this version on. **Double Up** mode: two animals per row, column and region, still never touching (`puzzle.k = 2`, `solution[r]` is a pair of columns); sizes 8 to 11, because 12x12 generation measured a median of about 5 s with a 28 s worst case. The deduction engine counts "needs" per unit and adds a "fit" technique (level 2) for the no-touch pairs; the reference solver, counting solver and bench cover both modes.
- **Nov 12, 2026.** Twelve more animals from `art/Kawaii Chibi Animal Icon Grid.png`: newfie, leonberger, berner, golden retriever, capybara, red panda, otter, sloth, hippo, bat, alpaca, hamster (owner confirmed the names, Bernese renamed "berner"), plus the "princess" (`art/Kawaii Crowned Girl Avatar.png`, a single portrait cut as a 1x1 sheet). No Valley sheet came with them, so they are `pixel: false` for now.
- **Trophy case (issue #11, Nov 2026).** Owner chose climb cups plus milestone rosettes, one slot per tier per ladder with the best run kept. Tiers by stages cleared on a ladder of L stages: bronze ceil(L/3), silver ceil(2L/3), gold L, crystal L+3 (standard ladder: 3, 6, 9, 12). A slot keeps the quickest time to clear that many stages and the character, date, style and palette of the clearing stage (`stats.trophies`, so export carries it; `trophies` is in `RESERVED`). Milestones: win streak 5/10/25, daily streak 7/30/100, first Double Up win, 100 games. Stats from before the case are back-filled at start as `legacy` records with no character or date.
- Typography is the system rounded stack; the only bundled font is Pixelify Sans (OFL) for Valley.
- The worker pre-generates the next puzzle while the player solves the current one.

## Tools and quirks

- `node tools/screenshot.js out.png "query" [w] [h] [actions-js]`: phone-size screenshots via headless Chrome and the DevTools protocol (no dependency). Look settings can be forced through URL params (`?style=valley&animal=cow&theme=dark&lines=heavy`).
- `node tools/cut-decor.js sheet.png x y w h scale out.png [edges]` cuts one keyed rectangle (used for the Valley farm strip and sprig).
- `node tools/make-icons.js` regenerates the app icons from `img/animals/cat.png` (headless Chrome canvas).
- `node tools/cut-sheet.js art/sheet.png 4 3 256 img/animals cat,dog,...` re-cuts the animal portraits from a sheet; set `CUT_DEBUG=dir` to also write keying masks and print the sampled patches. Check the "tile NNNNNpx" column: a tile whose background was not found reports a small number. Adding an animal means: cut it from both a portrait sheet and a Valley sheet, add name and plural in `src/ui/animals.js`, and both PNGs to `sw.js`. An animal with no pixel portrait yet gets `pixel: false` and shows its regular portrait (smooth scaling) in Valley; only its `img/animals/` PNG is precached. The cutter samples the page colour 3% in from the sheet edge and falls back to 0.8% when that line crosses tiles (narrow margins).
- The service worker is cache-first: while developing, unregister it or bump `CACHE_VERSION`, or changes will not show.
- Measured: random region layouts are almost never unique (0% at 10x10+), so the generator repairs layouts with the deduction engine as the objective. Repair moves are aimed at the cells the engine left unresolved, a placement that stops improving is abandoned (`stallEvals`), and a solvable layout of the wrong difficulty is nudged into the requested band (`tuneDifficulty`) instead of thrown away; the deduction state caches per-unit animal counts. Together (Nov 2, 2026) this made generation 5 to 10 times faster. Difficulty: easy = levels 1-2, medium = level 3 with few level-3 steps, hard = many. See PERF.md.
- The bench runs rows on worker threads and caches finished rows in `.bench-cache/` (gitignored) keyed by a hash of `src/core`; `--resume` skips rows whose code has not changed.

## Layout

```
index.html  manifest.webmanifest  sw.js  icons/
src/main.js            wiring, screens, owns game state
src/core/              rng, rules, solver, generator, techniques, difficulty, hints, game, daily, spec, stats, climb, trophies
src/ui/                board, controls, screens, animals, themes, palettes, style.css
src/store/storage.js   localStorage wrapper, every access in try/catch
src/worker/            generate.worker.js
test/                  *.test.js, reference-solver.js, uniqueness.bench.js
tools/serve.js         dev server
```
