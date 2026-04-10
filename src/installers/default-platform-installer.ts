import * as fs from 'fs';
import * as path from 'path';
import { PlatformConfig } from '../types.js';
import { PlatformInstaller, InstallOptions, RemoveOptions } from './platform-installer.js';
import { getComponentPath } from '../store.js';
import { resolvePath } from '../config.js';

/**
 * 获取安装路径信息
 */
export function getInstallPath(
  projectDir: string,
  platformConfig: PlatformConfig,
  componentType: 'skill' | 'agent' | 'mcp',
  isGlobal: boolean,
  componentName?: string
): { dir: string; baseName: string } | null {
  const dirs = isGlobal ? platformConfig.global : platformConfig.project;
  const typeConfig = dirs?.[componentType];
  if (!typeConfig) return null;

  const baseDir = isGlobal
    ? resolvePath(typeConfig.dir || '')
    : projectDir;

  if (typeConfig.file) {
    let fileName = typeConfig.file;
    if (fileName.includes('*') && componentName) {
      fileName = componentName + '.mdc';
    }
    return { dir: baseDir, baseName: fileName };
  }

  const dir = typeConfig.dir || componentType + 's';
  return { dir: path.join(baseDir, dir), baseName: '' };
}

/**
 * 递归复制目录
 */
function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 默认平台安装器
 * 提供通用的 skill/agent/mcp 安装和删除逻辑
 */
export class DefaultPlatformInstaller implements PlatformInstaller {

  async install(options: InstallOptions): Promise<void> {
    const { componentType } = options;
    switch (componentType) {
      case 'skill':
        return this.installSkill(options);
      case 'agent':
        return this.installAgent(options);
      case 'mcp':
        return this.installMcp(options);
    }
  }

  async remove(options: RemoveOptions): Promise<void> {
    const { componentType } = options;
    switch (componentType) {
      case 'skill':
        return this.removeSkill(options);
      case 'agent':
        return this.removeAgent(options);
      case 'mcp':
        return this.removeMcp(options);
    }
  }

  /**
   * 安装 Skill - 通用的 symlink 逻辑
   */
  async installSkill(options: InstallOptions): Promise<void> {
    const { storeDir, projectDir, platform, platformConfig, componentName, isGlobal, isCopy } = options;

    const srcPath = getComponentPath(storeDir, 'skill', componentName);
    const actualSrcPath = fs.existsSync(srcPath) ? srcPath : path.join(srcPath, componentName);

    if (!fs.existsSync(actualSrcPath)) {
      throw new Error(`Component not found in store: skill/${componentName}`);
    }

    const installInfo = getInstallPath(projectDir, platformConfig, 'skill', isGlobal, componentName);
    if (!installInfo) {
      throw new Error(`Platform ${platform} does not support skill`);
    }

    fs.mkdirSync(installInfo.dir, { recursive: true });
    const destPath = path.join(installInfo.dir, installInfo.baseName || componentName);

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    if (isCopy) {
      if (fs.statSync(actualSrcPath).isDirectory()) {
        copyDir(actualSrcPath, destPath);
      } else {
        fs.copyFileSync(actualSrcPath, destPath);
      }
    } else {
      fs.symlinkSync(actualSrcPath, destPath, fs.statSync(actualSrcPath).isDirectory() ? 'dir' : 'file');
    }
  }

  /**
   * 安装 Agent - 通用的 symlink 逻辑
   */
  async installAgent(options: InstallOptions): Promise<void> {
    const { storeDir, projectDir, platform, platformConfig, componentName, isGlobal, isCopy } = options;

    const srcPath = getComponentPath(storeDir, 'agent', componentName);
    const actualSrcPath = fs.existsSync(srcPath) ? srcPath : path.join(srcPath, componentName);

    if (!fs.existsSync(actualSrcPath)) {
      throw new Error(`Component not found in store: agent/${componentName}`);
    }

    const installInfo = getInstallPath(projectDir, platformConfig, 'agent', isGlobal, componentName);
    if (!installInfo) {
      throw new Error(`Platform ${platform} does not support agent`);
    }

    fs.mkdirSync(installInfo.dir, { recursive: true });
    const destPath = path.join(installInfo.dir, installInfo.baseName || componentName);

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    if (isCopy) {
      if (fs.statSync(actualSrcPath).isDirectory()) {
        copyDir(actualSrcPath, destPath);
      } else {
        fs.copyFileSync(actualSrcPath, destPath);
      }
    } else {
      fs.symlinkSync(actualSrcPath, destPath, fs.statSync(actualSrcPath).isDirectory() ? 'dir' : 'file');
    }
  }

  /**
   * 安装 MCP - 合并到 settings.local.json
   */
  async installMcp(options: InstallOptions): Promise<void> {
    const { storeDir, projectDir, platform, platformConfig, componentName, isGlobal } = options;

    const srcPath = getComponentPath(storeDir, 'mcp', componentName);
    const actualSrcPath = srcPath + '.json';

    if (!fs.existsSync(actualSrcPath)) {
      throw new Error(`Component not found in store: mcp/${componentName}`);
    }

    const installInfo = getInstallPath(projectDir, platformConfig, 'mcp', isGlobal, componentName);
    if (!installInfo) {
      throw new Error(`Platform ${platform} does not support mcp`);
    }

    // 读取 MCP 配置
    const mcpConfig = JSON.parse(fs.readFileSync(actualSrcPath, 'utf-8'));

    // 读取或创建目标 settings 文件
    const settingPath = path.join(installInfo.dir, installInfo.baseName);
    let existingConfig: Record<string, any> = {};

    if (fs.existsSync(settingPath)) {
      existingConfig = JSON.parse(fs.readFileSync(settingPath, 'utf-8'));
    }

    // 合并 mcpServers
    if (!existingConfig.mcpServers) {
      existingConfig.mcpServers = {};
    }
    existingConfig.mcpServers = { ...existingConfig.mcpServers, ...mcpConfig };

    fs.mkdirSync(installInfo.dir, { recursive: true });
    fs.writeFileSync(settingPath, JSON.stringify(existingConfig, null, 2));
  }

  /**
   * 删除 Skill
   */
  async removeSkill(options: RemoveOptions): Promise<void> {
    const { projectDir, platform, platformConfig } = options;

    const installInfo = getInstallPath(projectDir, platformConfig, 'skill', false);
    if (!installInfo) return;

    const destPath = path.join(installInfo.dir, installInfo.baseName || options.componentName);
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }

  /**
   * 删除 Agent
   */
  async removeAgent(options: RemoveOptions): Promise<void> {
    const { projectDir, platform, platformConfig } = options;

    const installInfo = getInstallPath(projectDir, platformConfig, 'agent', false);
    if (!installInfo) return;

    const destPath = path.join(installInfo.dir, installInfo.baseName || options.componentName);
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }

  /**
   * 删除 MCP - 从 JSON 中移除
   */
  async removeMcp(options: RemoveOptions): Promise<void> {
    const { projectDir, platform, platformConfig, componentName } = options;

    const installInfo = getInstallPath(projectDir, platformConfig, 'mcp', false);
    if (!installInfo) return;

    const settingPath = path.join(installInfo.dir, installInfo.baseName);
    if (!fs.existsSync(settingPath)) {
      return;
    }

    const existingConfig = JSON.parse(fs.readFileSync(settingPath, 'utf-8'));
    if (existingConfig.mcpServers && existingConfig.mcpServers[componentName]) {
      delete existingConfig.mcpServers[componentName];
      fs.writeFileSync(settingPath, JSON.stringify(existingConfig, null, 2));
    }
  }
}