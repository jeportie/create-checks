#!/usr/bin/env node

import pc from 'picocolors';

import { generateCommon } from './generators/common.js';
import { askCommonQuestions } from './prompts/common.js';
import { askProjectType } from './prompts/project-type.js';
import { offerReadmePreview } from './utils/readme.js';
import { runWizard } from './utils/wizard.js';

console.log(pc.cyan('\n🔧 tskickstart — setting up the project...\n'));

const typeSpecificAskers = {
  backend: () => import('./prompts/backend.js').then((m) => m.askBackendQuestions()),
  frontend: () => import('./prompts/frontend.js').then((m) => m.askFrontendQuestions()),
  'npm-lib': () => import('./prompts/npm-lib.js').then((m) => m.askNpmLibQuestions()),
  cli: () => import('./prompts/cli.js').then((m) => m.askCliQuestions()),
  app: () => import('./prompts/app.js').then((m) => m.askAppQuestions()),
};

const answers = await runWizard([
  // Step 0: project type (no back — first step)
  async () => {
    const projectType = await askProjectType();
    return { projectType };
  },

  // Step 1: type-specific questions
  async (collected) => {
    const asker = typeSpecificAskers[collected.projectType];
    if (!asker) return {};
    try {
      return await asker();
    } catch {
      return {};
    }
  },

  // Step 2: common questions (lint, vitest, playwright, precommit, author)
  async (collected) => {
    return await askCommonQuestions(collected.projectType);
  },
]);

await generateCommon(answers, process.cwd());

if (answers.projectType === 'frontend') {
  try {
    const { generateFrontend } = await import('./generators/frontend.js');
    await generateFrontend(answers, process.cwd());
  } catch {
    // Frontend module is optional until feature branch is merged.
  }
}

if (answers.projectType === 'npm-lib') {
  try {
    const { generateNpmLib } = await import('./generators/npm-lib.js');
    await generateNpmLib(answers, process.cwd());
  } catch {
    // npm-lib module is optional until feature branch is merged.
  }
}

if (answers.projectType === 'cli') {
  try {
    const { generateCli } = await import('./generators/cli.js');
    await generateCli(answers, process.cwd());
  } catch {
    // CLI module is optional until feature branch is merged.
  }
}

if (answers.projectType === 'backend') {
  try {
    const { generateBackend } = await import('./generators/backend.js');
    await generateBackend(answers, process.cwd());
  } catch {
    // Backend module is optional until feature branch is merged.
  }
}

if (answers.projectType === 'app') {
  try {
    const { generateApp } = await import('./generators/app.js');
    await generateApp(answers, process.cwd());
  } catch {
    // App module is optional until feature branch is merged.
  }
}

if (answers.setupPlaywright) {
  try {
    const { generatePlaywright } = await import('./generators/playwright.js');
    await generatePlaywright(answers, process.cwd());
  } catch {
    // Playwright module is optional until feature branch is merged.
  }
}

await offerReadmePreview(process.cwd());

console.log(pc.green('\n✅ Done!\n'));
