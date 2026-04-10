import * as path from 'path';
import * as fs from 'fs';
import { PrmProjectConfig } from '../types.js';
import { getIndex } from '../store-index.js';
import { loadConfig, resolvePath } from '../config.js';

function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export async function listCommand(options: { tool?: string }) {
  try {
    const projectDir = process.cwd();
    const prmJsonPath = path.join(projectDir, '.prm', 'prm.json');

    if (!fs.existsSync(prmJsonPath)) {
      console.log('No prm.json found. Run prm init first.');
      return;
    }

    const prmJson: PrmProjectConfig = JSON.parse(fs.readFileSync(prmJsonPath, 'utf-8'));
    const deps = prmJson.dependencies;

    // 获取 store 索引
    const config = await loadConfig();
    const storeDir = resolvePath(config.storeDir);
    const index = await getIndex(storeDir);

    // 创建 name -> description 映射
    const skillDescMap = new Map(index.skills.map(s => [s.name, s.description]));
    const agentDescMap = new Map(index.agents.map(a => [a.name, a.description]));
    const mcpDescMap = new Map(index.mcps.map(m => [m.name, m.description]));

    const platforms = options.tool ? [options.tool] : Object.keys(deps);
    const width = getTerminalWidth();
    const nameWidth = 30;
    const descWidth = width - nameWidth - 8; // 8 = "    " + padding

    for (const platform of platforms) {
      const platformDeps = deps[platform];
      if (!platformDeps) continue;

      console.log(`\n${platform}:`);

      for (const [type, names] of Object.entries(platformDeps)) {
        if (names && (names as string[]).length > 0) {
          console.log(`  ${type}:`);
          for (const name of names as string[]) {
            let desc = '';
            if (type === 'skill') desc = skillDescMap.get(name) || '';
            else if (type === 'agent') desc = agentDescMap.get(name) || '';
            else if (type === 'mcp') desc = mcpDescMap.get(name) || '';

            const truncatedName = truncate(name, nameWidth);
            const truncatedDesc = truncate(desc, descWidth);
            console.log(`    ${truncatedName.padEnd(nameWidth)} ${truncatedDesc}`);
          }
        }
      }
    }

    console.log('');
  } catch (error) {
    console.error('Failed to list components:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}