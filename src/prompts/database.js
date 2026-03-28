import { prompt } from '../utils/prompt.js';

const ormChoicesByEngine = {
  postgresql: ['none', 'drizzle', 'prisma'],
  mysql: ['none', 'drizzle', 'prisma'],
  mariadb: ['none', 'drizzle', 'prisma'],
  sqlite: ['none', 'drizzle', 'prisma'],
  mongodb: ['mongoose'],
};

export async function askDatabaseQuestions() {
  let setupDatabase = false;
  if (process.env.SETUP_DATABASE === '1') {
    setupDatabase = true;
  } else if (process.env.SETUP_DATABASE === '0') {
    setupDatabase = false;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupDatabase',
        message: 'Set up a database?',
        default: true,
      },
    ]);
    setupDatabase = result.setupDatabase;
  }

  if (!setupDatabase) {
    return { setupDatabase: false };
  }

  let databaseEngine = process.env.DB_ENGINE;
  if (!databaseEngine && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'databaseEngine',
        message: 'Which database engine?',
        choices: ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mongodb'],
      },
    ]);
    databaseEngine = result.databaseEngine;
  }

  databaseEngine ??= 'postgresql';

  const allowedOrmOptions = ormChoicesByEngine[databaseEngine] || ['none'];
  let databaseOrm = process.env.DB_ORM;

  if (!databaseOrm && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'databaseOrm',
        message: 'ORM layer?',
        choices: allowedOrmOptions,
      },
    ]);
    databaseOrm = result.databaseOrm;
  }

  if (!allowedOrmOptions.includes(databaseOrm)) {
    databaseOrm = allowedOrmOptions[0];
  }

  let setupRedis = false;
  if (process.env.SETUP_REDIS === '1') {
    setupRedis = true;
  } else if (process.env.SETUP_REDIS === '0') {
    setupRedis = false;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupRedis',
        message: 'Set up Redis for caching?',
        default: true,
      },
    ]);
    setupRedis = result.setupRedis;
  }

  return {
    setupDatabase,
    databaseEngine,
    databaseOrm,
    setupRedis,
  };
}
