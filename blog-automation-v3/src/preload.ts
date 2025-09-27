import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Claude Web automation
  openClaudeWeb: () => ipcRenderer.invoke('claude-web:open'),
  sendToClaudeWeb: (writingStylePaths: string[], seoGuidePath: string, topic: string) => 
    ipcRenderer.invoke('claude-web:send-prompt', writingStylePaths, seoGuidePath, topic),
  waitForClaudeResponse: () => ipcRenderer.invoke('claude-web:wait-response'),
  downloadFromClaude: () => ipcRenderer.invoke('claude-web:download'),
  
  // File management
  saveDocument: (type: 'writingStyle' | 'seoGuide', name: string, content: string) =>
    ipcRenderer.invoke('file:save-document', type, name, content),
  deleteDocument: (filePath: string) => ipcRenderer.invoke('file:delete-document', filePath),
  loadDocuments: (type: 'writingStyle' | 'seoGuide') => ipcRenderer.invoke('file:load-documents', type),
  createDefaultSEO: () => ipcRenderer.invoke('file:create-default-seo'),
  
  // Image generation
  generateImagePrompts: (data: { content: string; imageCount: number }) => 
    ipcRenderer.invoke('image:generate-prompts', data),
  generateImage: (prompt: string) => ipcRenderer.invoke('image:generate', prompt),
  
  // Blog publishing
  publishToBlog: (content: string) => ipcRenderer.invoke('blog:publish', content),
  
  // LLM Settings
  getLLMSettings: () => ipcRenderer.invoke('llm:get-settings'),
  saveLLMSettings: (settings: any) => ipcRenderer.invoke('llm:save-settings', settings),
  testLLMConfig: (config: any) => ipcRenderer.invoke('llm:test-config', config),
  
  // Title generation via API
  generateTitles: (data: { systemPrompt: string; userPrompt: string }) => 
    ipcRenderer.invoke('llm:generate-titles', data),
  
  // Log handling
  sendLog: (level: string, message: string) => ipcRenderer.send('log:add', level, message),
  onLogMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('log-message', handler);
    return () => ipcRenderer.removeListener('log-message', handler);
  },
  
  // External URL opening
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Playwright browser automation
  playwrightInitialize: () => ipcRenderer.invoke('playwright-initialize'),
  playwrightNavigate: (url: string) => ipcRenderer.invoke('playwright-navigate', url),
  playwrightGetUrl: () => ipcRenderer.invoke('playwright-get-url'),
  playwrightClick: (selector: string) => ipcRenderer.invoke('playwright-click', selector),
  playwrightFill: (selector: string, value: string) => ipcRenderer.invoke('playwright-fill', selector, value),
  playwrightWaitSelector: (selector: string, timeout?: number) => ipcRenderer.invoke('playwright-wait-selector', selector, timeout),
  playwrightWaitTimeout: (milliseconds: number) => ipcRenderer.invoke('playwright-wait-timeout', milliseconds),
  playwrightEvaluate: (script: string) => ipcRenderer.invoke('playwright-evaluate', script),
  playwrightClickInFrames: (selector: string, frameUrlPattern?: string) => ipcRenderer.invoke('playwright-click-in-frames', selector, frameUrlPattern),
  playwrightEvaluateInFrames: (script: string, frameUrlPattern?: string) => ipcRenderer.invoke('playwright-evaluate-in-frames', script, frameUrlPattern),
  playwrightType: (text: string, delay?: number) => ipcRenderer.invoke('playwright-type', text, delay),
  playwrightPress: (key: string) => ipcRenderer.invoke('playwright-press', key),
  playwrightClickAt: (x: number, y: number) => ipcRenderer.invoke('playwright-click-at', x, y),
  playwrightSetClipboard: (text: string) => ipcRenderer.invoke('playwright-set-clipboard', text),
  playwrightSetClipboardHTML: (html: string) => ipcRenderer.invoke('playwright-set-clipboard-html', html),
  playwrightDragDropFile: (filePath: string, targetSelector: string) => ipcRenderer.invoke('playwright-drag-drop-file', filePath, targetSelector),
  playwrightCleanup: () => ipcRenderer.invoke('playwright-cleanup'),
  
  // File operations for images
  saveTempFile: (fileName: string, data: number[]) =>
    ipcRenderer.invoke('file:saveTempFile', { fileName, data }),
  copyImageToClipboard: (filePath: string) =>
    ipcRenderer.invoke('clipboard:copyImage', filePath),
  deleteTempFile: (filePath: string) =>
    ipcRenderer.invoke('file:deleteTempFile', filePath),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Update checker
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  downloadUpdate: (downloadUrl: string) => ipcRenderer.invoke('app:download-update', downloadUrl),
  onUpdateCheckResult: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update-check-result', handler);
    return () => ipcRenderer.removeListener('update-check-result', handler);
  },
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      openClaudeWeb: () => Promise<void>;
      sendToClaudeWeb: (writingStylePaths: string[], seoGuidePath: string, topic: string) => Promise<void>;
      waitForClaudeResponse: () => Promise<void>;
      downloadFromClaude: () => Promise<string>;
      saveDocument: (type: 'writingStyle' | 'seoGuide', name: string, content: string) => Promise<string>;
      deleteDocument: (filePath: string) => Promise<boolean>;
      loadDocuments: (type: 'writingStyle' | 'seoGuide') => Promise<any[]>;
      createDefaultSEO: () => Promise<boolean>;
      generateImagePrompts: (data: { content: string; imageCount: number }) => Promise<{ prompts: string[] }>;
      generateImage: (prompt: string) => Promise<string>;
      publishToBlog: (content: string) => Promise<{ success: boolean }>;
      getLLMSettings: () => Promise<any>;
      saveLLMSettings: (settings: any) => Promise<void>;
      testLLMConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      generateTitles: (data: { systemPrompt: string; userPrompt: string }) => Promise<{ success: boolean; content?: string; titles?: string[]; error?: string }>;
      sendLog: (level: string, message: string) => void;
      onLogMessage: (callback: (data: any) => void) => (() => void);
      openExternal: (url: string) => Promise<void>;
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
      saveTempFile: (fileName: string, data: number[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      copyImageToClipboard: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      deleteTempFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<{ hasUpdate: boolean; latestVersion?: string; downloadUrl?: string; error?: string }>;
      downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
      onUpdateCheckResult: (callback: (data: any) => void) => (() => void);
    };
  }
}