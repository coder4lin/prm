import { simpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RemoteComponents } from './types.js';

const CLONE_TIMEOUT_MS = 120000;

export async function cloneRepo(
  owner: string,
  repo: string,
  branch?: string
): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `prm-${Date.now()}`);
  const url = `https://github.com/${owner}/${repo}.git`;

  const options: Partial<SimpleGitOptions> = {
    timeout: { block: CLONE_TIMEOUT_MS },
  };
  const git = simpleGit(options);

  const cloneOptions = branch
    ? ['--depth', '1', '--branch', branch]
    : ['--depth', '1', '--branch', 'main'];

  // 如果 main 分支不存在，尝试 master
  try {
    await git.clone(url, tempDir, cloneOptions);
  } catch (err) {
    if (!branch) {
      // 尝试 master 分支
      try {
        await git.clone(url, tempDir, ['--depth', '1', '--branch', 'master']);
      } catch (e) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(`Failed to clone ${url}. Please check if the repository exists.`);
      }
    } else {
      throw new Error(`Failed to clone ${url} branch ${branch}: ${err}`);
    }
  }

  return tempDir;
}

export async function scanRemoteRepo(tempDir: string): Promise<RemoteComponents> {
  const result: RemoteComponents = { skills: [], agents: [], mcps: [] };

  // 扫描 skills/
  const skillsDir = path.join(tempDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        result.skills.push(entry.name);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
        result.skills.push(entry.name.replace(/\.(md|mdc)$/, ''));
      }
    }
  }

  // 扫描 agents/
  const agentsDir = path.join(tempDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        result.agents.push(entry.name);
      }
    }
  }

  // 扫描 mcp/
  const mcpDir = path.join(tempDir, 'mcp');
  if (fs.existsSync(mcpDir)) {
    for (const entry of fs.readdirSync(mcpDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        result.mcps.push(entry.name.replace('.json', ''));
      }
    }
  }

  // 扫描根目录的单个文件
  const rootFiles = fs.readdirSync(tempDir);
  for (const file of rootFiles) {
    const filePath = path.join(tempDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      if (file.endsWith('.md') || file.endsWith('.mdc')) {
        if (!result.skills.includes(file.replace(/\.(md|mdc)$/, ''))) {
          result.skills.push(file.replace(/\.(md|mdc)$/, ''));
        }
      } else if (file.endsWith('.json')) {
        if (!result.mcps.includes(file.replace('.json', ''))) {
          result.mcps.push(file.replace('.json', ''));
        }
      }
    }
  }

  return result;
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}