import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Claude Web automation
  openClaudeWeb: () => ipcRenderer.invoke('claude-web:open'),
  sendToClaudeWeb: (prompt: string) => ipcRenderer.invoke('claude-web:send-prompt', prompt),
  waitForClaudeResponse: () => ipcRenderer.invoke('claude-web:wait-response'),
  downloadFromClaude: () => ipcRenderer.invoke('claude-web:download'),
  
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
      sendToClaudeWeb: (prompt: string) => Promise<void>;
      waitForClaudeResponse: () => Promise<void>;
      downloadFromClaude: () => Promise<string>;
      generateImagePrompts: (data: { content: string; imageCount: number }) => Promise<{ prompts: string[] }>;
      generateImage: (prompt: string) => Promise<string>;
      publishToBlog: (content: string) => Promise<{ success: boolean }>;
    };
  }
}