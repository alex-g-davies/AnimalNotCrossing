# Animal Not Crossing

A free, ad-free, offline logic puzzle for one player, installed on an iPhone as a home-screen web app.
Place one animal in every row, column and colored region, with no two animals touching, even diagonally. "Double Up" mode asks for two per row, column and region instead (8×8 to 11×11).
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
node tools/screenshot.js out.png "style=valley&animal=cow&theme=dark" 393 852
```

The look can be previewed from the URL without saving it: `?style=valley&palette=farm&animal=chicken&theme=light`.

## How it works

- `src/core/generator.js` places the animals, grows regions around them, then repairs the layout by moving boundary cells between regions (mostly at the cells the engine could not resolve) and keeping any move that leaves no more cells unresolved by the deduction engine. When nothing is unresolved the puzzle is unique and solvable by logic. A layout that comes out at the wrong difficulty is nudged into the requested one rather than discarded.
- `src/core/techniques.js` is that deduction engine (levels 1 to 3, plus an optional lookahead level 4). It also grades difficulty and powers hints.
- `src/core/solver.js` is a fast counting solver used as a second proof of uniqueness; `test/reference-solver.js` is a third, deliberately different one used only by tests and the bench.
- `src/core/game.js` holds the game state as pure functions: taps, undo, mistakes, win and loss.
- `src/core/climb.js` is climb mode: a ladder from 6×6 easy to 12×12 hard, each stage against a countdown, until a loss or the clock ends the run. The menu's Advanced section can cap the board, change the ramp and tighten the clock; such custom ladders keep their own best. `src/core/stats.js` keeps win streaks, play time and per-combination times, which the Stats page (`src/ui/statspage.js`) shows with trends. The Trophies page (`src/core/trophies.js`, `src/ui/trophies.js`) keeps bronze, silver, gold and crystal cups for each climb ladder, each with the quickest run to that tier and the character that earned it, plus rosettes for streak, daily, Double Up and games milestones; `src/core/spec.js` resolves the "random" size, difficulty, animal and colour settings once per puzzle, and the mode (classic or Double Up, `k` animals per line).
- The look is a Style (normal, or the pixel-art Valley look) plus a colour palette. The Christmas palette adds snow and swaps in the festive animal set.
- `src/messages.js` holds the kind messages shown after every game. Edit them freely.
- The animal portraits come from one sheet, `art/Kawaii Animal Icon Grid.png`. To re-cut them after editing the sheet (4 columns, 3 rows, in menu order):

  ```
  node tools/cut-sheet.js "art/Kawaii Animal Icon Grid.png" 4 3 256 img/animals cat,dog,bunny,fox,frog,duck,penguin,hedgehog,chicken,cow,pig,sheep
  node tools/cut-sheet.js "art/Cute Pastel Animal Faces Grid.png" 4 3 256 img/animals bear,panda,mouse,raccoon,lion,tiger,monkey,koala,deer,elephant,owl,seal
  node tools/cut-sheet.js "art/Valley Pixel Grid 1.png" 4 4 256 img/valley cat,dog,bunny,fox,frog,duck,penguin,hedgehog,chicken,cow,pig,sheep
  node tools/cut-sheet.js "art/Valley Pixel Grid 2.png" 4 4 256 img/valley bear,panda,mouse,raccoon,lion,tiger,monkey,koala,deer,elephant,owl,seal
  node tools/cut-sheet.js "art/Aquatic Animal Grid.png" 4 3 256 img/animals clownfish,dolphin,whale,octopus,turtle,shark,crab,seahorse,jellyfish,pufferfish,sealpup,narwhal
  node tools/cut-sheet.js "art/Valley Aquatic Grid.png" 4 4 256 img/valley clownfish,dolphin,whale,octopus,turtle,shark,crab,seahorse,jellyfish,pufferfish,sealpup,narwhal
  node tools/cut-sheet.js "art/Kawaii Chibi Animal Icon Grid.png" 4 3 256 img/animals newfie,leonberger,berner,golden,capybara,redpanda,otter,sloth,hippo,bat,alpaca,hamster
  node tools/cut-sheet.js "art/Kawaii Crowned Girl Avatar.png" 1 1 256 img/animals princess
  node tools/cut-sheet.js "art/Christmas Animal Grid.png" 4 3 256 img/animals reindeer,polarbear,xmas-penguin,xmas-fox,xmas-bunny,xmas-mouse,squirrel,robin,xmas-cat,xmas-dog,xmas-sheep,xmas-hedgehog
  node tools/cut-sheet.js "art/Valley Christmas Grid.png" 4 4 256 img/valley reindeer,polarbear,xmas-penguin,xmas-fox,xmas-bunny,xmas-mouse,squirrel,robin,xmas-cat,xmas-dog,xmas-sheep,xmas-hedgehog
  node tools/cut-decor.js "art/Valley Pixel Grid 1.png" 24 905 1400 160 0.75 img/valley/farm.png top "#fde5b0"
  node tools/cut-decor.js "art/Valley Pixel Grid 1.png" 24 24 78 106 1 img/valley/sprig.png bottom
  node tools/cut-decor.js "art/Valley Christmas Grid.png" 24 905 1400 160 0.75 img/valley/farm-snow.png top "#fde5b0"
  node tools/cut-decor.js "art/Valley Christmas Grid.png" 24 24 78 106 1 img/valley/holly.png bottom
  node tools/make-icons.js
  ```
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
