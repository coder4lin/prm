import * as path from 'path';
import * as fs from 'fs';
import { loadConfig, resolvePath } from '../config.js';
import { installComponent, getInstallPath } from '../installer.js';
import { removeComponent } from '../installer.js';
import { PrmProjectConfig, ComponentType } from '../types.js';

export async function syncCommand(options: { force?: boolean }) {
  const projectDir = process.cwd();
  const prmJsonPath = path.join(projectDir, '.prm', 'prm.json');

  if (!fs.existsSync(prmJsonPath)) {
    console.log('No prm.json found. Run prm init first.');
    return;
  }

  const prmJson: PrmProjectConfig = JSON.parse(fs.readFileSync(prmJsonPath, 'utf-8'));
  const config = await loadConfig();
  const storeDir = resolvePath(config.storeDir);

  let synced = 0;
  let failed = 0;
  let removed = 0;

  // 第一步：安装或更新配置中的组件
  for (const [platform, deps] of Object.entries(prmJson.dependencies)) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
      console.warn(`⚠ Unknown platform: ${platform}`);
      failed++;
      continue;
    }

    for (const [type, names] of Object.entries(deps as Record<string, string[]>)) {
      const componentType = type as ComponentType;
      for (const name of names) {
        try {
          await installComponent({
            storeDir,
            projectDir,
            platform,
            platformConfig,
            componentType,
            componentName: name,
            isGlobal: false,
          });
          synced++;
        } catch (e) {
          console.warn(`⚠ Failed to sync ${platform}/${type}/${name}: ${e}`);
          failed++;
        }
      }
    }
  }

  // 第二步：删除不在配置中的组件
  for (const [platform, deps] of Object.entries(prmJson.dependencies)) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) continue;

    const configDeps = deps as Record<string, string[]>;

    // 处理 skill 和 agent（文件/目录类型）
    for (const componentType of ['skill', 'agent'] as const) {
      const installInfo = getInstallPath(projectDir, platformConfig, componentType, false);
      if (!installInfo) continue;

      const targetDir = installInfo.dir;
      if (!fs.existsSync(targetDir)) continue;

      // 获取目标目录中的已安装组件
      const installed = fs.readdirSync(targetDir, { withFileTypes: true })
        .filter(d => d.isDirectory() || d.name.endsWith('.md') || d.name.endsWith('.mdc') || !d.name.includes('.'))
        .map(d => d.name);

      // 获取配置中的组件
      const configured = new Set(configDeps[componentType] || []);

      // 删除不在配置中的组件
      for (const name of installed) {
        if (!configured.has(name)) {
          const fullPath = path.join(targetDir, name);
          try {
            if (fs.statSync(fullPath).isDirectory()) {
              fs.rmSync(fullPath, { recursive: true });
            } else {
              fs.unlinkSync(fullPath);
            }
            console.log(`✓ Removed ${name} (${componentType}) from ${platform}`);
            removed++;
          } catch (e) {
            console.warn(`⚠ Failed to remove ${name}: ${e}`);
          }
        }
      }
    }

    // 处理 MCP（特殊：存储在 JSON 文件中）
    const mcpInstallInfo = getInstallPath(projectDir, platformConfig, 'mcp', false);
    if (mcpInstallInfo) {
      const mcpConfigPath = path.join(mcpInstallInfo.dir, mcpInstallInfo.baseName);
      if (fs.existsSync(mcpConfigPath)) {
        const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
        const configuredMcp = new Set(configDeps.mcp || []);

        // 删除不在配置中的 MCP
        for (const mcpName of Object.keys(mcpConfig.mcpServers || {})) {
          if (!configuredMcp.has(mcpName)) {
            delete mcpConfig.mcpServers[mcpName];
            console.log(`✓ Removed MCP ${mcpName} from ${platform}`);
            removed++;
          }
        }

        // 如果 mcpServers 为空，删除整个文件
        if (Object.keys(mcpConfig.mcpServers || {}).length === 0) {
          fs.unlinkSync(mcpConfigPath);
          console.log(`✓ Removed MCP config file from ${platform}`);
          removed++;
        } else {
          fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
        }
      }
    }
  }

  // 第三步：删除完全移除的平台目录
  const configuredPlatforms = new Set(Object.keys(prmJson.dependencies));

  // 遍历所有平台，检查哪些需要清理
  for (const [platform, platformConfig] of Object.entries(config.platforms)) {
    if (configuredPlatforms.has(platform)) continue;

    // 获取项目目录下的平台目录路径
    const dirs = platformConfig.project;
    const projectPlatformDir = dirs?.skill?.dir || dirs?.agent?.dir || dirs?.mcp?.dir
      ? projectDir  // 使用项目根目录
      : null;

    // 删除项目目录下的平台目录（如果存在）
    if (projectPlatformDir && fs.existsSync(projectPlatformDir)) {
      try {
        // 检查目录是否看起来像 prm 创建的
        const entries = fs.readdirSync(projectPlatformDir, { withFileTypes: true });
        const hasSkillsDir = entries.some(e => e.isDirectory() && e.name === 'skills');
        const hasAgentsDir = entries.some(e => e.isDirectory() && e.name === 'agents');
        const hasMcpFile = entries.some(e => !e.isDirectory() && e.name.includes('settings'));

        // 如果目录看起来是 prm 创建的，删除它
        if (hasSkillsDir || hasAgentsDir || hasMcpFile) {
          fs.rmSync(projectPlatformDir, { recursive: true });
          console.log(`✓ Removed platform directory: ${projectPlatformDir}`);
          removed++;
        }
      } catch (e) {
        console.warn(`⚠ Failed to remove directory ${projectPlatformDir}: ${e}`);
      }
    }

    // 也检查并删除项目目录下的配置文件（如 settings.local.json）
    if (platformConfig.project?.mcp) {
      const mcpInstallInfo = getInstallPath(projectDir, platformConfig, 'mcp', false);
      if (mcpInstallInfo) {
        const mcpConfigPath = path.join(mcpInstallInfo.dir, mcpInstallInfo.baseName);
        if (fs.existsSync(mcpConfigPath)) {
          try {
            fs.unlinkSync(mcpConfigPath);
            console.log(`✓ Removed MCP config: ${mcpConfigPath}`);
            removed++;
          } catch (e) {
            console.warn(`⚠ Failed to remove ${mcpConfigPath}: ${e}`);
          }
        }
      }
    }
  }

  console.log(`✓ Sync complete: ${synced} synced, ${removed} removed, ${failed} failed`);
}