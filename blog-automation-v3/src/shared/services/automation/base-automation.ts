// 기본 브라우저 자동화 클래스

import { IBrowserAutomation, LoginResult, PublishResult as AutomationPublishResult, PlaywrightResult } from '../../types/automation';

export abstract class BaseBrowserAutomation implements IBrowserAutomation {
  protected isLoggedIn: boolean = false;
  protected currentUsername: string = '';

  // Playwright 헬퍼 메서드들
  protected async navigate(url: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightNavigate(url);
    return result.success;
  }

  protected async click(selector: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightClick(selector);
    return result.success;
  }

  protected async fill(selector: string, value: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightFill(selector, value);
    return result.success;
  }

  protected async waitForSelector(selector: string, timeout?: number): Promise<boolean> {
    const result = await window.electronAPI.playwrightWaitSelector(selector, timeout);
    return result.success;
  }

  protected async waitForTimeout(milliseconds: number): Promise<void> {
    await window.electronAPI.playwrightWaitTimeout(milliseconds);
  }

  protected async evaluate(script: string): Promise<PlaywrightResult> {
    return await window.electronAPI.playwrightEvaluate(script);
  }

  protected async evaluateInFrames(script: string, frameUrlPattern?: string): Promise<PlaywrightResult> {
    return await window.electronAPI.playwrightEvaluateInFrames(script, frameUrlPattern);
  }

  protected async clickInFrames(selector: string, frameUrlPattern?: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightClickInFrames(selector, frameUrlPattern);
    return result.success;
  }

  protected async type(text: string, delay?: number): Promise<boolean> {
    const result = await window.electronAPI.playwrightType(text, delay);
    return result.success;
  }

  protected async press(key: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightPress(key);
    return result.success;
  }

  protected async setClipboard(text: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightSetClipboard(text);
    return result.success;
  }

  protected async setClipboardHTML(html: string): Promise<boolean> {
    const result = await window.electronAPI.playwrightSetClipboardHTML(html);
    return result.success;
  }

  protected async copyImageToClipboard(imagePath: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.copyImageToClipboard(imagePath);
      return result.success;
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
      return false;
    }
  }

  protected async saveTempFile(content: string, extension: string = 'tmp'): Promise<string> {
    try {
      // Convert string content to number array (UTF-8 bytes)
      const encoder = new TextEncoder();
      const data = Array.from(encoder.encode(content));
      const fileName = `temp_${Date.now()}.${extension}`;
      
      const result = await window.electronAPI.saveTempFile(fileName, data);
      return result.filePath || '';
    } catch (error) {
      console.error('Failed to save temp file:', error);
      return '';
    }
  }

  protected async deleteTempFile(filePath: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.deleteTempFile(filePath);
      return result.success;
    } catch (error) {
      console.error('Failed to delete temp file:', error);
      return false;
    }
  }

  protected async clickAt(x: number, y: number): Promise<boolean> {
    try {
      const result = await window.electronAPI.playwrightClickAt(x, y);
      return result.success;
    } catch (error) {
      console.error('Failed to click at coordinates:', error);
      return false;
    }
  }

  // 추상 메서드들 - 각 플랫폼에서 구현해야 함
  abstract login(username: string, password: string): Promise<LoginResult>;
  abstract logout(): Promise<boolean>;
  abstract navigateToWritePage(): Promise<boolean>;
  abstract fillContent(title: string, content: string, imageUrls?: Record<string, string>): Promise<boolean>;
  abstract publish(option: 'immediate' | 'scheduled' | 'draft', scheduledTime?: string): Promise<AutomationPublishResult>;

  // 공통 유틸리티 메서드들
  protected async getCurrentUrl(): Promise<string> {
    const result = await this.evaluate('window.location.href');
    return result.result || '';
  }

  protected async getPageTitle(): Promise<string> {
    const result = await this.evaluate('document.title');
    return result.result || '';
  }

  protected async isElementVisible(selector: string): Promise<boolean> {
    const result = await this.evaluate(`
      (function() {
        const element = document.querySelector('${selector}');
        return element && element.offsetParent !== null;
      })()
    `);
    return result.result || false;
  }

  // 로그인 상태 관리
  public getLoginStatus(): boolean {
    return this.isLoggedIn;
  }

  public getCurrentUsername(): string {
    return this.currentUsername;
  }

  protected setLoginStatus(loggedIn: boolean, username: string = ''): void {
    this.isLoggedIn = loggedIn;
    this.currentUsername = username;
  }
}