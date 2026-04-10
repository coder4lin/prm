#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { initConfigCommand } from './commands/init-config.js';
import { storeListCommand } from './commands/store.js';
import { installCommand } from './commands/install.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';
import { syncCommand } from './commands/sync.js';
import { listCommand } from './commands/list.js';
import { indexCommand } from './commands/index.js';
import { searchCommand } from './commands/search.js';

const program = new Command();

program
  .name('prm')
  .description('Prompt & Resource Manager - Manage AI project components')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize project with interactive selection')
  .option('-t, --tool <tools...>', 'Select platforms')
  .action(initCommand);

program
  .command('init-config')
  .description('Create default config file at ~/.prm/config.json')
  .argument('[storeDir]', 'Custom store directory path')
  .action(initConfigCommand);

program
  .command('install')
  .description('Install component from GitHub or local directory to store')
  .argument('<source>', 'GitHub: owner/repo[@path] or local: ./path')
  .option('-t, --type <type>', 'Component type: skill, agent, mcp')
  .option('-n, --name <name>', 'Component name (default: derived from source)')
  .option('-b, --branch <branch>', 'Git branch or tag')
  .option('-f, --force', 'Overwrite existing components')
  .action(installCommand);

program
  .command('add')
  .description('Add component from local store')
  .argument('<type>', 'Component type: skill, agent, mcp')
  .argument('<name>', 'Component name')
  .option('-t, --tool <platform>', 'Target platform')
  .option('-g, --global', 'Install globally')
  .option('--copy', 'Copy instead of symlink')
  .action(addCommand);

program
  .command('remove')
  .description('Remove component from project')
  .argument('<type>', 'Component type')
  .argument('<name>', 'Component name')
  .option('-t, --tool <platform>', 'Target platform')
  .action(removeCommand);

program
  .command('sync')
  .description('Sync all components from prm.json')
  .option('-f, --force', 'Force re-sync')
  .action(syncCommand);

program
  .command('list')
  .description('List installed components in project')
  .option('-t, --tool <platform>', 'Filter by platform')
  .action(listCommand);

program
  .command('store')
  .description('List components in local store')
  .action(storeListCommand);

program
  .command('index')
  .description('Build index of store components')
  .action(indexCommand);

program
  .command('search')
  .description('Search components in local store')
  .argument('<keyword>', 'Search keyword')
  .option('-t, --type <type>', 'Filter by type: skill, agent, mcp')
  .action(searchCommand);

program.parse();