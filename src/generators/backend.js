import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

function backendTemplatePath(file) {
  return templatePath('backend', file);
}

async function appendGitignoreEntries(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  if (!(await fs.pathExists(gitignorePath))) return;

  const content = await fs.readFile(gitignorePath, 'utf-8');
  const entries = ['.docker/'];
  const toAppend = entries.filter((e) => !content.includes(e));

  if (toAppend.length > 0) {
    await fs.appendFile(gitignorePath, '\n# Docker\n' + toAppend.join('\n') + '\n');
  }
}

export async function generateBackend(answers, cwd) {
  const { backendFramework = 'hono', setupDocker = true } = answers;

  console.log(pc.green('→') + '  copying backend starter files...');

  // Backend-specific tsconfig.json (with outDir for emit)
  await copyIfMissing(backendTemplatePath('tsconfig.json'), path.join(cwd, 'tsconfig.json'), 'tsconfig.json');

  // .mise.toml
  await copyIfMissing(backendTemplatePath('.mise.toml'), path.join(cwd, '.mise.toml'), '.mise.toml');

  // Framework-specific entry point
  const srcDir = path.join(cwd, 'src');
  await fs.ensureDir(srcDir);

  const entryDest = path.join(cwd, 'src/index.ts');
  if (!(await fs.pathExists(entryDest))) {
    await fs.copyFile(backendTemplatePath(`src/index.${backendFramework}.ts`), entryDest);
    console.log(pc.green('✔') + '    src/index.ts');
  } else {
    console.log(pc.dim('–') + '    src/index.ts (already exists, skipped)');
  }

  // Zod env validation
  await copyIfMissing(backendTemplatePath('src/env.ts'), path.join(cwd, 'src/env.ts'), 'src/env.ts');

  // Docker files
  if (setupDocker) {
    await copyIfMissing(backendTemplatePath('Dockerfile'), path.join(cwd, 'Dockerfile'), 'Dockerfile');
    await copyIfMissing(
      backendTemplatePath('docker-compose.yml'),
      path.join(cwd, 'docker-compose.yml'),
      'docker-compose.yml',
    );
    await copyIfMissing(backendTemplatePath('.dockerignore'), path.join(cwd, '.dockerignore'), '.dockerignore');
    await appendGitignoreEntries(cwd);
  }
}
