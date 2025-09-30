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
  cleanupClaudeWeb: () => ipcRenderer.invoke('claude-web:cleanup'),
  
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
  onDownloadProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // Naver Cookies management
  getNaverCookies: () => ipcRenderer.invoke('naver:get-cookies'),
  saveNaverCookies: (cookies: string) => ipcRenderer.invoke('naver:save-cookies', cookies),
  deleteNaverCookies: () => ipcRenderer.invoke('naver:delete-cookies'),
  openNaverLogin: () => ipcRenderer.invoke('naver:open-login'),
  getNaverTrends: (category?: string, limit?: number, date?: string) => ipcRenderer.invoke('naver:get-trends', category, limit, date),
  getTrendContents: (keyword: string, date: string, limit?: number) => ipcRenderer.invoke('naver:get-trend-contents', keyword, date, limit),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Blog crawling for trend analysis
  crawlBlogUrls: (urls: string[], titles: string[]) => ipcRenderer.invoke('blog:crawl-urls', urls, titles),
});

// Types are defined in shared/types/electron.types.ts