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
  
  // Log handling
  sendLog: (level: string, message: string) => ipcRenderer.send('log:add', level, message),
  onLogMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('log:message', handler);
    return () => ipcRenderer.removeListener('log:message', handler);
  },
  
  // External URL opening
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
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
      sendLog: (level: string, message: string) => void;
      onLogMessage: (callback: (data: any) => void) => (() => void);
      openExternal: (url: string) => Promise<void>;
    };
  }
}