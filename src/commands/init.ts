import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, resolvePath } from '../config.js';
import { installComponent } from '../installer.js';
import { PrmProjectConfig } from '../types.js';
import { getIndex, ComponentMetadata } from '../store-index.js';
import enquirer from 'enquirer';

function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// 安全执行 prompt，用户按 ESC 时返回 null
async function safePrompt<T>(promptFn: () => Promise<T>): Promise<T | null> {
  try {
    return await promptFn();
  } catch (error: any) {
    // 用户按 ESC 取消
    if (error === '' || error?.message === 'canceled' || error?.message?.includes('canceled')) {
      return null;
    }
    throw error;
  }
}

export async function initCommand(options: { tool?: string[] }) {
  const projectDir = process.cwd();
  const prmDir = path.join(projectDir, '.prm');
  const prmJsonPath = path.join(prmDir, 'prm.json');

  // 如果有 --tool 参数，直接使用（跳过不必要的配置加载）
  if (options.tool && options.tool.length > 0) {
    const existingConfig = loadExistingConfig(prmJsonPath);
    await initWithTools(options.tool, prmDir, prmJsonPath, projectDir, existingConfig);
    return;
  }

  // 加载配置和本地仓库
  const config = await loadConfig();
  const storeDir = resolvePath(config.storeDir);
  const index = await getIndex(storeDir);

  // 计算终端宽度和列宽
  const width = getTerminalWidth();
  const nameWidth = 30;
  const descWidth = width - nameWidth - 6; // 6 = padding between name and desc

  // 读取现有的 prm.json（如果存在）
  const existingConfig = loadExistingConfig(prmJsonPath);

  // 交互式选择 - 使用 enquirer 的 prompt 方法
  const platformChoices = Object.keys(config.platforms).filter(
    platform => config.platforms[platform] !== undefined
  );

  const answers: any = await safePrompt(() => enquirer.prompt([
    {
      type: 'multiselect',
      name: 'platforms',
      message: 'Select platforms (space to select, enter to confirm)',
      choices: platformChoices,
      initial: existingConfig ? Object.keys(existingConfig.dependencies || {}) : [],
    } as any,
  ]));

  // 用户按 ESC 取消
  if (answers === null) {
    console.log('\n✖ Initialization cancelled');
    return;
  }

  // 如果用户没选择任何平台，直接清空 dependencies 并退出
  const platforms = answers.platforms || [];

  if (platforms.length === 0) {
    // 用户取消选择所有平台，清空 dependencies
    const projectConfig: PrmProjectConfig = {
      name: path.basename(projectDir),
      version: '0.1.0',
      dependencies: {},
    };
    fs.mkdirSync(prmDir, { recursive: true });
    fs.writeFileSync(prmJsonPath, JSON.stringify(projectConfig, null, 2));
    console.log('✓ Project cleared');
    return;
  }

  // 重新构建 dependencies（只包含用户选择的平台）
  const dependencies: Record<string, Record<string, string[]>> = {};

  for (const platform of platforms) {
    dependencies[platform] = {};

    const pconfig = config.platforms[platform]?.project || config.platforms[platform]?.global || {};
    const existingDeps = existingConfig?.dependencies?.[platform] || {};

    // 选择 skills
    if (pconfig.skill && index.skills.length > 0) {
      const skillChoices = index.skills.map((skill: ComponentMetadata) => ({
        name: path.basename(skill.path), // 使用实际目录名
        message: skill.name.padEnd(nameWidth) + (skill.description ? truncate(skill.description, descWidth) : ''),
      }));
      const skillAnswers: any = await safePrompt(() => enquirer.prompt([
        {
          type: 'multiselect',
          name: 'skills',
          message: `Select skills for ${platform}`,
          choices: skillChoices,
          initial: existingDeps.skill || [],
        } as any,
      ]));
      // 用户按 ESC 取消，跳过此平台
      if (skillAnswers === null) {
        console.log('\n✖ Initialization cancelled');
        return;
      }
      // 用户选择的结果（空数组表示取消所有）
      if (skillAnswers.skills) {
        dependencies[platform].skill = skillAnswers.skills;
      }
    }

    // 选择 agents
    if (pconfig.agent && index.agents.length > 0) {
      const agentChoices = index.agents.map((agent: ComponentMetadata) => ({
        name: path.basename(agent.path), // 使用实际文件名
        message: agent.name.padEnd(nameWidth) + (agent.description ? truncate(agent.description, descWidth) : ''),
      }));
      const agentAnswers: any = await safePrompt(() => enquirer.prompt([
        {
          type: 'multiselect',
          name: 'agents',
          message: `Select agents for ${platform}`,
          choices: agentChoices,
          initial: existingDeps.agent || [],
        } as any,
      ]));
      // 用户按 ESC 取消，跳过此平台
      if (agentAnswers === null) {
        console.log('\n✖ Initialization cancelled');
        return;
      }
      if (agentAnswers.agents) {
        dependencies[platform].agent = agentAnswers.agents;
      }
    }

    // 选择 mcps
    if (pconfig.mcp && index.mcps.length > 0) {
      const mcpChoices = index.mcps.map((mcp: ComponentMetadata) => ({
        name: path.basename(mcp.path, '.json'), // 使用实际文件名
        message: mcp.name.padEnd(nameWidth) + (mcp.description ? truncate(mcp.description, descWidth) : ''),
      }));
      const mcpAnswers: any = await safePrompt(() => enquirer.prompt([
        {
          type: 'multiselect',
          name: 'mcps',
          message: `Select MCPs for ${platform}`,
          choices: mcpChoices,
          initial: existingDeps.mcp || [],
        } as any,
      ]));
      // 用户按 ESC 取消，跳过此平台
      if (mcpAnswers === null) {
        console.log('\n✖ Initialization cancelled');
        return;
      }
      if (mcpAnswers.mcps) {
        dependencies[platform].mcp = mcpAnswers.mcps;
      }
    }
  }

  // 写入 prm.json
  const projectConfig: PrmProjectConfig = {
    name: path.basename(projectDir),
    version: '0.1.0',
    dependencies,
  };

  fs.mkdirSync(prmDir, { recursive: true });
  fs.writeFileSync(prmJsonPath, JSON.stringify(projectConfig, null, 2));

  // 并行安装所有平台的组件
  await Promise.all(platforms.map(async (platform: string) => {
    const platformConfig = config.platforms[platform];
    const deps = projectConfig.dependencies[platform];
    const installPromises: Promise<void>[] = [];

    for (const name of deps.skill || []) {
      installPromises.push(installComponent({
        storeDir, projectDir, platform, platformConfig,
        componentType: 'skill', componentName: name, isGlobal: false,
      }));
    }

    for (const name of deps.agent || []) {
      installPromises.push(installComponent({
        storeDir, projectDir, platform, platformConfig,
        componentType: 'agent', componentName: name, isGlobal: false,
      }));
    }

    for (const name of deps.mcp || []) {
      installPromises.push(installComponent({
        storeDir, projectDir, platform, platformConfig,
        componentType: 'mcp', componentName: name, isGlobal: false,
      }));
    }

    await Promise.all(installPromises);
  }));

  console.log('✓ Project initialized');
}

async function initWithTools(
  tools: string[],
  prmDir: string,
  prmJsonPath: string,
  projectDir: string,
  existingConfig: PrmProjectConfig | null
) {
  const dependencies = existingConfig?.dependencies ? { ...existingConfig.dependencies } : {};

  for (const platform of tools) {
    if (!dependencies[platform]) {
      dependencies[platform] = {};
    }
  }

  const projectConfig: PrmProjectConfig = {
    name: path.basename(projectDir),
    version: '0.1.0',
    dependencies,
  };

  fs.mkdirSync(prmDir, { recursive: true });
  fs.writeFileSync(prmJsonPath, JSON.stringify(projectConfig, null, 2));

  console.log(`✓ Project initialized with platforms: ${tools.join(', ')}`);
}

function loadExistingConfig(prmJsonPath: string): PrmProjectConfig | null {
  if (fs.existsSync(prmJsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(prmJsonPath, 'utf-8'));
    } catch {
      // 忽略解析错误
    }
  }
  return null;
}