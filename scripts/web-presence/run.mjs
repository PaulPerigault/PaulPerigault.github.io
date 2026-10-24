// `npm run check:web` : lance les vérifications de présence en ligne sur la production, écrit le
// rapport Markdown et sort en code 1 s'il y a au moins un échec (« non configuré » n'en est pas un).
//   node scripts/web-presence/run.mjs [--only=links,tls] [--out=web-presence-report.md]
import { appendFileSync, writeFileSync } from 'node:fs';
import { CHECKS } from './checks/index.mjs';
import { createContext } from './context.mjs';
import { hasFailure, renderReport } from './report.mjs';
import { executeChecks, selectChecks } from './runner.mjs';

const DEFAULT_OUT = 'web-presence-report.md';

export const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => arg.slice(2).split(/=(.*)/s).slice(0, 2)),
  );

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const ctx = createContext(process.env);
  const results = await executeChecks(ctx, selectChecks(CHECKS, args.only));
  const report = renderReport(results, { origin: ctx.origin, date: new Date(ctx.now()) });
  writeFileSync(args.out || DEFAULT_OUT, report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  for (const { id, status, problems, notes } of results) {
    console.log(
      `${status.toUpperCase().padEnd(7)} ${id}${problems[0] ? ` : ${problems[0]}` : ''}${status === 'skipped' ? ` : ${notes[0]}` : ''}`,
    );
  }
  return hasFailure(results) ? 1 : 0;
};

if (import.meta.main) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
