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
  saveDocumentFile: (type: 'writingStyle' | 'seoGuide', name: string, content: string) =>
    ipcRenderer.invoke('file:save-document', type, name, content),
  deleteDocumentFile: (filePath: string) => ipcRenderer.invoke('file:delete-document', filePath),
  
  // Image generation
  generateImagePrompts: (data: { content: string; imageCount: number }) => 
    ipcRenderer.invoke('image:generate-prompts', data),
  generateImage: (prompt: string) => ipcRenderer.invoke('image:generate', prompt),
  
  // Blog publishing
  publishToBlog: (content: string) => ipcRenderer.invoke('blog:publish', content),
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      openClaudeWeb: () => Promise<void>;
      sendToClaudeWeb: (writingStylePaths: string[], seoGuidePath: string, topic: string) => Promise<void>;
      waitForClaudeResponse: () => Promise<void>;
      downloadFromClaude: () => Promise<string>;
      saveDocumentFile: (type: 'writingStyle' | 'seoGuide', name: string, content: string) => Promise<string>;
      deleteDocumentFile: (filePath: string) => Promise<boolean>;
      generateImagePrompts: (data: { content: string; imageCount: number }) => Promise<{ prompts: string[] }>;
      generateImage: (prompt: string) => Promise<string>;
      publishToBlog: (content: string) => Promise<{ success: boolean }>;
    };
  }
}