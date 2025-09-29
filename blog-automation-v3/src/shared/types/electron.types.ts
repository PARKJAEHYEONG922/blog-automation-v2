// Electron 관련 타입 정의

export interface ElectronAPI {
  // Claude Web 관련
  openClaudeWeb: () => Promise<void>;
  sendToClaudeWeb: (writingStylePaths: string[], seoGuidePath: string, topic: string) => Promise<void>;
  waitForClaudeResponse: () => Promise<void>;
  downloadFromClaude: () => Promise<string>;
  cleanupClaudeWeb: () => Promise<{ success: boolean; error?: string }>;
  
  // 파일 관리
  saveDocument: (type: 'writingStyle' | 'seoGuide', name: string, content: string) => Promise<string>;
  deleteDocument: (filePath: string) => Promise<boolean>;
  loadDocuments: (type: 'writingStyle' | 'seoGuide') => Promise<any[]>;
  createDefaultSEO: () => Promise<boolean>;
  
  // 이미지 생성
  generateImagePrompts: (data: { content: string; imageCount: number }) => Promise<{ prompts: string[] }>;
  generateImage: (prompt: string) => Promise<string>;
  
  // 블로그 발행
  publishToBlog: (content: string) => Promise<{ success: boolean }>;
  
  // LLM 설정
  getLLMSettings: () => Promise<any>;
  saveLLMSettings: (settings: any) => Promise<void>;
  testLLMConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  generateTitles: (data: { systemPrompt: string; userPrompt: string }) => Promise<{ success: boolean; content?: string; titles?: string[]; error?: string }>;
  
  // 로그 관련
  sendLog: (level: string, message: string) => void;
  onLogMessage: (callback: (data: any) => void) => (() => void);
  
  // 시스템
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ hasUpdate: boolean; latestVersion?: string; downloadUrl?: string; error?: string }>;
  downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateCheckResult: (callback: (data: any) => void) => (() => void);
  
  // Playwright 관련
  playwrightInitialize: () => Promise<{ success: boolean; error?: string }>;
  playwrightNavigate: (url: string) => Promise<{ success: boolean; error?: string }>;
  playwrightGetUrl: () => Promise<{ success: boolean; url?: string; error?: string }>;
  playwrightClick: (selector: string) => Promise<{ success: boolean; error?: string }>;
  playwrightFill: (selector: string, value: string) => Promise<{ success: boolean; error?: string }>;
  playwrightWaitSelector: (selector: string, timeout?: number) => Promise<{ success: boolean; error?: string }>;
  playwrightWaitTimeout: (milliseconds: number) => Promise<{ success: boolean; error?: string }>;
  playwrightEvaluate: (script: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  playwrightClickInFrames: (selector: string, frameUrlPattern?: string) => Promise<{ success: boolean; error?: string }>;
  playwrightEvaluateInFrames: (script: string, frameUrlPattern?: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  playwrightType: (text: string, delay?: number) => Promise<{ success: boolean; error?: string }>;
  playwrightPress: (key: string) => Promise<{ success: boolean; error?: string }>;
  playwrightClickAt: (x: number, y: number) => Promise<{ success: boolean; error?: string }>;
  playwrightSetClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;
  playwrightSetClipboardHTML: (html: string) => Promise<{ success: boolean; error?: string }>;
  playwrightDragDropFile: (filePath: string, targetSelector: string) => Promise<{ success: boolean; error?: string }>;
  playwrightCleanup: () => Promise<{ success: boolean; error?: string }>;
  
  // 파일 시스템
  saveTempFile: (fileName: string, data: number[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  copyImageToClipboard: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  deleteTempFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
}

export interface DocumentData {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}