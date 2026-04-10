import { getIndex, ComponentMetadata } from '../store-index.js';
import { loadConfig, resolvePath } from '../config.js';

interface SearchOptions {
  type?: 'skill' | 'agent' | 'mcp';
}

function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function searchComponents(
  components: ComponentMetadata[],
  keyword: string
): ComponentMetadata[] {
  const lowerKeyword = keyword.toLowerCase();
  return components.filter(comp => {
    const nameMatch = comp.name.toLowerCase().includes(lowerKeyword);
    const descMatch = comp.description.toLowerCase().includes(lowerKeyword);
    return nameMatch || descMatch;
  });
}

function displayResults(
  results: { skills: ComponentMetadata[]; agents: ComponentMetadata[]; mcps: ComponentMetadata[] },
  keyword: string
): void {
  const total = results.skills.length + results.agents.length + results.mcps.length;
  console.log(`\nSearch results for "${keyword}" (${total} matches):\n`);

  const width = getTerminalWidth();
  const nameWidth = 30;
  const descWidth = width - nameWidth - 6;

  if (results.skills.length > 0) {
    console.log('skills:');
    for (const skill of results.skills) {
      const name = truncate(skill.name, nameWidth);
      const desc = truncate(skill.description || '', descWidth);
      console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
    }
  }

  if (results.agents.length > 0) {
    console.log('agents:');
    for (const agent of results.agents) {
      const name = truncate(agent.name, nameWidth);
      const desc = truncate(agent.description || '', descWidth);
      console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
    }
  }

  if (results.mcps.length > 0) {
    console.log('mcps:');
    for (const mcp of results.mcps) {
      const name = truncate(mcp.name, nameWidth);
      const desc = truncate(mcp.description || '', descWidth);
      console.log(`  ${name.padEnd(nameWidth)} ${desc}`);
    }
  }

  if (total === 0) {
    console.log('(no matches)');
  }

  console.log('');
}

export async function searchCommand(keyword: string, options: SearchOptions) {
  try {
    if (!keyword) {
      console.error('Error: search keyword is required');
      process.exit(1);
    }

    const config = await loadConfig();
    const storeDir = resolvePath(config.storeDir);
    const index = await getIndex(storeDir);

    const filterType = options.type;

    const results = {
      skills: filterType === undefined || filterType === 'skill'
        ? searchComponents(index.skills, keyword)
        : [],
      agents: filterType === undefined || filterType === 'agent'
        ? searchComponents(index.agents, keyword)
        : [],
      mcps: filterType === undefined || filterType === 'mcp'
        ? searchComponents(index.mcps, keyword)
        : [],
    };

    displayResults(results, keyword);
  } catch (error) {
    console.error('Search failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}