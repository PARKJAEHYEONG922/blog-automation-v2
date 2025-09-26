import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ClaudeWebService } from './services/claude-web-service';
import { ImageService } from './services/image-service';

let mainWindow: BrowserWindow;
const claudeWebService = new ClaudeWebService();
const imageService = new ImageService();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for Claude Web automation
ipcMain.handle('claude-web:open', async () => {
  return await claudeWebService.openBrowser();
});

ipcMain.handle('claude-web:send-prompt', async (event, writingStylePaths: string[], seoGuidePath: string, topic: string) => {
  return await claudeWebService.sendPrompt(writingStylePaths, seoGuidePath, topic);
});

ipcMain.handle('claude-web:wait-response', async () => {
  return await claudeWebService.waitForResponse();
});

ipcMain.handle('claude-web:download', async () => {
  return await claudeWebService.downloadContent();
});

// IPC handlers for image generation
ipcMain.handle('image:generate-prompts', async (event, data: { content: string; imageCount: number }) => {
  return await imageService.generateImagePrompts(data.content, data.imageCount);
});

ipcMain.handle('image:generate', async (event, prompt: string) => {
  return await imageService.generateImage(prompt);
});

// IPC handler for publishing to blog (reuse v2 logic)
ipcMain.handle('blog:publish', async (event, content: string) => {
  // TODO: Integrate with existing v2 publishing logic
  console.log('Publishing content:', content.slice(0, 100) + '...');
  return { success: true };
});

// IPC handlers for file management
ipcMain.handle('file:save-document', async (event, type: 'writingStyle' | 'seoGuide', name: string, content: string) => {
  const fs = require('fs');
  const path = require('path');
  const { app } = require('electron');
  
  const userDataPath = app.getPath('userData');
  const folderName = type === 'writingStyle' ? 'WritingStyles' : 'SEOGuides';
  const folderPath = path.join(userDataPath, folderName);
  
  // 폴더 생성
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // 파일 저장 - 클로드가 이해할 수 있는 의미있는 파일명
  const timestamp = Date.now();
  let meaningfulFileName;
  
  if (type === 'writingStyle') {
    meaningfulFileName = `블로그_말투_참고문서_${name}_${timestamp}.txt`;
  } else {
    meaningfulFileName = `네이버_블로그_SEO_최적화_가이드_${name}_${timestamp}.txt`;
  }
  
  const filePath = path.join(folderPath, meaningfulFileName);
  
  fs.writeFileSync(filePath, content, 'utf-8');
  
  console.log(`문서 파일 저장 완료: ${filePath}`);
  return filePath;
});

ipcMain.handle('file:delete-document', async (event, filePath: string) => {
  const fs = require('fs');
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`문서 파일 삭제 완료: ${filePath}`);
      return true;
    } else {
      console.warn(`삭제할 파일이 존재하지 않음: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`파일 삭제 실패: ${filePath}`, error);
    throw error;
  }
});