import { isAbsolute, join, normalize } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { invoke } from "@tauri-apps/api/core";


/**
 * 判断字符串是否为合法的绝对路径
 * @param path 要检查的路径字符串
 * @returns 是否为合法的绝对路径
 */
export async function isValidAbsolutePath(path: string): Promise<boolean> {
  try {
    // 检查是否为空
    if (!path || path.trim() === '') {
      return false;
    }
    
    // 检查是否为绝对路径
    const isAbsPath = await isAbsolute(path);
    if (!isAbsPath) {
      return false;
    }
    
    // 规范化路径
    const normalizedPath = await normalize(path);
    
    // 检查路径是否存在
    const pathExists = await exists(normalizedPath);
    return pathExists;
  } catch (error) {
    console.error('检查绝对路径时出错:', error);
    return false;
  }
}

