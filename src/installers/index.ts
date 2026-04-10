import { PlatformInstaller } from './platform-installer.js';
import { DefaultPlatformInstaller } from './default-platform-installer.js';

// 平台安装器注册表
const installers: Record<string, PlatformInstaller> = {
  'default': new DefaultPlatformInstaller(),
};

/**
 * 获取指定平台的安装器
 * 如果平台没有特殊安装器，返回默认安装器
 */
export function getInstaller(platform: string): PlatformInstaller {
  return installers[platform] || installers['default'];
}

/**
 * 注册平台安装器
 */
export function registerInstaller(platform: string, installer: PlatformInstaller): void {
  installers[platform] = installer;
}

// ===== 平台特定安装器 =====

// Claude Code 使用默认逻辑（通用 MCP 处理已符合需求）
// 如需特殊处理，可取消注释以下代码：
// import { ClaudeCodeInstaller } from './claude-code-installer.js';
// registerInstaller('claude-code', new ClaudeCodeInstaller());

export { DefaultPlatformInstaller } from './default-platform-installer.js';