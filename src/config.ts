import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrmConfig, PlatformConfig } from './types.js';
import { z } from 'zod';

const ComponentConfigSchema = z.object({
  dir: z.string().optional(),
  file: z.string().optional(),
}).optional();

const PlatformDirsSchema = z.object({
  skill: ComponentConfigSchema,
  agent: ComponentConfigSchema,
  mcp: ComponentConfigSchema,
});

const PlatformConfigSchema = z.object({
  global: PlatformDirsSchema.nullable().optional(),
  project: PlatformDirsSchema.optional(),
});

const PrmConfigSchema = z.object({
  storeDir: z.string().default('~/.prm/store'),
  platforms: z.record(z.string(), PlatformConfigSchema).default({}),
});

export function getDefaultConfig(): PrmConfig {
  return {
    storeDir: '~/.prm/store',
    platforms: {
      'claude-code': {
        global: {
          skill: { dir: '~/.claude/skills' },
          agent: { dir: '~/.claude/agents' },
          mcp: { file: '~/.claude.json' },
        },
        project: {
          skill: { dir: '.claude/skills' },
          agent: { dir: '.claude/agents' },
          mcp: { file: '.mcp.json' },
        },
      },
      'codex': {
        project: {
          skill: { dir: '.codex/skills' },
          agent: { dir: '.codex/agents' },
          mcp: { file: '.codex/mcp.json' },
        },
      },
      'opencode': {
        project: {
          skill: { dir: '.opencode/skills' },
          agent: { dir: '.opencode/agents' },
          mcp: { file: '.opencode/mcp.json' },
        },
      },

      'cursor': {
        project: {
          skill: { dir: '.cursor/skills' },
          agent: { dir: '.cursor/agents' },
          mcp: { file: '.cursor/mcp.json' },
        },
      },

      'trae': {
        project: {
          skill: { dir: '.trae/rules' },
        },
      }
    },
  };
}

export async function loadConfig(homeDir?: string): Promise<PrmConfig> {
  const configPath = path.join(homeDir || os.homedir(), '.prm', 'config.json');

  if (!fs.existsSync(configPath)) {
    return getDefaultConfig();
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return PrmConfigSchema.parse(raw);
}

export async function initConfigFile(homeDir?: string, customStoreDir?: string): Promise<string> {
  const configDir = path.join(homeDir || os.homedir(), '.prm');
  const configPath = path.join(configDir, 'config.json');

  if (fs.existsSync(configPath)) {
    console.log('Config file already exists at:', configPath);
    return configPath;
  }

  const defaultConfig = getDefaultConfig();

  // 使用自定义 store 目录（如果提供）
  const storeDir = customStoreDir
    ? resolvePath(customStoreDir)
    : resolvePath(defaultConfig.storeDir);

  // Create config directory
  fs.mkdirSync(configDir, { recursive: true });

  // Create store directory if it doesn't exist
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
    console.log('✓ Created store directory:', storeDir);

    // Create subdirectories for component types
    const subDirs = ['mcp', 'skills', 'agents'];
    for (const subDir of subDirs) {
      const fullPath = path.join(storeDir, subDir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    console.log('✓ Created component subdirectories: mcp, skills, agents');
  }

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));

  console.log('✓ Default config file created at:', configPath);
  return configPath;
}

export function resolvePath(pathStr: string): string {
  if (pathStr.startsWith('~/') || pathStr === '~') {
    return path.join(os.homedir(), pathStr.slice(1));
  }
  return pathStr;
}

export function getStoreDir(config: PrmConfig): string {
  return resolvePath(config.storeDir);
}