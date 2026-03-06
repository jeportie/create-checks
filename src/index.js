#!/usr/bin/env node

import pc from 'picocolors';

import { generateCommon } from './generators/common.js';
import { askCommonQuestions } from './prompts/common.js';
import { askProjectType } from './prompts/project-type.js';

console.log(pc.cyan('\n🔧 tskickstart — setting up the project...\n'));

const projectType = await askProjectType();
const answers = {
  projectType,
  ...(await askCommonQuestions()),
};

if (projectType === 'frontend') {
  try {
    const { askFrontendQuestions } = await import('./prompts/frontend.js');
    Object.assign(answers, await askFrontendQuestions());
  } catch {
    // Frontend module is optional until feature branch is merged.
  }
}

if (projectType === 'frontend' || projectType === 'fullstack') {
  try {
    const { askPlaywrightQuestion } = await import('./prompts/playwright.js');
    Object.assign(answers, await askPlaywrightQuestion(projectType));
  } catch {
    // Playwright module is optional until feature branch is merged.
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

if (answers.setupPlaywright) {
  try {
    const { generatePlaywright } = await import('./generators/playwright.js');
    await generatePlaywright(answers, process.cwd());
  } catch {
    // Playwright module is optional until feature branch is merged.
  }
}

console.log(pc.green('\n✅ Done!\n'));
