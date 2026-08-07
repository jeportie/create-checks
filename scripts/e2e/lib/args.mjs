export const HELP = `tskickstart E2E install matrix

Usage:
  node scripts/e2e/run.mjs [options]

Tiers:
  --tier=gen        Tier 1 only: scaffold every combination with NO_INSTALL, assert
                    exit 0 + core files. Fast, no network. (default)
  --tier=verify     Tier 2 only: real install + \`npm run check\` (+ build) on the
                    curated subset. Slow, needs the npm registry.
  --tier=all        Both tiers.

Filters (combine freely; all are AND-ed):
  --type=<t>        npm-lib | cli | backend | frontend | app
  --group=<g>       group id prefix, e.g. backend-db, common-toggles
  --linter=<l>      eslint | biome
  --framework=<f>   backend or cli framework (hono/fastify/express/elysia/commander/...)
  --db-engine=<e>   postgresql | mysql | mariadb | sqlite | mongodb
  --orm=<o>         none | drizzle | prisma | mongoose
  --only="K=V,K=V"  match raw env vars, e.g. --only="SETUP_REDIS=1,LINTER=biome"
  --grep=<regex>    match against the combination id

Other:
  --concurrency=N   parallel workers (default 8 for gen, 2 for verify)
  --bail            stop scheduling new work after the first failure
  --list            print the selected combinations and exit (no runs)
  --keep            keep the temp project dirs (do not clean up)
  --report=<path>   where to write the JSON report (default ./e2e-report.json)
  -h, --help        this help

Examples:
  node scripts/e2e/run.mjs --tier=gen --type=backend
  node scripts/e2e/run.mjs --only="LINTER=biome"
  node scripts/e2e/run.mjs --tier=verify --type=frontend
`;

export function parseArgs(argv) {
  const args = {
    tier: 'gen',
    filters: {},
    concurrency: 0,
    bail: false,
    list: false,
    keep: false,
    help: false,
    reportPath: '',
  };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--bail') args.bail = true;
    else if (raw === '--list') args.list = true;
    else if (raw === '--keep') args.keep = true;
    else if (raw.startsWith('--tier=')) args.tier = raw.slice('--tier='.length);
    else if (raw.startsWith('--concurrency=')) args.concurrency = Number(raw.slice('--concurrency='.length)) || 0;
    else if (raw.startsWith('--report=')) args.reportPath = raw.slice('--report='.length);
    else if (raw.startsWith('--type=')) args.filters.type = raw.slice('--type='.length);
    else if (raw.startsWith('--group=')) args.filters.group = raw.slice('--group='.length);
    else if (raw.startsWith('--linter=')) args.filters.linter = raw.slice('--linter='.length);
    else if (raw.startsWith('--framework=')) args.filters.framework = raw.slice('--framework='.length);
    else if (raw.startsWith('--db-engine=')) args.filters.dbEngine = raw.slice('--db-engine='.length);
    else if (raw.startsWith('--orm=')) args.filters.orm = raw.slice('--orm='.length);
    else if (raw.startsWith('--only=')) args.filters.only = raw.slice('--only='.length);
    else if (raw.startsWith('--grep=')) args.filters.grep = raw.slice('--grep='.length);
    else throw new Error(`Unknown argument: ${raw} (try --help)`);
  }
  return args;
}

export function applyFilters(combos, filters) {
  let out = combos;
  if (filters.type) out = out.filter((c) => c.type === filters.type);
  if (filters.group) out = out.filter((c) => c.group === filters.group || c.group.startsWith(filters.group));
  if (filters.linter) out = out.filter((c) => c.env.LINTER === filters.linter);
  if (filters.framework) {
    out = out.filter((c) => c.env.BACKEND_FRAMEWORK === filters.framework || c.env.CLI_FRAMEWORK === filters.framework);
  }
  if (filters.dbEngine) out = out.filter((c) => c.env.DB_ENGINE === filters.dbEngine);
  if (filters.orm) out = out.filter((c) => c.env.DB_ORM === filters.orm);
  if (filters.only) {
    const pairs = filters.only
      .split(',')
      .map((part) => part.split('='))
      .filter((kv) => kv.length === 2);
    out = out.filter((c) => pairs.every(([key, value]) => String(c.env[key]) === value));
  }
  if (filters.grep) {
    const re = new RegExp(filters.grep);
    out = out.filter((c) => re.test(c.id));
  }
  return out;
}
