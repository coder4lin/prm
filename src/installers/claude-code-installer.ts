import * as fs from 'fs';
import * as path from 'path';
import { DefaultPlatformInstaller } from './default-platform-installer.js';
import { InstallOptions, RemoveOptions } from './platform-installer.js';

/**
 * Claude Code 平台安装器
 *
 * 继承默认实现，可以覆盖任意方法来自定义行为
 *
 * 示例：完全自定义 MCP 安装逻辑
 */
export class ClaudeCodeInstaller extends DefaultPlatformInstaller {

  /**
   * 示例：完全自定义 MCP 安装
   * 如果默认的 settings.local.json 处理不满足需求，可以覆盖此方法
   */
  // async installMcp(options: InstallOptions): Promise<void> {
  //   // 自定义逻辑，例如：
  //   // - 使用不同的配置文件名
  //   // - 添加额外的处理逻辑
  //   // - 使用不同的合并策略
  //
  //   await super.installMcp(options);
  // }

  /**
   * 示例：完全自定义 MCP 删除
   */
  // async removeMcp(options: RemoveOptions): Promise<void> {
  //   // 自定义删除逻辑
  //
  //   await super.removeMcp(options);
  // }

  /**
   * 示例：添加自定义的安装前处理
   */
  // async install(options: InstallOptions): Promise<void> {
  //   // 安装前的自定义逻辑
  //   console.log(`[ClaudeCode] Installing ${options.componentType}...`);
  //
  //   await super.install(options);
  //
  //   // 安装后的自定义逻辑
  //   console.log(`[ClaudeCode] Installed ${options.componentType} successfully`);
  // }
}

// 使用方式：
// 在 src/installers/index.ts 中取消注释以下代码来启用：
// import { ClaudeCodeInstaller } from './claude-code-installer.js';
// registerInstaller('claude-code', new ClaudeCodeInstaller());