import * as path from 'path';
import * as fs from 'fs';
import { loadConfig, resolvePath } from '../config.js';
import { scanStore } from '../store.js';
import { installComponent } from '../installer.js';
import { PrmProjectConfig, ComponentType } from '../types.js';

export async function addCommand(
  type: string,
  name: string,
  options: { tool?: string; global?: boolean; copy?: boolean }
) {
  const projectDir = process.cwd();
  const config = await loadConfig();
  const store = await scanStore(resolvePath(config.storeDir));

  // 验证组件类型
  const validTypes: ComponentType[] = ['skill', 'agent', 'mcp'];
  if (!validTypes.includes(type as ComponentType)) {
    console.error(`✗ Invalid component type: ${type}`);
    console.log(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  // 验证组件存在
  const storeKey = type === 'skill' ? 'skills' : type === 'agent' ? 'agents' : 'mcps';
  if (!store[storeKey]?.includes(name)) {
    console.error(`✗ Component not found in store: ${type}/${name}`);
    console.log(`Available ${type}s: ${store[storeKey]?.join(', ') || 'none'}`);
    process.exit(1);
  }

  // 确定平台
  const platform = options.tool || getDefaultPlatform(projectDir);
  if (!platform) {
    console.error('✗ No platform specified. Use --tool or run prm init first.');
    process.exit(1);
  }

  const platformConfig = config.platforms[platform];
  if (!platformConfig) {
    console.error(`✗ Unknown platform: ${platform}`);
    console.log(`Available platforms: ${Object.keys(config.platforms).join(', ')}`);
    process.exit(1);
  }

  const typeConfig = platformConfig.project?.[type as ComponentType] || platformConfig.global?.[type as ComponentType];
  // 验证平台支持该组件类型
  if (!typeConfig) {
    console.error(`✗ Platform ${platform} does not support ${type}`);
    process.exit(1);
  }

  // 检查全局安装是否支持
  if (options.global && !platformConfig.global) {
    console.error(`✗ Platform ${platform} does not support global installation`);
    process.exit(1);
  }

  // 安装
  try {
    await installComponent({
      storeDir: resolvePath(config.storeDir),
      projectDir,
      platform,
      platformConfig,
      componentType: type as ComponentType,
      componentName: name,
      isGlobal: options.global || false,
      isCopy: options.copy,
    });
    console.log(`✓ Added ${type} ${name} to ${platform}${options.global ? ' (global)' : ''}`);
  } catch (error) {
    console.error(`✗ Failed to add: ${error}`);
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

  if (!prmJson.dependencies[platform]) {
    prmJson.dependencies[platform] = {};
  }
  if (!prmJson.dependencies[platform][type]) {
    prmJson.dependencies[platform][type] = [];
  }
  if (!prmJson.dependencies[platform][type].includes(name)) {
    prmJson.dependencies[platform][type].push(name);
  }

  fs.writeFileSync(prmJsonPath, JSON.stringify(prmJson, null, 2));
}