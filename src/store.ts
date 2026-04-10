import * as fs from 'fs';
import * as path from 'path';
import { LocalStore } from './types.js';

export async function scanStore(storeDir: string): Promise<LocalStore> {
  const result: LocalStore = {
    skills: [],
    agents: [],
    mcps: [],
  };

  if (!fs.existsSync(storeDir)) {
    return result;
  }

  // 扫描 skills (目录或 .md/.mdc 文件)
  const skillsDir = path.join(storeDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    result.skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() || dirent.name.endsWith('.md') || dirent.name.endsWith('.mdc') || !dirent.name.includes('.'))
      .map(dirent => dirent.name);
  }

  // 扫描 agents (目录或 .md 文件)
  const agentsDir = path.join(storeDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    result.agents = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() || dirent.name.endsWith('.md') || dirent.name.endsWith('.mdc') || !dirent.name.includes('.'))
      .map(dirent => dirent.name);
  }

  // 扫描 mcps (JSON files)
  const mcpDir = path.join(storeDir, 'mcp');
  if (fs.existsSync(mcpDir)) {
    result.mcps = fs.readdirSync(mcpDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => dirent.name.replace('.json', ''));
  }

  return result;
}

// 缓存：key = "storeDir:type:name" -> actualPath
const pathCache = new Map<string, string>();

function getCacheKey(storeDir: string, type: string, name: string): string {
  return `${storeDir}:${type}:${name.toLowerCase()}`;
}

function buildCacheForType(storeDir: string, type: 'skill' | 'agent' | 'mcp'): void {
  const typeDir = type === 'mcp' ? 'mcp' : `${type}s`;
  const fullPath = path.join(storeDir, typeDir);

  if (!fs.existsSync(fullPath)) return;

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    // 去掉扩展名
    const baseName = entry.name.replace(/\.(md|json|mdc)$/, '');
    const entryPath = path.join(fullPath, baseName);
    const lowerName = baseName.toLowerCase();

    // 缓存小写名称 -> 不带扩展名的路径
    pathCache.set(getCacheKey(storeDir, type, lowerName), entryPath);
    // 也缓存原始大小写
    pathCache.set(getCacheKey(storeDir, type, baseName), entryPath);
  }
}

function getCachedPath(storeDir: string, type: 'skill' | 'agent' | 'mcp', name: string): string | null {
  const cacheKey = getCacheKey(storeDir, type, name);

  // 先检查缓存
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey) || null;
  }

  // 构建缓存后再查
  buildCacheForType(storeDir, type);
  return pathCache.get(cacheKey) || null;
}

export function getComponentPath(
  storeDir: string,
  type: 'skill' | 'agent' | 'mcp',
  name: string
): string {
  const typeDir = type === 'mcp' ? 'mcp' : `${type}s`;
  const basePath = path.join(storeDir, typeDir, name);

  // 直接匹配（精确路径）
  if (fs.existsSync(basePath)) {
    return basePath;
  }

  // 尝试带扩展名的路径
  const withExt = basePath + '.md';
  if (fs.existsSync(withExt)) {
    return withExt;
  }

  // 智能匹配：使用缓存
  const cachedPath = getCachedPath(storeDir, type, name);
  if (cachedPath && fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  // 返回原始路径，让调用者处理错误
  return basePath;
}