import * as fs from 'fs';
import * as path from 'path';
import { ComponentInfo, ComponentType } from './types.js';
import { resolvePath, loadConfig } from './config.js';
import enquirer from 'enquirer';

export async function getStoreDir(): Promise<string> {
  const config = await loadConfig();
  return resolvePath(config.storeDir);
}

export async function installToStore(
  storeDir: string,
  sourcePath: string,
  component: ComponentInfo,
  force: boolean = false
): Promise<void> {
  const typeDir = component.type === 'mcp' ? 'mcp' : `${component.type}s`;
  const destDir = path.join(storeDir, typeDir);
  const destPath = path.join(destDir, component.name);

  // 检查是否已存在
  if (fs.existsSync(destPath) && !force) {
    const { overwrite }: { overwrite: boolean } = await enquirer.prompt({
      type: 'confirm',
      name: 'overwrite',
      message: `Component "${component.name}" already exists. Overwrite?`,
      initial: false,
    });
    if (!overwrite) {
      console.log('Skipped.');
      return;
    }
  }

  // 创建目录并复制
  fs.mkdirSync(destDir, { recursive: true });

  // 如果目标已存在，先删除
  if (fs.existsSync(destPath)) {
    if (fs.statSync(destPath).isDirectory()) {
      await fs.promises.rm(destPath, { recursive: true });
    } else {
      fs.unlinkSync(destPath);
    }
  }

  const sourceStat = fs.statSync(sourcePath);
  if (sourceStat.isDirectory()) {
    await copyDir(sourcePath, destPath);
  } else {
    fs.copyFileSync(sourcePath, destPath);
  }

  console.log(`✓ Installed ${component.type} "${component.name}" to ${destDir}`);
}

async function copyDir(src: string, dest: string): Promise<void> {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export async function listStoreComponents(storeDir: string): Promise<{
  skills: string[];
  agents: string[];
  mcps: string[];
}> {
  const result = { skills: [] as string[], agents: [] as string[], mcps: [] as string[] };

  const skillsDir = path.join(storeDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    result.skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() || d.name.endsWith('.md') || d.name.endsWith('.mdc') || !d.name.includes('.'))
      .map(d => d.name);
  }

  const agentsDir = path.join(storeDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    result.agents = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() || d.name.endsWith('.md') || d.name.endsWith('.mdc') || !d.name.includes('.'))
      .map(d => d.name);
  }

  const mcpDir = path.join(storeDir, 'mcp');
  if (fs.existsSync(mcpDir)) {
    result.mcps = fs.readdirSync(mcpDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.json'))
      .map(d => d.name.replace('.json', ''));
  }

  return result;
}