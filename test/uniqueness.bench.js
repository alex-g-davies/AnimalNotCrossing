// Volume verification and performance benchmark. Writes PERF.md.
//
//   node test/uniqueness.bench.js [--count 1000] [--sizes 6-12] [--difficulties easy,medium,hard]
//                                 [--modes 1,2] [--rows 2:11:medium,1:12:hard] [--workers 7] [--resume]
//
// For every size and difficulty it generates `count` puzzles, verifies each
// with the independent reference solver and the grader, and records timing,
// attempts and rejection reasons. It also measures how often a random region
// layout is unique on its own, which is why the generator repairs instead of
// retrying. Mode 1 is the classic game, mode 2 is Double Up (two animals per
// line, sizes 8 to 11 only); both run by default.
//
// Rows run in parallel on worker threads (one chunk of seeds per task), and
// every finished row is cached in .bench-cache/ keyed by a hash of src/core,
// so --resume redoes only the rows whose code changed or that never finished.
// Per-puzzle times are wall-clock inside a worker; with several workers busy
// they run a little slower than on an idle machine.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { createRng } from '../src/core/rng.js';
import { generatePuzzle, growRegions, placeAnimals, MIN_SIZE, MAX_SIZE, MIN_DOUBLE_SIZE, MAX_DOUBLE_SIZE } from '../src/core/generator.js';
import { countSolutions } from '../src/core/solver.js';
import { gradePuzzle, MEDIUM_MAX_LEVEL3_STEPS } from '../src/core/difficulty.js';
import { referenceCount } from './reference-solver.js';

const TARGETS = {
  1: { 8: { median: 100, p95: 500 }, 10: { median: 1000, p95: 2000 }, 12: { median: 2000, p95: 4000 } },
  // Double Up is pre-generated in the background while the previous puzzle is
  // played, so it may take longer: the budget is the classic one two sizes up.
  2: { 8: { median: 1000, p95: 2000 }, 10: { median: 2000, p95: 4000 }, 11: { median: 2000, p95: 8000 } },
};

// --- Worker: generate and verify one chunk of seeds -------------------------

function runChunk({ k, n, difficulty, seeds }) {
  const out = [];
  for (const seed of seeds) {
    const t0 = performance.now();
    const puzzle = generatePuzzle({ n, seed, difficulty, k });
    const ms = performance.now() - t0;
    const ref = referenceCount(puzzle, 2);
    const grade = gradePuzzle(puzzle);
    const ok = ref.count === 1 && JSON.stringify(ref.solutions[0]) === JSON.stringify(puzzle.solution) && grade.solved && grade.label === difficulty;
    out.push({
      seed, ms, placements: puzzle.stats.placements, evals: puzzle.stats.evals, level3: puzzle.grade.levelCounts[3],
      rejected: { unsolved: puzzle.stats.unsolved, badShape: puzzle.stats.badShape, wrongDifficulty: puzzle.stats.wrongDifficulty },
      tuned: puzzle.stats.tuned || 0,
      fail: ok ? null : `count ${ref.count}, grade ${grade.label}`,
    });
  }
  return out;
}

if (!isMainThread) {
  parentPort.on('message', (task) => parentPort.postMessage({ id: task.id, results: runChunk(task) }));
} else {
  await main();
}

// --- Main thread -----------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const count = Number(args.count || 1000);
  const [sizeLo, sizeHi] = (args.sizes || `${MIN_SIZE}-${MAX_SIZE}`).split('-').map(Number);
  const difficulties = (args.difficulties || 'easy,medium,hard').split(',');
  const modes = (args.modes || '1,2').split(',').map(Number);
  const cpus = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const workers = Math.max(1, Number(args.workers || cpus - 1));
  const chunk = Number(args.chunk || 20);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const cacheDir = `${root}.bench-cache/`;
  const codeHash = hashCore(root);

  // The rows to measure.
  let rows = [];
  for (const k of modes) {
    const lo = k === 2 ? Math.max(sizeLo, MIN_DOUBLE_SIZE) : sizeLo;
    const hi = k === 2 ? Math.min(sizeHi, MAX_DOUBLE_SIZE) : sizeHi;
    for (let n = lo; n <= hi; n++) for (const difficulty of difficulties) rows.push({ k, n, difficulty, count });
  }
  if (args.rows) {
    const wanted = new Set(String(args.rows).split(','));
    rows = rows.filter((r) => wanted.has(`${r.k}:${r.n}:${r.difficulty}`));
  }

  // Cached rows (same code, same count) are reused with --resume.
  mkdirSync(cacheDir, { recursive: true });
  const results = new Map(); // row key -> per-puzzle records
  const pendingRows = [];
  for (const row of rows) {
    const file = `${cacheDir}${rowKey(row)}.json`;
    if (args.resume && existsSync(file)) {
      const cached = JSON.parse(readFileSync(file, 'utf8'));
      if (cached.hash === codeHash && cached.count === count) {
        results.set(rowKey(row), cached.records);
        continue;
      }
    }
    results.set(rowKey(row), []);
    pendingRows.push(row);
  }
  console.log(`${rows.length} rows, ${pendingRows.length} to run (${rows.length - pendingRows.length} cached), ${count} puzzles each, ${workers} workers`);

  // Tasks: chunks of seeds, costliest rows first so they do not become the tail.
  const tasks = [];
  const cost = (r) => r.n ** 3 * (r.k === 2 ? 4 : 1) * (r.difficulty === 'easy' ? 0.2 : 1);
  for (const row of pendingRows.slice().sort((a, b) => cost(b) - cost(a))) {
    const seedBase = row.n * 1_000_000 + difficulties.indexOf(row.difficulty) * 100_000 + (row.k - 1) * 10_000_000;
    for (let start = 0; start < count; start += chunk) {
      const seeds = [];
      for (let i = start; i < Math.min(count, start + chunk); i++) seeds.push(seedBase + i);
      tasks.push({ id: tasks.length, k: row.k, n: row.n, difficulty: row.difficulty, seeds });
    }
  }
  const total = tasks.reduce((s, t) => s + t.seeds.length, 0);
  const remaining = new Map(pendingRows.map((r) => [rowKey(r), r.count]));

  const started = performance.now();
  let done = 0;
  let failures = 0;
  const progress = setInterval(() => {
    const elapsed = (performance.now() - started) / 1000;
    const rate = done / Math.max(1, elapsed);
    console.log(`  ${done}/${total} puzzles, ${fmtSec(elapsed)} elapsed${rate ? `, about ${fmtSec((total - done) / rate)} left at this rate` : ''}`);
  }, 15000);

  await runPool(tasks, Math.min(workers, Math.max(1, tasks.length)), ({ id, results: records }) => {
    const task = tasks[id];
    const row = { k: task.k, n: task.n, difficulty: task.difficulty, count };
    const key = rowKey(row);
    const list = results.get(key);
    list.push(...records);
    done += records.length;
    for (const rec of records) {
      if (rec.fail) {
        failures++;
        console.error(`FAIL ${task.n}x${task.n} ${task.difficulty} k${task.k} seed ${rec.seed}: ${rec.fail}`);
      }
    }
    remaining.set(key, remaining.get(key) - records.length);
    if (remaining.get(key) === 0) {
      list.sort((a, b) => a.seed - b.seed);
      console.log(rowLine(summarise(row, list)));
      writeFileSync(`${cacheDir}${key}.json`, JSON.stringify({ hash: codeHash, count, records: list }));
    }
  });
  clearInterval(progress);

  const summaries = rows.map((row) => summarise(row, results.get(rowKey(row))));
  for (const row of rows) if (!pendingRows.includes(row)) console.log(`${rowLine(summarise(row, results.get(rowKey(row))))}  (cached)`);

  // How often is a random layout unique without repair?
  const uniqueRates = [];
  for (let n = sizeLo; n <= sizeHi; n++) {
    const rng = createRng(42);
    let unique = 0;
    const layouts = 500;
    for (let i = 0; i < layouts; i++) {
      const solution = placeAnimals(n, rng);
      const regions = growRegions(n, solution, rng);
      if (countSolutions({ n, regions }, 2).count === 1) unique++;
    }
    uniqueRates.push({ n, rate: unique / layouts });
  }

  const seconds = (performance.now() - started) / 1000;
  writeFileSync(`${root}PERF.md`, report(summaries, uniqueRates, failures, workers, seconds));
  const verified = summaries.reduce((s, r) => s + r.count, 0);
  console.log(failures === 0 ? `\nAll ${verified} puzzles verified in ${fmtSec(seconds)}. PERF.md written.` : `\n${failures} FAILURES. PERF.md written.`);
  process.exit(failures === 0 ? 0 : 1);
}

// A fixed pool of workers pulling tasks from the queue.
function runPool(tasks, size, onResult) {
  return new Promise((resolve, reject) => {
    if (!tasks.length) return resolve();
    let next = 0;
    let active = 0;
    const feed = (worker) => {
      if (next >= tasks.length) {
        worker.terminate();
        if (active === 0) resolve();
        return;
      }
      active++;
      worker.postMessage(tasks[next++]);
    };
    for (let i = 0; i < size; i++) {
      const worker = new Worker(fileURLToPath(import.meta.url));
      worker.on('message', (msg) => {
        active--;
        onResult(msg);
        feed(worker);
      });
      worker.on('error', reject);
      feed(worker);
    }
  });
}

function summarise(row, records) {
  const times = records.map((r) => r.ms);
  const rejected = { unsolved: 0, badShape: 0, wrongDifficulty: 0 };
  for (const r of records) for (const key of Object.keys(rejected)) rejected[key] += r.rejected[key];
  return {
    ...row,
    median: quantile(times, 0.5),
    p95: quantile(times, 0.95),
    max: quantile(times, 1),
    placements: mean(records.map((r) => r.placements)),
    evals: mean(records.map((r) => r.evals)),
    tuned: mean(records.map((r) => r.tuned)),
    rejected,
    level3: { median: quantile(records.map((r) => r.level3), 0.5), p95: quantile(records.map((r) => r.level3), 0.95) },
    failures: records.filter((r) => r.fail).length,
  };
}

function rowLine(row) {
  return `${row.k === 2 ? 'double ' : ''}${row.n}x${row.n} ${row.difficulty.padEnd(6)} median ${row.median.toFixed(0).padStart(5)} ms  p95 ${row.p95.toFixed(0).padStart(5)} ms  max ${row.max.toFixed(0).padStart(5)} ms  placements/puzzle ${row.placements.toFixed(2)}  evals/puzzle ${row.evals.toFixed(0)}`;
}

function rowKey(row) {
  return `${row.k}-${row.n}-${row.difficulty}-${row.count}`;
}

function hashCore(root) {
  const hash = createHash('sha1');
  for (const file of readdirSync(`${root}src/core`).sort()) hash.update(readFileSync(`${root}src/core/${file}`));
  return hash.digest('hex').slice(0, 12);
}

function report(rows, uniqueRates, failures, workers, seconds) {
  const lines = [];
  lines.push('# Generator performance and verification');
  lines.push('');
  lines.push(`Generated by \`npm run bench\` on ${new Date().toISOString().slice(0, 10)}.`);
  lines.push(`Machine: ${os.cpus()[0].model.trim()}, ${os.platform()} ${os.release()}, Node ${process.version}. Cold path (no pre-generation). Rows ran on ${workers} worker threads in parallel; each time is the wall clock of one puzzle inside its worker. Whole run: ${fmtSec(seconds)}.`);
  lines.push('');
  lines.push(`Every puzzle below was verified by the independent reference solver (exactly one solution, equal to the stored one) and by the grader (solved by deduction at the requested difficulty). **Failures: ${failures}.**`);
  lines.push('');
  lines.push('## Time to generate one accepted puzzle');
  lines.push('');
  lines.push('"Double Up" rows are the two-animals-per-line mode (sizes 8 to 11).');
  lines.push('');
  lines.push('| Mode | Size | Difficulty | Puzzles | Median | p95 | Max | Target (median / p95) | Placements per puzzle | Repair moves per puzzle | Level-3 steps (median / p95) |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const target = TARGETS[r.k][r.n];
    const targetText = target ? `${target.median} / ${target.p95} ms ${r.median <= target.median && r.p95 <= target.p95 ? 'met' : 'MISSED'}` : '';
    lines.push(`| ${r.k === 2 ? 'Double Up' : 'classic'} | ${r.n}x${r.n} | ${r.difficulty} | ${r.count} | ${r.median.toFixed(0)} ms | ${r.p95.toFixed(0)} ms | ${r.max.toFixed(0)} ms | ${targetText} | ${r.placements.toFixed(2)} | ${r.evals.toFixed(0)} | ${r.level3.median} / ${r.level3.p95} |`);
  }
  lines.push('');
  lines.push('## Rejections per accepted puzzle');
  lines.push('');
  lines.push('A placement is rejected when repair stalls (unsolved), when a region breaks the shape rules, or when the graded difficulty differs from the requested one even after difficulty tuning. "Tuned" is the share of accepted puzzles whose layout was nudged into the requested difficulty instead of being thrown away.');
  lines.push('');
  lines.push('| Mode | Size | Difficulty | Unsolved | Bad shape | Wrong difficulty | Tuned |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    lines.push(`| ${r.k === 2 ? 'Double Up' : 'classic'} | ${r.n}x${r.n} | ${r.difficulty} | ${(r.rejected.unsolved / r.count).toFixed(2)} | ${(r.rejected.badShape / r.count).toFixed(2)} | ${(r.rejected.wrongDifficulty / r.count).toFixed(2)} | ${(100 * r.tuned).toFixed(0)}% |`);
  }
  lines.push('');
  lines.push('## Why the generator repairs instead of retrying');
  lines.push('');
  lines.push('Share of random region layouts (balanced growth around a valid solution) that have exactly one solution, out of 500 per size:');
  lines.push('');
  lines.push('| Size | Unique layouts |');
  lines.push('| --- | --- |');
  for (const u of uniqueRates) lines.push(`| ${u.n}x${u.n} | ${(100 * u.rate).toFixed(1)}% |`);
  lines.push('');
  lines.push('A plain retry loop would need hundreds to millions of layouts per puzzle. Instead the generator moves single boundary cells between regions, mostly at the cells the deduction engine could not resolve, and keeps any move that leaves no more cells unresolved. When nothing is unresolved, the puzzle is both unique and solvable by logic alone.');
  lines.push('');
  lines.push('## Difficulty mapping');
  lines.push('');
  lines.push(`Puzzles solvable with level 1 alone (singles) do not exist without single-cell regions, so: easy = levels 1-2, medium = level 3 with at most ${MEDIUM_MAX_LEVEL3_STEPS} level-3 steps, hard = more level-3 steps than that.`);
  lines.push('');
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const next = argv[i + 1];
    out[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : next;
  }
  return out;
}
function quantile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}
function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function fmtSec(s) {
  return s >= 90 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`;
}
