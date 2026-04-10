// PRM Type Definitions

export interface ComponentConfig {
  dir?: string;
  file?: string;
}

export interface PlatformDirs {
  skill?: ComponentConfig;
  agent?: ComponentConfig;
  mcp?: ComponentConfig;
}

export interface PlatformConfig {
  global?: PlatformDirs | null;
  project?: PlatformDirs;
}

export interface PrmConfig {
  storeDir: string;
  platforms: Record<string, PlatformConfig>;
}

export interface PrmProjectConfig {
  name: string;
  version: string;
  dependencies: Record<string, Record<string, string[]>>;
}

export interface PrmLockConfig {
  [platform: string]: {
    [componentType: string]: {
      [name: string]: {
        md5: string;
        linkedAt: string;
      };
    };
  };
}

export interface LocalStore {
  skills: string[];
  agents: string[];
  mcps: string[];
}

export type ComponentType = 'skill' | 'agent' | 'mcp';

export type Platform =
  | 'claude-code'
  | 'copilot'
  | 'antigravity'
  | 'gemini-cli'
  | 'opencode'
  | 'cursor'
  | 'aider'
  | 'windsurf'
  | 'openclaw'
  | 'qwen'
  | 'trae'
  | 'kimi';

export interface InstallOptions {
  storeDir: string;
  projectDir: string;
  platform: string;
  platformConfig: PlatformConfig;
  componentType: ComponentType;
  componentName: string;
  isGlobal: boolean;
  isCopy?: boolean;
}

// Install command types
export interface RemoteComponents {
  skills: string[];
  agents: string[];
  mcps: string[];
}

export interface LocalComponents {
  skills: ComponentInfo[];
  agents: ComponentInfo[];
  mcps: ComponentInfo[];
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: ComponentType;
}

export interface InstallSource {
  type: 'github' | 'local';
  original: string;
  owner?: string;
  repo?: string;
  path?: string;
  branch?: string;
  localPath?: string;
}