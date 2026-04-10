import { buildIndex, saveIndex } from '../store-index.js';
import { loadConfig, getStoreDir } from '../config.js';

export async function indexCommand() {
  try {
    const config = await loadConfig();
    const storeDir = getStoreDir(config);

    console.log('Building index...');

    const index = await buildIndex(storeDir);
    await saveIndex(storeDir, index);

    console.log(`Index created with:`);
    console.log(`  - ${index.skills.length} skills`);
    console.log(`  - ${index.agents.length} agents`);
    console.log(`  - ${index.mcps.length} mcps`);
  } catch (error) {
    console.error('Failed to build index:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}