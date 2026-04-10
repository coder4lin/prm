import { getIndex } from '../store-index.js';
import { loadConfig, resolvePath } from '../config.js';
import * as path from 'path';

function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export async function storeListCommand() {
  try {
    const config = await loadConfig();
    const storeDir = resolvePath(config.storeDir);

    // Get or generate index
    const index = await getIndex(storeDir);

    const width = getTerminalWidth();
    const nameWidth = 30;
    const descWidth = width - nameWidth - 6; // 6 = "  " + padding

    console.log(`\nLocal store: ${storeDir}\n`);

    if (index.skills.length > 0) {
      console.log('skills:');
      for (const skill of index.skills) {
        const name = truncate(skill.name, nameWidth);
        const desc = truncate(skill.description || '', descWidth);
        console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
      }
    }

    if (index.agents.length > 0) {
      console.log('agents:');
      for (const agent of index.agents) {
        const name = truncate(agent.name, nameWidth);
        const desc = truncate(agent.description || '', descWidth);
        console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
      }
    }

    if (index.mcps.length > 0) {
      console.log('mcps:');
      for (const mcp of index.mcps) {
        const name = truncate(mcp.name, nameWidth);
        const desc = truncate(mcp.description || '', descWidth);
        console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
      }
    }

    if (index.skills.length === 0 && index.agents.length === 0 && index.mcps.length === 0) {
      console.log('No components in store.');
    }

    console.log('');
  } catch (error) {
    console.error('Failed to list store:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}