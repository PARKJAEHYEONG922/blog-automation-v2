"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const claude_web_service_1 = require("./services/claude-web-service");
const image_service_1 = require("./services/image-service");
let mainWindow;
const claudeWebService = new claude_web_service_1.ClaudeWebService();
const imageService = new image_service_1.ImageService();
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        height: 900,
        width: 1200,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.loadURL('http://localhost:8081');
    // mainWindow.webContents.openDevTools(); // 개발자 도구 비활성화
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC handlers for Claude Web automation
electron_1.ipcMain.handle('claude-web:open', async () => {
    return await claudeWebService.openBrowser();
});
electron_1.ipcMain.handle('claude-web:send-prompt', async (event, prompt) => {
    return await claudeWebService.sendPrompt(prompt);
});
electron_1.ipcMain.handle('claude-web:wait-response', async () => {
    return await claudeWebService.waitForResponse();
});
electron_1.ipcMain.handle('claude-web:download', async () => {
    return await claudeWebService.downloadContent();
});
// IPC handlers for image generation
electron_1.ipcMain.handle('image:generate-prompts', async (event, data) => {
    return await imageService.generateImagePrompts(data.content, data.imageCount);
});
electron_1.ipcMain.handle('image:generate', async (event, prompt) => {
    return await imageService.generateImage(prompt);
});
// IPC handler for publishing to blog (reuse v2 logic)
electron_1.ipcMain.handle('blog:publish', async (event, content) => {
    // TODO: Integrate with existing v2 publishing logic
    console.log('Publishing content:', content.slice(0, 100) + '...');
    return { success: true };
});

// IPC handler for opening external URLs
electron_1.ipcMain.handle('open-external', async (event, url) => {
    await electron_1.shell.openExternal(url);
});
