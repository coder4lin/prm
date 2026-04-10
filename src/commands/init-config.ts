import { initConfigFile, resolvePath } from '../config.js';
import * as fs from 'fs';

export async function initConfigCommand(storeDir?: string) {
  const configPath = await initConfigFile(undefined, storeDir);

  // 如果指定了自定义 store 目录，更新配置文件
  if (storeDir) {
    const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    configContent.storeDir = storeDir;
    fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
  }

  console.log('\nYou can edit this file to customize platform configurations.');
}