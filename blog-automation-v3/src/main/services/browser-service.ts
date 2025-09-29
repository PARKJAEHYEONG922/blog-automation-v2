/**
 * 브라우저 관련 Electron 메인 프로세스 서비스
 */
import { BrowserWindow, shell } from 'electron';

export interface BrowserServiceOptions {
  width?: number;
  height?: number;
  webSecurity?: boolean;
  nodeIntegration?: boolean;
  contextIsolation?: boolean;
  preload?: string;
}

export interface WindowResult {
  success: boolean;
  windowId?: number;
  error?: string;
}

/**
 * 새 브라우저 창 생성
 */
export function createBrowserWindow(
  url: string,
  options: BrowserServiceOptions = {}
): Promise<WindowResult> {
  return new Promise((resolve) => {
    try {
      const window = new BrowserWindow({
        width: options.width || 1200,
        height: options.height || 800,
        webPreferences: {
          webSecurity: options.webSecurity ?? false,
          nodeIntegration: options.nodeIntegration ?? false,
          contextIsolation: options.contextIsolation ?? true,
          preload: options.preload
        },
        show: false // 초기에는 숨김
      });

      // 창이 준비되면 표시
      window.once('ready-to-show', () => {
        window.show();
        resolve({
          success: true,
          windowId: window.id
        });
      });

      // 에러 처리
      window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        resolve({
          success: false,
          error: `Failed to load: ${errorDescription} (${errorCode})`
        });
      });

      // URL 로드
      window.loadURL(url);

    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * 브라우저 창 닫기
 */
export function closeBrowserWindow(windowId: number): boolean {
  try {
    const window = BrowserWindow.fromId(windowId);
    if (window) {
      window.close();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error closing browser window:', error);
    return false;
  }
}

/**
 * 브라우저 창에서 JavaScript 실행
 */
export async function executeJavaScript(
  windowId: number,
  script: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const window = BrowserWindow.fromId(windowId);
    if (!window) {
      return { success: false, error: 'Window not found' };
    }

    const result = await window.webContents.executeJavaScript(script);
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 브라우저 창의 현재 URL 가져오기
 */
export function getCurrentUrl(windowId: number): string | null {
  try {
    const window = BrowserWindow.fromId(windowId);
    return window ? window.webContents.getURL() : null;
  } catch (error) {
    console.error('Error getting current URL:', error);
    return null;
  }
}

/**
 * 브라우저 창의 제목 가져오기
 */
export function getWindowTitle(windowId: number): string | null {
  try {
    const window = BrowserWindow.fromId(windowId);
    return window ? window.webContents.getTitle() : null;
  } catch (error) {
    console.error('Error getting window title:', error);
    return null;
  }
}

/**
 * 모든 브라우저 창 목록 가져오기
 */
export function getAllWindows(): Array<{
  id: number;
  title: string;
  url: string;
  visible: boolean;
}> {
  try {
    return BrowserWindow.getAllWindows().map(window => ({
      id: window.id,
      title: window.webContents.getTitle(),
      url: window.webContents.getURL(),
      visible: window.isVisible()
    }));
  } catch (error) {
    console.error('Error getting all windows:', error);
    return [];
  }
}

/**
 * 외부 브라우저에서 URL 열기
 */
export async function openInExternalBrowser(url: string): Promise<boolean> {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('Error opening URL in external browser:', error);
    return false;
  }
}

/**
 * 브라우저 창에 개발자 도구 열기/닫기
 */
export function toggleDevTools(windowId: number): boolean {
  try {
    const window = BrowserWindow.fromId(windowId);
    if (window) {
      window.webContents.toggleDevTools();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error toggling dev tools:', error);
    return false;
  }
}

/**
 * 브라우저 창 새로고침
 */
export function reloadWindow(windowId: number): boolean {
  try {
    const window = BrowserWindow.fromId(windowId);
    if (window) {
      window.webContents.reload();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error reloading window:', error);
    return false;
  }
}

/**
 * 브라우저 창 크기 조정
 */
export function resizeWindow(
  windowId: number,
  width: number,
  height: number
): boolean {
  try {
    const window = BrowserWindow.fromId(windowId);
    if (window) {
      window.setSize(width, height);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error resizing window:', error);
    return false;
  }
}