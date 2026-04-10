import * as path from 'path';
import * as fs from 'fs';
import { InstallSource, ComponentType, ComponentInfo, LocalComponents } from './types.js';

const GITHUB_RE = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(?:@(.+))?$/;

export function parseSource(source: string): InstallSource {
  // 本地路径: ./xxx 或 /xxx 或 ~
  if (source.startsWith('./') || source.startsWith('/') || source.startsWith('~')) {
    const localPath = source.startsWith('~')
      ? path.join(process.env.HOME || '', source.slice(1))
      : path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
    return { type: 'local', original: source, localPath };
  }

  // GitHub: owner/repo[@path]
  const atIndex = source.indexOf('@');
  if (atIndex !== -1) {
    const repoPart = source.slice(0, atIndex);
    const match = GITHUB_RE.exec(repoPart);
    if (!match) {
      throw new Error(`Invalid GitHub source: ${source}`);
    }
    return {
      type: 'github',
      original: source,
      owner: match[1],
      repo: match[2],
      path: source.slice(atIndex + 1),
    };
  }

  // GitHub: owner/repo
  const match = GITHUB_RE.exec(source);
  if (!match) {
    throw new Error(`Invalid source: ${source}. Use owner/repo or ./local/path`);
  }
  return {
    type: 'github',
    original: source,
    owner: match[1],
    repo: match[2],
  };
}

export function detectComponentType(dirPath: string): ComponentType | null {
  const name = path.basename(dirPath).toLowerCase();
  if (name.includes('skill')) return 'skill';
  if (name.includes('agent')) return 'agent';
  if (name.includes('mcp')) return 'mcp';

  // 检查目录内容
  if (!fs.existsSync(dirPath)) return null;
  const entries = fs.readdirSync(dirPath);
  if (entries.includes('skills') || entries.some(e => e.startsWith('skill'))) return 'skill';
  if (entries.includes('agents') || entries.some(e => e.startsWith('agent'))) return 'agent';
  if (entries.includes('mcp') || entries.some(e => e.endsWith('.mcp.json'))) return 'mcp';

  return null;
}

export async function scanLocalDir(dirPath: string): Promise<LocalComponents> {
  const result: LocalComponents = { skills: [], agents: [], mcps: [] };

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const stat = fs.statSync(dirPath);
  const name = path.basename(dirPath);

  if (stat.isFile()) {
    // 单个文件
    const type = name.endsWith('.json') ? 'mcp' : 'skill';
    const component: ComponentInfo = { name, path: dirPath, type };
    if (type === 'mcp') result.mcps.push(component);
    else result.skills.push(component);
    return result;
  }

  // 目录
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const type = detectComponentType(dirPath) || 'skill';

  // 检查是否有 skills/ agents/ mcp/ 子目录
  const skillsDir = path.join(dirPath, 'skills');
  const agentsDir = path.join(dirPath, 'agents');
  const mcpDir = path.join(dirPath, 'mcp');

  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        result.skills.push({ name: entry.name, path: path.join(skillsDir, entry.name), type: 'skill' });
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
        result.skills.push({ name: entry.name.replace(/\.(md|mdc)$/, ''), path: path.join(skillsDir, entry.name), type: 'skill' });
      }
    }
  }

  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        result.agents.push({ name: entry.name, path: path.join(agentsDir, entry.name), type: 'agent' });
      }
    }
  }

  if (fs.existsSync(mcpDir)) {
    for (const entry of fs.readdirSync(mcpDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        result.mcps.push({ name: entry.name.replace('.json', ''), path: path.join(mcpDir, entry.name), type: 'mcp' });
      }
    }
  }

  // 如果没有子目录，把当前目录内容作为组件
  if (result.skills.length === 0 && result.agents.length === 0 && result.mcps.length === 0) {
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const t = detectComponentType(entryPath) || type;
        if (t === 'skill') result.skills.push({ name: entry.name, path: entryPath, type: t });
        else if (t === 'agent') result.agents.push({ name: entry.name, path: entryPath, type: t });
      } else if (entry.name.endsWith('.json')) {
        result.mcps.push({ name: entry.name.replace('.json', ''), path: entryPath, type: 'mcp' });
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
        result.skills.push({ name: entry.name.replace(/\.(md|mdc)$/, ''), path: entryPath, type: 'skill' });
      }
    }
  }

  return result;
}