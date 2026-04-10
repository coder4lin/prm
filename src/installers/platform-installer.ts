import { PlatformConfig, ComponentType } from '../types.js';

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

export interface RemoveOptions {
  storeDir: string;
  projectDir: string;
  platform: string;
  platformConfig: PlatformConfig;
  componentType: ComponentType;
  componentName: string;
}

/**
 * 平台安装器接口
 * 定义组件安装和删除的统一入口
 */
export interface PlatformInstaller {
  /**
   * 安装组件到项目
   */
  install(options: InstallOptions): Promise<void>;

  /**
   * 从项目删除组件
   */
  remove(options: RemoveOptions): Promise<void>;
}