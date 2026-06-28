import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

import { startSession, ensureDirectories, startTempCleanupJob, SESSIONS_DIR } from './main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printBanner() {
  console.log('');
  console.log(chalk.magentaBright.bold('  ╔══════════════════════════════════════╗'));
  console.log(chalk.magentaBright.bold('  ║                                        ║'));
  console.log(
    '  ║      ' + chalk.cyanBright.bold('Made In Love For My Wife❣️') + '      ' + chalk.magentaBright.bold('║')
  );
  console.log(
    '  ║      ' + chalk.yellowBright('Creator:- Afroz Khan') + '            ' + chalk.magentaBright.bold('║')
  );
  console.log(chalk.magentaBright.bold('  ║                                        ║'));
  console.log(chalk.magentaBright.bold('  ╚══════════════════════════════════════╝'));
  console.log('');
}

function getSessionFolders() {
  const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function main() {
  printBanner();
  ensureDirectories();
  startTempCleanupJob();

  const sessionFolders = getSessionFolders();

  if (sessionFolders.length === 0) {
    console.log(chalk.redBright('No valid sessions found.'));
    console.log(chalk.redBright('Add a Baileys session folder inside sessions/.'));
    return;
  }

  for (const sessionId of sessionFolders) {
    try {
      await startSession(sessionId);
    } catch (err) {
      // One broken session must never stop the others from loading.
      console.error(chalk.red(`Failed to start session "${sessionId}":`), err?.message || err);
    }
  }
}

// Keep one session's runtime error from taking down the whole process.
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Unhandled rejection:'), err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error(chalk.red('Uncaught exception:'), err?.message || err);
});

main().catch((err) => {
  console.error(chalk.red('Fatal error during startup:'), err?.message || err);
  process.exit(1);
});
