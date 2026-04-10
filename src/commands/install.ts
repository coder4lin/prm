import * as path from 'path';
import * as fs from 'fs';
import { parseSource, scanLocalDir } from '../scan.js';
import { buildIndex, saveIndex } from '../store-index.js';
import { cloneRepo, scanRemoteRepo, cleanupTempDir } from '../remote.js';
import { getStoreDir, installToStore } from '../install-store.js';
import { ComponentType, ComponentInfo } from '../types.js';

interface InstallOptions {
  type?: ComponentType;
  name?: string;
  branch?: string;
  force?: boolean;
}

export async function installCommand(
  source: string,
  options: InstallOptions
) {
  console.log(`Installing from: ${source}`);

  // 解析来源
  let parsed;
  try {
    parsed = parseSource(source);
  } catch (e) {
    console.error(`✗ Invalid source: ${e}`);
    process.exit(1);
  }

  const storeDir = await getStoreDir();

  // 确保 store 目录存在
  fs.mkdirSync(path.join(storeDir, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(storeDir, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(storeDir, 'mcp'), { recursive: true });

  if (parsed.type === 'local') {
    await handleLocalSource(parsed.localPath!, storeDir, options);
  } else {
    await handleGitHubSource(parsed, storeDir, options);
  }

  // 安装完成后更新索引
  try {
    const index = await buildIndex(storeDir);
    await saveIndex(storeDir, index);
    console.log('Index updated.');
  } catch (e) {
    // 忽略索引更新错误，不影响安装结果
  }
}

async function handleLocalSource(
  localPath: string,
  storeDir: string,
  options: InstallOptions
) {
  if (!fs.existsSync(localPath)) {
    console.error(`✗ Directory not found: ${localPath}`);
    process.exit(1);
  }

  const components = await scanLocalDir(localPath);
  await installComponents(components, storeDir, options);
}

async function handleGitHubSource(
  parsed: {
    type: string;
    owner?: string;
    repo?: string;
    path?: string;
  },
  storeDir: string,
  options: InstallOptions
) {
  console.log(`Cloning ${parsed.owner}/${parsed.repo}...`);

  let tempDir: string | undefined;
  try {
    tempDir = await cloneRepo(parsed.owner!, parsed.repo!, options.branch);

    // 如果指定了 path，直接安装该路径
    if (parsed.path) {
      const sourcePath = path.join(tempDir, parsed.path);
      if (!fs.existsSync(sourcePath)) {
        console.error(`✗ Path not found in repository: ${parsed.path}`);
        process.exit(1);
      }

      const components = await scanLocalDir(sourcePath);
      await installComponents(components, storeDir, options);
    } else {
      // 扫描整个仓库
      const components = await scanRemoteRepo(tempDir);

      // 转换为 ComponentInfo 格式
      const allComponents = {
        skills: components.skills.map(name => ({
          name,
          path: path.join(tempDir!, 'skills', name),
          type: 'skill' as ComponentType,
        })),
        agents: components.agents.map(name => ({
          name,
          path: path.join(tempDir!, 'agents', name),
          type: 'agent' as ComponentType,
        })),
        mcps: components.mcps.map(name => ({
          name,
          path: path.join(tempDir!, 'mcp', `${name}.json`),
          type: 'mcp' as ComponentType,
        })),
      };

      if (options.type) {
        // 只安装指定类型
        const filtered = {
          skills: options.type === 'skill' ? allComponents.skills : [],
          agents: options.type === 'agent' ? allComponents.agents : [],
          mcps: options.type === 'mcp' ? allComponents.mcps : [],
        };
        await installComponents(filtered, storeDir, options);
      } else {
        await installComponents(allComponents, storeDir, options);
      }
    }
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}

async function installComponents(
  components: { skills: ComponentInfo[]; agents: ComponentInfo[]; mcps: ComponentInfo[] },
  storeDir: string,
  options: InstallOptions
) {
  let installed = 0;

  // 如果指定了自定义名称，替换所有组件的名称
  const customName = options.name;

  for (const skill of components.skills) {
    if (!fs.existsSync(skill.path)) continue;
    const skillToInstall = customName
      ? { ...skill, name: customName }
      : skill;
    await installToStore(storeDir, skillToInstall.path, skillToInstall, options.force || false);
    installed++;
  }

  for (const agent of components.agents) {
    if (!fs.existsSync(agent.path)) continue;
    const agentToInstall = customName
      ? { ...agent, name: customName }
      : agent;
    await installToStore(storeDir, agentToInstall.path, agentToInstall, options.force || false);
    installed++;
  }

  for (const mcp of components.mcps) {
    if (!fs.existsSync(mcp.path)) continue;
    const mcpToInstall = customName
      ? { ...mcp, name: customName }
      : mcp;
    await installToStore(storeDir, mcpToInstall.path, mcpToInstall, options.force || false);
    installed++;
  }

  if (installed === 0) {
    console.log('No components found to install.');
  } else {
    console.log(`\n✓ Installed ${installed} component(s)`);
  }
}