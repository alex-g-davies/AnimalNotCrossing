# Animal Not Crossing

A free, ad-free, offline logic puzzle for one player, installed on an iPhone as a home-screen web app.
Place one animal in every row, column and colored region, with no two animals touching, even diagonally.
Every puzzle has exactly one solution and can be solved by deduction alone.

Static files only (plus one locally bundled open-licence font for the Valley theme): no backend, accounts, analytics, ads, dependencies or build step.

## Run locally

```
npm test        # unit tests (Node's built-in runner)
npm run bench   # 1,000 puzzles per size through the independent solver; writes PERF.md
npm run serve   # http://localhost:8080/  (service workers work on localhost)
```

Requires Node 20 or newer. Nothing to install beyond Node.

Useful extras:

```
node tools/make-icons.js                       # regenerates icons/*.png
node tools/screenshot.js out.png "palette=valley&animal=cow&theme=dark" 393 852
```

The look can be previewed from the URL without saving it: `?palette=valley&animal=chicken&theme=light`.

## How it works

- `src/core/generator.js` places the animals, grows regions around them, then repairs the layout by moving boundary cells between regions and keeping any move that leaves fewer cells unresolved by the deduction engine. When nothing is unresolved the puzzle is unique and solvable by logic.
- `src/core/techniques.js` is that deduction engine (levels 1 to 3, plus an optional lookahead level 4). It also grades difficulty and powers hints.
- `src/core/solver.js` is a fast counting solver used as a second proof of uniqueness; `test/reference-solver.js` is a third, deliberately different one used only by tests and the bench.
- `src/core/game.js` holds the game state as pure functions: taps, undo, mistakes, win and loss.
- `src/core/climb.js` is climb mode: a ladder from 6×6 easy to 12×12 hard, each stage against a countdown, until a loss or the clock ends the run. `src/core/stats.js` keeps win streaks; `src/core/spec.js` resolves the "random" size, difficulty, animal and colour settings once per puzzle.
- `src/messages.js` holds the messages shown after every game. Edit them freely.
- Generation runs in a Web Worker and the next puzzle is prepared while the current one is being solved.

Measured generator numbers live in `PERF.md`.

## Deploy (GitHub Pages)

1. Push the repository to GitHub (public repo, nothing secret inside).
2. In the repo settings, Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Wait a minute, then open `https://<user>.github.io/<repo>/` in Safari on the iPhone.
4. Before every later deploy, change `CACHE_VERSION` in `sw.js`. Otherwise players keep the old files.

## Install on the iPhone

1. Open the hosted URL in Safari.
2. Tap Share, then Add to Home Screen.
3. Launch from the new icon; it opens full screen with no browser bar.
4. Turn on airplane mode and relaunch to confirm it plays offline.

Home-screen app data lives only on that phone. Use Menu, Backup, Export now and then; Import restores stats, streaks and settings.

## Name

"Animal Not Crossing" is a private pun on the no-touching rule. Rename before any public release.
The "Valley" theme is a homage to a certain farm game in style only; it contains none of that game's name, art or sounds.
