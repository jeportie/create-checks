#!/usr/bin/env node

import pc from 'picocolors';

import { generateCommon } from './generators/common.js';
import { askCommonQuestions } from './prompts/common.js';
import { askProjectType } from './prompts/project-type.js';

console.log(pc.cyan('\n🔧 tskickstart — setting up the project...\n'));

const projectType = await askProjectType();
const answers = {
  projectType,
  ...(await askCommonQuestions(projectType)),
};

if (projectType === 'frontend') {
  try {
    const { askFrontendQuestions } = await import('./prompts/frontend.js');
    Object.assign(answers, await askFrontendQuestions());
  } catch {
    // Frontend module is optional until feature branch is merged.
  }
}

if (projectType === 'npm-lib') {
  try {
    const { askNpmLibQuestions } = await import('./prompts/npm-lib.js');
    Object.assign(answers, await askNpmLibQuestions());
  } catch {
    // npm-lib module is optional until feature branch is merged.
  }
}

if (projectType === 'cli') {
  try {
    const { askCliQuestions } = await import('./prompts/cli.js');
    Object.assign(answers, await askCliQuestions());
  } catch {
    // CLI module is optional until feature branch is merged.
  }
}

if (projectType === 'backend') {
  try {
    const { askBackendQuestions } = await import('./prompts/backend.js');
    Object.assign(answers, await askBackendQuestions());
  } catch {
    // Backend module is optional until feature branch is merged.
  }
}

if (projectType === 'app') {
  try {
    const { askAppQuestions } = await import('./prompts/app.js');
    Object.assign(answers, await askAppQuestions());
  } catch {
    // App module is optional until feature branch is merged.
  }
}

await generateCommon(answers, process.cwd());

if (projectType === 'frontend') {
  try {
    const { generateFrontend } = await import('./generators/frontend.js');
    await generateFrontend(answers, process.cwd());
  } catch {
    // Frontend module is optional until feature branch is merged.
  }
}

if (projectType === 'npm-lib') {
  try {
    const { generateNpmLib } = await import('./generators/npm-lib.js');
    await generateNpmLib(answers, process.cwd());
  } catch {
    // npm-lib module is optional until feature branch is merged.
  }
}

if (projectType === 'cli') {
  try {
    const { generateCli } = await import('./generators/cli.js');
    await generateCli(answers, process.cwd());
  } catch {
    // CLI module is optional until feature branch is merged.
  }
}

if (projectType === 'backend') {
  try {
    const { generateBackend } = await import('./generators/backend.js');
    await generateBackend(answers, process.cwd());
  } catch {
    // Backend module is optional until feature branch is merged.
  }
}

if (projectType === 'app') {
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

console.log(pc.green('\n✅ Done!\n'));
