import * as path from 'path';
import * as fs from 'fs';
import { loadConfig, resolvePath } from '../config.js';
import { removeComponent } from '../installer.js';
import { PrmProjectConfig, ComponentType } from '../types.js';

export async function removeCommand(
  type: string,
  name: string,
  options: { tool?: string }
) {
  const projectDir = process.cwd();
  const config = await loadConfig();

  // 确定平台
  const platform = options.tool || getDefaultPlatform(projectDir);
  if (!platform) {
    console.error('✗ No platform specified. Use --tool or run prm init first.');
    process.exit(1);
  }

  const platformConfig = config.platforms[platform];
  if (!platformConfig) {
    console.error(`✗ Unknown platform: ${platform}`);
    process.exit(1);
  }

  // 移除
  try {
    await removeComponent({
      storeDir: resolvePath(config.storeDir),
      projectDir,
      platform,
      platformConfig,
      componentType: type as ComponentType,
      componentName: name,
    });
    console.log(`✓ Removed ${type} ${name} from ${platform}`);
  } catch (error) {
    console.error(`✗ Failed to remove: ${error}`);
    process.exit(1);
  }

  // 更新 prm.json
  await updatePrmJson(projectDir, platform, type, name);
}

function getDefaultPlatform(projectDir: string): string | null {
  const prmJsonPath = path.join(projectDir, '.prm', 'prm.json');
  if (!fs.existsSync(prmJsonPath)) return null;

  const prmJson = JSON.parse(fs.readFileSync(prmJsonPath, 'utf-8'));
  const deps = prmJson.dependencies;
  return Object.keys(deps)[0] || null;
}

async function updatePrmJson(projectDir: string, platform: string, type: string, name: string) {
  const prmJsonPath = path.join(projectDir, '.prm', 'prm.json');
  if (!fs.existsSync(prmJsonPath)) return;

  const prmJson: PrmProjectConfig = JSON.parse(fs.readFileSync(prmJsonPath, 'utf-8'));

  if (prmJson.dependencies[platform]?.[type]) {
    prmJson.dependencies[platform][type] = prmJson.dependencies[platform][type].filter(
      (n: string) => n !== name
    );
  }

  fs.writeFileSync(prmJsonPath, JSON.stringify(prmJson, null, 2));
}