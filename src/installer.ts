import { PlatformConfig, ComponentType, InstallOptions as OldInstallOptions } from './types.js';
import { getInstaller } from './installers/index.js';
import { InstallOptions, RemoveOptions } from './installers/platform-installer.js';

/**
 * 安装组件到项目
 * 使用平台适配器进行安装
 */
export async function installComponent(options: OldInstallOptions): Promise<void> {
  const { storeDir, projectDir, platform, platformConfig, componentType, componentName, isGlobal, isCopy } = options;

  const installer = getInstaller(platform);

  const installOptions: InstallOptions = {
    storeDir,
    projectDir,
    platform,
    platformConfig,
    componentType,
    componentName,
    isGlobal,
    isCopy,
  };

  await installer.install(installOptions);
}

/**
 * 从项目删除组件
 * 使用平台适配器进行删除
 */
export async function removeComponent(options: Omit<OldInstallOptions, 'isGlobal' | 'isCopy'>): Promise<void> {
  const { storeDir, projectDir, platform, platformConfig, componentType, componentName } = options;

  const installer = getInstaller(platform);

  const removeOptions: RemoveOptions = {
    storeDir,
    projectDir,
    platform,
    platformConfig,
    componentType,
    componentName,
  };

  await installer.remove(removeOptions);
}

// 保留原有导出，保持向后兼容
export { getInstallPath } from './installers/default-platform-installer.js';