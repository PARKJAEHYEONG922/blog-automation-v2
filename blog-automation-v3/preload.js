"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Claude Web automation
    openClaudeWeb: () => electron_1.ipcRenderer.invoke('claude-web:open'),
    sendToClaudeWeb: (prompt) => electron_1.ipcRenderer.invoke('claude-web:send-prompt', prompt),
    waitForClaudeResponse: () => electron_1.ipcRenderer.invoke('claude-web:wait-response'),
    downloadFromClaude: () => electron_1.ipcRenderer.invoke('claude-web:download'),
    // Image generation
    generateImagePrompts: (data) => electron_1.ipcRenderer.invoke('image:generate-prompts', data),
    generateImage: (prompt) => electron_1.ipcRenderer.invoke('image:generate', prompt),
    // Blog publishing
    publishToBlog: (content) => electron_1.ipcRenderer.invoke('blog:publish', content),
    // External URL opening
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
});
