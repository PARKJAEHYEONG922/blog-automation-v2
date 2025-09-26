import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { ClaudeWebService } from './services/claude-web-service';
import { ImageService } from './services/image-service';

let mainWindow: BrowserWindow;
const claudeWebService = new ClaudeWebService();
const imageService = new ImageService();

// 콘솔 로그를 UI로 전송하는 함수
function sendLogToUI(level: string, message: string) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log-message', {
      level,
      message,
      timestamp: new Date()
    });
  }
}

// console.log 오버라이드
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleLog(...args);
  sendLogToUI('info', message);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleError(...args);
  sendLogToUI('error', message);
};

console.warn = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleWarn(...args);
  sendLogToUI('warning', message);
};

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

app.whenReady().then(() => {
  createWindow();
  createDefaultSEOGuide();
});

// 기본 SEO 가이드 문서 생성
async function createDefaultSEOGuide() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const userDataPath = app.getPath('userData');
    const seoGuidesPath = path.join(userDataPath, 'SEOGuides');
    
    // 폴더 생성
    if (!fs.existsSync(seoGuidesPath)) {
      fs.mkdirSync(seoGuidesPath, { recursive: true });
    }
    
    const defaultSEOFileName = '네이버_블로그_SEO_최적화_가이드_기본_template.txt';
    const defaultSEOFilePath = path.join(seoGuidesPath, defaultSEOFileName);
    
    // 현재 날짜 생성
    const today = new Date();
    const currentDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    // 기본 SEO 가이드 생성/업데이트 (매일 새로운 날짜로 갱신)
    const defaultSEOContent = `# 네이버 블로그 SEO 최적화 가이드

**현재 날짜: ${currentDate}일 기준으로 작성해주세요.**

다음 SEO 가이드를 준수하여 블로그 글을 작성해주세요.

## SEO 및 기술적 요구사항
- 글자 수: 1,700-2,500자 (공백 제외)
- 메인 키워드: 5-6회 자연 반복
- 보조 키워드: 각각 3-4회 사용
- 이미지: 5개 이상 (이미지) 표시로 배치

## 이미지 배치 규칙 (중요)
- **소제목과 설명이 완전히 끝난 후**에만 (이미지) 배치
- **단계별 설명 중간에는 절대 이미지 배치 금지** (1단계, 2단계, - 항목 등의 중간)
- **최적 배치 위치**: 소제목 → 설명 → (이미지) 순서
- **이미지 집중 배치**: 소제목이 적고 이미지가 많이 필요한 경우 한 곳에 (이미지)(이미지) 연속 배치 가능
- **안정적인 패턴**: 큰 주제가 완료된 후 관련 이미지들을 모아서 배치

## 글쓰기 품질 요구사항
- **최신 정보 활용**: 최신성을 요구하는 글이면 최대한 인터넷에서 최신 정보를 찾아서 반영하여 작성
- **제목 중심 작성**: 반드시 주어진 제목에 맞는 내용으로 일관성 있게 작성
- **자연스러운 문체**: AI 생성티 없는 개성 있고 자연스러운 어투로 작성
- **완전한 내용**: XX공원, OO병원 같은 placeholder 사용 금지. 구체적인 정보가 없다면 "근처 공원", "동네 병원" 등 일반적 표현 사용
- **이미지 배치 준수**: 단계별 설명이나 목록 중간에는 절대 이미지를 넣지 말고, 주제별 설명이 완전히 끝난 후에만 배치`;

    // 항상 최신 날짜로 업데이트
    fs.writeFileSync(defaultSEOFilePath, defaultSEOContent, 'utf-8');
    console.log('기본 SEO 가이드 문서 업데이트됨 (날짜: ' + currentDate + '):', defaultSEOFilePath);
  } catch (error) {
    console.error('기본 SEO 가이드 생성 실패:', error);
  }
}

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

ipcMain.handle('claude-web:send-prompt', async (event, writingStylePaths: string[], seoGuidePath: string, prompt: string) => {
  return await claudeWebService.sendPrompt(writingStylePaths, seoGuidePath, prompt);
});

ipcMain.handle('claude-web:wait-response', async () => {
  return await claudeWebService.waitForResponse();
});

ipcMain.handle('claude-web:download', async () => {
  return await claudeWebService.copyContent();
});

// IPC handlers for image generation
ipcMain.handle('image:generate-prompts', async (event, data: { content: string; imageCount: number }) => {
  return await imageService.generateImagePrompts(data.content, data.imageCount);
});

ipcMain.handle('image:generate', async (event, prompt: string) => {
  try {
    console.log('이미지 생성 시작 - LLMClientFactory 사용');
    
    // LLM 설정 로드
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'llm-settings.json');
    
    let settings = null;
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(settingsData);
    }
    
    if (!settings?.appliedSettings?.image) {
      throw new Error('이미지 생성 API가 설정되지 않았습니다.');
    }
    
    const imageConfig = settings.appliedSettings.image;
    
    // LLMClientFactory 사용
    const { LLMClientFactory } = require('./services/llm-client-factory');
    
    // Image client 설정
    LLMClientFactory.setImageClient({
      provider: imageConfig.provider,
      model: imageConfig.model,
      apiKey: imageConfig.apiKey,
      style: imageConfig.style
    });
    
    // Image client로 이미지 생성
    const imageClient = LLMClientFactory.getImageClient();
    const imageUrl = await imageClient.generateImage(prompt, {
      quality: imageConfig.quality || 'medium',
      size: imageConfig.size || '1024x1024'
    });
    
    return imageUrl;
    
  } catch (error) {
    console.error('이미지 생성 실패:', error);
    
    // 실패한 경우 에러 메시지와 함께 placeholder 반환
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    return `https://via.placeholder.com/400x300/ff6b6b/ffffff?text=${encodeURIComponent(errorMsg.substring(0, 30))}`;
  }
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

// IPC handler for creating default SEO guide
ipcMain.handle('file:create-default-seo', async () => {
  await createDefaultSEOGuide();
  return true;
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

ipcMain.handle('file:load-documents', async (event, type: 'writingStyle' | 'seoGuide') => {
  const fs = require('fs');
  const path = require('path');
  const { app } = require('electron');
  
  try {
    const userDataPath = app.getPath('userData');
    const folderName = type === 'writingStyle' ? 'WritingStyles' : 'SEOGuides';
    const folderPath = path.join(userDataPath, folderName);
    
    if (!fs.existsSync(folderPath)) {
      return [];
    }
    
    const files = fs.readdirSync(folderPath).filter((file: string) => file.endsWith('.txt'));
    const docs = files.map((file: string) => {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);
      
      // 파일명에서 원본 이름 추출
      let displayName = file.replace(/\.txt$/, '');
      if (type === 'writingStyle') {
        // 블로그_말투_참고문서_{원본이름}_{timestamp} -> 원본이름만 추출
        const match = displayName.match(/^블로그_말투_참고문서_(.+)_\d+$/);
        if (match) {
          displayName = match[1];
        }
      } else {
        // 네이버_블로그_SEO_최적화_가이드_{원본이름}_{timestamp} -> 원본이름만 추출
        const match = displayName.match(/^네이버_블로그_SEO_최적화_가이드_(.+)_\d+$/);
        if (match) {
          displayName = match[1];
        }
      }
      
      return {
        id: file,
        name: displayName,
        content,
        filePath,
        createdAt: stats.mtime.toISOString()
      };
    });
    
    console.log(`${type} 문서 로드 완료: ${docs.length}개`);
    return docs;
  } catch (error) {
    console.error(`${type} 문서 로드 실패:`, error);
    return [];
  }
});

// LLM Settings handlers
ipcMain.handle('llm:get-settings', async () => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'llm-settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
    
    return null;
  } catch (error) {
    console.error('LLM 설정 로드 실패:', error);
    return null;
  }
});

ipcMain.handle('llm:save-settings', async (event, settings) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'llm-settings.json');
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('LLM 설정 저장 완료:', settingsPath);
    
    return true;
  } catch (error) {
    console.error('LLM 설정 저장 실패:', error);
    throw error;
  }
});

ipcMain.handle('llm:test-config', async (event, config) => {
  try {
    console.log(`API 테스트 시작: ${config.provider}`);
    
    const { provider, apiKey } = config;
    
    if (!apiKey) {
      return { success: false, message: 'API 키가 필요합니다.' };
    }
    
    // 간단한 API 테스트 구현
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return { success: true, message: 'OpenAI API 연결 성공' };
      } else {
        return { success: false, message: `OpenAI API 오류: ${response.status}` };
      }
    } else if (provider === 'anthropic' || provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      
      if (response.ok) {
        return { success: true, message: 'Claude API 연결 성공' };
      } else {
        return { success: false, message: `Claude API 오류: ${response.status}` };
      }
    } else if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (response.ok) {
        return { success: true, message: 'Gemini API 연결 성공' };
      } else {
        return { success: false, message: `Gemini API 오류: ${response.status}` };
      }
    } else {
      return { success: false, message: '지원하지 않는 API 제공자입니다' };
    }
  } catch (error) {
    console.error(`API 테스트 실패 (${config.provider}):`, error);
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
});

// 로그 IPC 핸들러
ipcMain.on('log:add', (event, level: string, message: string) => {
  // 렌더러 프로세스로 로그 메시지 전송
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log:message', {
      level,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  // 메인 프로세스 콘솔에도 출력
  console.log(`[${level.toUpperCase()}] ${message}`);
});

// IPC handler for title generation via API
ipcMain.handle('llm:generate-titles', async (event, data: { systemPrompt: string; userPrompt: string }) => {
  try {
    console.log('제목 생성 시작 - LLMClientFactory 사용');
    
    // LLM 설정 로드
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'llm-settings.json');
    
    let settings = null;
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(settingsData);
    }
    
    if (!settings?.appliedSettings?.writing) {
      return { success: false, error: '글쓰기 API가 설정되지 않았습니다.' };
    }
    
    const writingConfig = settings.appliedSettings.writing;
    
    // LLMClientFactory 사용
    const { LLMClientFactory } = require('./services/llm-client-factory');
    
    // Writing client 설정
    LLMClientFactory.setWritingClient({
      provider: writingConfig.provider,
      model: writingConfig.model,
      apiKey: writingConfig.apiKey
    });
    
    // Writing client로 텍스트 생성
    const writingClient = LLMClientFactory.getWritingClient();
    const response = await writingClient.generateText([
      { role: 'system', content: data.systemPrompt },
      { role: 'user', content: data.userPrompt }
    ]);
    
    return { success: true, content: response.content };
    
  } catch (error) {
    console.error('제목 생성 실패:', error);
    
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // 사용자 친화적인 에러 메시지 변환
    if (errorMessage.includes('503')) {
      errorMessage = 'AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      errorMessage = 'API 키가 올바르지 않습니다. 설정을 확인해주세요.';
    } else if (errorMessage.includes('500')) {
      errorMessage = 'AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
});

// IPC handler for opening external URLs
ipcMain.handle('open-external', async (event, url: string) => {
  await shell.openExternal(url);
});