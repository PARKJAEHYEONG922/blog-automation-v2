/**
 * 파일 시스템 관련 Electron 메인 프로세스 서비스
 */
import { dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface FileResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SaveFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface OpenFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

/**
 * 파일 저장 다이얼로그 표시
 */
export async function showSaveDialog(
  window: BrowserWindow,
  content: string,
  options: SaveFileOptions = {}
): Promise<FileResult> {
  try {
    const result = await dialog.showSaveDialog(window, {
      title: options.title || '파일 저장',
      defaultPath: options.defaultPath,
      filters: options.filters || [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    await fs.promises.writeFile(result.filePath!, content, 'utf8');
    
    return { 
      success: true, 
      data: { filePath: result.filePath } 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 파일 열기 다이얼로그 표시
 */
export async function showOpenDialog(
  window: BrowserWindow,
  options: OpenFileOptions = {}
): Promise<FileResult> {
  try {
    const result = await dialog.showOpenDialog(window, {
      title: options.title || '파일 열기',
      defaultPath: options.defaultPath,
      properties: options.properties || ['openFile'],
      filters: options.filters || [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    const filePaths = result.filePaths;
    const files = await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return {
          path: filePath,
          name: path.basename(filePath),
          content
        };
      })
    );

    return { 
      success: true, 
      data: options.properties?.includes('multiSelections') ? files : files[0] 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 디렉토리 선택 다이얼로그 표시
 */
export async function showDirectoryDialog(
  window: BrowserWindow,
  title: string = '폴더 선택'
): Promise<FileResult> {
  try {
    const result = await dialog.showOpenDialog(window, {
      title,
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return { success: false, error: 'User canceled' };
    }

    return { 
      success: true, 
      data: { directoryPath: result.filePaths[0] } 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 파일 존재 여부 확인
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 파일 읽기
 */
export async function readFile(filePath: string): Promise<FileResult> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { 
      success: true, 
      data: { content, path: filePath, name: path.basename(filePath) } 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 파일 쓰기
 */
export async function writeFile(filePath: string, content: string): Promise<FileResult> {
  try {
    // 디렉토리가 존재하지 않으면 생성
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { 
      success: true, 
      data: { filePath } 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 디렉토리 생성
 */
export async function createDirectory(dirPath: string): Promise<FileResult> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true, data: { directoryPath: dirPath } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 파일/디렉토리 정보 가져오기
 */
export async function getFileStats(filePath: string): Promise<FileResult> {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      success: true,
      data: {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}