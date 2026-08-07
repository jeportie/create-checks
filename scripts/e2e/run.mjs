#!/usr/bin/env node
/**
 * tskickstart E2E install matrix runner.
 *
 * Tier 1 (gen)    — scaffold every combination with NO_INSTALL; assert exit 0 + core files.
 * Tier 2 (verify) — real install + `npm run check` (+ build) on the curated subset.
 *
 * Pure Node built-ins only, so it runs without the package's own node_modules.
 * (Tier 2 still needs node_modules in each generated project — the CLI installs them.)
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { enumerate, GROUPS, VERIFY } from './matrix.mjs';
import { applyFilters, HELP, parseArgs } from './lib/args.mjs';
import { hasBinary, runPool } from './lib/proc.mjs';
import { runGen, runVerify } from './lib/steps.mjs';
import { renderMarkdown, renderSummary, renderTree, summarize } from './lib/report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, '../../src/index.js');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (!['gen', 'verify', 'all'].includes(args.tier)) {
    throw new Error(`--tier must be gen | verify | all (got "${args.tier}")`);
  }

  const genCombos = applyFilters(enumerate(GROUPS), args.filters);
  const verifyCombos = applyFilters(VERIFY, args.filters);

  if (args.list) {
    const selected = args.tier === 'verify' ? verifyCombos : genCombos;
    for (const combo of selected) console.log(combo.id, JSON.stringify(combo.env));
    console.log(`\n${selected.length} combinations`);
    return 0;
  }

  const ctx = {
    cliPath,
    keep: args.keep,
    timeoutMs: 180000,
    verifyTimeoutMs: 900000,
    hasBun: await hasBinary('bun'),
  };
  const state = { failed: 0 };
  const shouldStop = () => args.bail && state.failed > 0;
  const results = [];

  if (args.tier === 'gen' || args.tier === 'all') {
    console.log(`\n▶ Tier 1 (generation) — ${genCombos.length} combinations`);
    const gen = await runPool(
      genCombos,
      async (combo) => {
        const res = await runGen(combo, ctx);
        if (res.status === 'fail') state.failed += 1;
        process.stdout.write(res.status === 'pass' ? '.' : res.status === 'skip' ? 's' : 'F');
        return res;
      },
      args.concurrency || 8,
      shouldStop,
    );
    process.stdout.write('\n');
    results.push(...gen.filter(Boolean));
  }

  if (args.tier === 'verify' || args.tier === 'all') {
    console.log(`\n▶ Tier 2 (verify — real install) — ${verifyCombos.length} combinations`);
    const verify = await runPool(
      verifyCombos,
      async (combo) => {
        const res = await runVerify(combo, ctx);
        if (res.status === 'fail') state.failed += 1;
        process.stdout.write(`  ${res.status.toUpperCase().padEnd(4)} ${combo.id}\n`);
        return res;
      },
      args.concurrency || 2,
      shouldStop,
    );
    results.push(...verify.filter(Boolean));
  }

  console.log(`\n${renderTree(results)}`);
  const summary = summarize(results);
  console.log(`\n${renderSummary(summary)}`);

  const reportPath = args.reportPath || resolve(process.cwd(), 'e2e-report.json');
  const payload = { tier: args.tier, filters: args.filters, generatedAt: new Date().toISOString(), summary, results };
  writeFileSync(reportPath, JSON.stringify(payload, null, 2));
  console.log(`\n📄 report: ${reportPath}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderMarkdown(results, summary));
  }

  return summary.fail > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
