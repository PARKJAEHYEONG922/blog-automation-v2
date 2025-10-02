import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ClaudeWebService } from '../shared/services/automation/claude-web-service';
import { ImageService } from '../shared/services/content/image-service';
import { registerPlaywrightHandlers, playwrightService } from '../shared/services/automation/playwright-service';
import * as https from 'https';

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

// GitHub API로 최신 릴리즈 확인
async function checkForUpdates(): Promise<{ hasUpdate: boolean; latestVersion?: string; downloadUrl?: string; error?: string }> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/PARKJAEHYEONG922/blog-automation-v2/releases',
      method: 'GET',
      headers: {
        'User-Agent': 'Blog-Automation-V3'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            resolve({ hasUpdate: false, error: '릴리즈를 찾을 수 없습니다.' });
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ hasUpdate: false, error: `GitHub API 오류: ${res.statusCode}` });
            return;
          }

          const releases = JSON.parse(data);

          // V3 릴리즈만 필터링 (v3.x.x 형태의 태그)
          const v3Releases = releases.filter((release: any) =>
            release.tag_name && release.tag_name.startsWith('v3.')
          );

          if (v3Releases.length === 0) {
            resolve({ hasUpdate: false, error: 'V3 릴리즈를 찾을 수 없습니다.' });
            return;
          }

          // 최신 V3 릴리즈
          const latestRelease = v3Releases[0];
          const latestVersion = latestRelease.tag_name?.replace('v', '') || latestRelease.name;
          const currentVersion = app.getVersion();

          // 다운로드 URL 찾기 (V3 setup.exe 파일)
          const setupAsset = latestRelease.assets?.find((asset: any) =>
            asset.name.includes('v3') && (asset.name.includes('Setup') || asset.name.includes('setup')) && asset.name.endsWith('.exe')
          );

          const hasUpdate = latestVersion !== currentVersion;

          resolve({
            hasUpdate,
            latestVersion,
            downloadUrl: setupAsset?.browser_download_url,
            error: hasUpdate && !setupAsset ? '설치 파일을 찾을 수 없습니다.' : undefined
          });
        } catch (error) {
          resolve({ hasUpdate: false, error: '응답 파싱 실패: ' + (error as Error).message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ hasUpdate: false, error: '네트워크 오류: ' + error.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ hasUpdate: false, error: '요청 시간 초과' });
    });

    req.end();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    minHeight: 700,
    minWidth: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 개발자 도구 단축키 등록 (Ctrl+Shift+I, F12)
  mainWindow.webContents.on('before-input-event', (event: any, input: any) => {
    if (input.type === 'keyDown') {
      // Ctrl+Shift+I
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        mainWindow.webContents.toggleDevTools();
      }
      // F12
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createDefaultSEOGuide();
  registerPlaywrightHandlers();
  createMenu();
});

// 메뉴 생성
function createMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: '새 프로젝트',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // 새 프로젝트 기능
          }
        },
        { type: 'separator' },
        {
          label: '종료',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '모두 선택' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        { type: 'separator' },
        { role: 'resetZoom', label: '확대/축소 재설정' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체화면 토글' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: '업데이트 확인',
          click: async () => {
            try {
              console.log('업데이트 확인 시작...');
              const updateInfo = await checkForUpdates();

              if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('update-check-result', updateInfo);
              }

              if (updateInfo.error) {
                console.error('업데이트 확인 실패:', updateInfo.error);
              } else if (updateInfo.hasUpdate) {
                console.log(`새 버전 발견: ${updateInfo.latestVersion}`);
              } else {
                console.log('최신 버전을 사용 중입니다.');
              }
            } catch (error) {
              console.error('업데이트 확인 실패:', error);
              if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('update-check-result', {
                  hasUpdate: false,
                  error: '업데이트 확인 중 오류가 발생했습니다.'
                });
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: '블로그 자동화 v3 정보',
          click: () => {
            const version = app.getVersion();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '블로그 자동화 v3 정보',
              message: '블로그 자동화 v3',
              detail: `버전: ${version}\n\nAI 기반 블로그 자동화 도구\n- Claude Web 연동 글 작성\n- 다중 이미지 생성 모델 지원\n- 자동 업데이트 시스템\n- 네이버 블로그 자동 발행\n\n개발자: PARKJAEHYEONG922`,
              buttons: ['확인']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

ipcMain.handle('claude-web:send-prompt', async (event: any, writingStylePaths: string[], seoGuidePath: string, prompt: string) => {
  return await claudeWebService.sendPrompt(writingStylePaths, seoGuidePath, prompt);
});

ipcMain.handle('claude-web:wait-response', async () => {
  return await claudeWebService.waitForResponse();
});

ipcMain.handle('claude-web:download', async () => {
  return await claudeWebService.copyContent();
});

ipcMain.handle('claude-web:cleanup', async () => {
  try {
    console.log('🧹 Claude Web 서비스 정리 시작...');
    await claudeWebService.close();
    console.log('✅ Claude Web 서비스 정리 완료');
    return { success: true };
  } catch (error) {
    console.error('❌ Claude Web 서비스 정리 실패:', error);
    return { success: false, error: (error as Error).message };
  }
});

// IPC handlers for image generation
ipcMain.handle('image:generate-prompts', async (event: any, data: { content: string; imageCount: number }) => {
  return await imageService.generateImagePrompts(data.content, data.imageCount);
});

ipcMain.handle('image:generate', async (event: any, prompt: string) => {
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
    const { LLMClientFactory } = require('../shared/services/llm');
    
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
      size: imageConfig.size || '1024x1024',
      style: imageConfig.style || 'realistic'
    });
    
    return imageUrl;
    
  } catch (error) {
    console.error('이미지 생성 실패:', error);
    
    // 실패한 경우 에러 메시지와 함께 SVG 에러 이미지 반환
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    const errorSvg = `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#ff6b6b"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-family="Arial" font-size="14">
          이미지 생성 실패
        </text>
        <text x="200" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="12">
          ${errorMsg.substring(0, 30)}
        </text>
      </svg>
    `).toString('base64')}`;
    return errorSvg;
  }
});

// IPC handler for publishing to blog (reuse v2 logic)
ipcMain.handle('blog:publish', async (event: any, content: string) => {
  // TODO: Integrate with existing v2 publishing logic
  console.log('Publishing content:', content.slice(0, 100) + '...');
  return { success: true };
});

// IPC handlers for file management
ipcMain.handle('file:save-document', async (event: any, type: 'writingStyle' | 'seoGuide', name: string, content: string) => {
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

ipcMain.handle('file:delete-document', async (event: any, filePath: string) => {
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

ipcMain.handle('file:load-documents', async (event: any, type: 'writingStyle' | 'seoGuide') => {
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

ipcMain.handle('llm:save-settings', async (event: any, settings: any) => {
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

ipcMain.handle('llm:test-config', async (event: any, config: any) => {
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
    } else if (provider === 'runware') {
      // Runware API 테스트 - 간단한 요청으로 API 키 유효성 확인
      // UUIDv4 생성 함수
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const testUUID = generateUUID();
      const response = await fetch('https://api.runware.ai/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify([
          {
            taskType: 'imageInference',
            taskUUID: testUUID,
            positivePrompt: 'test image',
            width: 512,
            height: 512,
            model: 'civitai:4201@130072', // 기본 모델
            numberResults: 1,
            steps: 1, // 최소 steps
            CFGScale: 7,
            seed: 12345
          }
        ])
      });

      if (response.ok) {
        return { success: true, message: 'Runware API 연결 성공' };
      } else {
        const errorText = await response.text();
        return { success: false, message: `Runware API 오류: ${response.status} - ${errorText}` };
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
ipcMain.on('log:add', (event: any, level: string, message: string) => {
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
ipcMain.handle('llm:generate-titles', async (event: any, data: { systemPrompt: string; userPrompt: string }) => {
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
    const { LLMClientFactory } = require('../shared/services/llm');
    
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
ipcMain.handle('open-external', async (event: any, url: string) => {
  await shell.openExternal(url);
});

// IPC handlers for temporary file operations
ipcMain.handle('file:saveTempFile', async (event: any, { fileName, data }: { fileName: string; data: number[] }) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  try {
    console.log(`💾 임시 파일 저장 시작: ${fileName}`);
    
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, fileName);
    
    // Uint8Array로 변환하여 파일 저장
    const buffer = Buffer.from(data);
    await fs.promises.writeFile(tempFilePath, buffer);
    
    console.log(`✅ 임시 파일 저장 완료: ${tempFilePath}`);
    return { success: true, filePath: tempFilePath };
  } catch (error) {
    console.error('임시 파일 저장 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('clipboard:copyImage', async (event: any, filePath: string) => {
  const { clipboard, nativeImage } = require('electron');
  const fs = require('fs');
  
  try {
    console.log(`📋 클립보드에 이미지 복사: ${filePath}`);
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
    }
    
    // 이미지 파일을 nativeImage로 생성
    const image = nativeImage.createFromPath(filePath);
    
    if (image.isEmpty()) {
      throw new Error('이미지를 로드할 수 없습니다');
    }
    
    // 클립보드에 이미지 복사
    clipboard.writeImage(image);
    
    console.log(`✅ 클립보드에 이미지 복사 완료: ${filePath}`);
    return { success: true };
    
  } catch (error) {
    console.error('클립보드 이미지 복사 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('file:deleteTempFile', async (event: any, filePath: string) => {
  const fs = require('fs');

  try {
    console.log(`🗑️ 임시 파일 삭제: ${filePath}`);
    await fs.promises.unlink(filePath);
    console.log(`✅ 임시 파일 삭제 완료: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error('임시 파일 삭제 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// App version handler
ipcMain.handle('app:get-version', async () => {
  return app.getVersion();
});

// Update checker handler
ipcMain.handle('app:check-for-updates', async () => {
  return await checkForUpdates();
});

// Update download and install handler
ipcMain.handle('app:download-update', async (event: any, downloadUrl: string) => {
  const fs = require('fs');
  const os = require('os');
  const { spawn } = require('child_process');

  try {
    console.log('📥 업데이트 다운로드 시작:', downloadUrl);
    
    // 임시 폴더에 파일 다운로드
    const tempDir = os.tmpdir();
    const fileName = downloadUrl.split('/').pop() || 'blog-automation-v3-setup.exe';
    const filePath = path.join(tempDir, fileName);
    
    // 기존 파일 삭제
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 다운로드 진행
    const file = fs.createWriteStream(filePath);
    
    return new Promise((resolve) => {
      https.get(downloadUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // 리다이렉트 처리
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, (redirectResponse) => {
              const totalBytes = parseInt(redirectResponse.headers['content-length'] || '0', 10);
              let downloadedBytes = 0;

              redirectResponse.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                
                // 진행률 전송
                if (mainWindow && mainWindow.webContents) {
                  mainWindow.webContents.send('download-progress', {
                    progress,
                    downloadedBytes,
                    totalBytes
                  });
                }
              });

              redirectResponse.pipe(file);

              file.on('finish', async () => {
                file.close();
                console.log('✅ 다운로드 완료:', filePath);
                
                try {
                  // 설치 프로그램 실행
                  console.log('🚀 설치 프로그램 실행 중:', filePath);
                  
                  // 파일 존재 확인
                  if (!fs.existsSync(filePath)) {
                    throw new Error('설치 파일을 찾을 수 없습니다: ' + filePath);
                  }
                  
                  // Windows에서 직접 실행
                  const { exec } = require('child_process');
                  exec(`"${filePath}"`, (error: any, stdout: any, stderr: any) => {
                    if (error) {
                      console.error('설치 프로그램 실행 오류:', error);
                    } else {
                      console.log('✅ 설치 프로그램 실행 성공');
                    }
                  });
                  
                  // 잠시 대기 후 현재 앱 종료
                  setTimeout(() => {
                    console.log('📱 현재 앱 종료...');
                    app.quit();
                  }, 3000);
                  
                  resolve({ 
                    success: true, 
                    message: '다운로드 완료! 설치 프로그램이 시작됩니다.' 
                  });
                  
                } catch (installError) {
                  console.error('❌ 설치 실패:', installError);
                  resolve({ 
                    success: false, 
                    error: '설치 실행 실패: ' + (installError as Error).message 
                  });
                }
              });

              file.on('error', (err: any) => {
                fs.unlink(filePath, () => {});
                console.error('❌ 파일 쓰기 실패:', err);
                resolve({ success: false, error: '파일 저장 실패: ' + err.message });
              });
            }).on('error', (err: any) => {
              console.error('❌ 리다이렉트 요청 실패:', err);
              resolve({ success: false, error: '다운로드 실패: ' + err.message });
            });
          }
        } else if (response.statusCode === 200) {
          // 직접 다운로드
          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const progress = Math.round((downloadedBytes / totalBytes) * 100);
            
            // 진행률 전송
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.send('download-progress', {
                progress,
                downloadedBytes,
                totalBytes
              });
            }
          });

          response.pipe(file);

          file.on('finish', async () => {
            file.close();
            console.log('✅ 다운로드 완료:', filePath);
            
            try {
              // 설치 프로그램 실행
              console.log('🚀 설치 프로그램 실행 중:', filePath);
              
              // 파일 존재 확인
              if (!fs.existsSync(filePath)) {
                throw new Error('설치 파일을 찾을 수 없습니다: ' + filePath);
              }
              
              // Windows에서 직접 실행
              const { exec } = require('child_process');
              exec(`"${filePath}"`, (error: any, stdout: any, stderr: any) => {
                if (error) {
                  console.error('설치 프로그램 실행 오류:', error);
                } else {
                  console.log('✅ 설치 프로그램 실행 성공');
                }
              });
              
              // 잠시 대기 후 현재 앱 종료
              setTimeout(() => {
                console.log('📱 현재 앱 종료...');
                app.quit();
              }, 3000);
              
              resolve({ 
                success: true, 
                message: '다운로드 완료! 설치 프로그램이 시작됩니다.' 
              });
              
            } catch (installError) {
              console.error('❌ 설치 실패:', installError);
              resolve({ 
                success: false, 
                error: '설치 실행 실패: ' + (installError as Error).message 
              });
            }
          });

          file.on('error', (err: any) => {
            fs.unlink(filePath, () => {});
            console.error('❌ 파일 쓰기 실패:', err);
            resolve({ success: false, error: '파일 저장 실패: ' + err.message });
          });
        } else {
          console.error('❌ HTTP 오류:', response.statusCode);
          resolve({ success: false, error: `다운로드 실패: HTTP ${response.statusCode}` });
        }
      }).on('error', (err: any) => {
        console.error('❌ 다운로드 요청 실패:', err);
        resolve({ success: false, error: '다운로드 실패: ' + err.message });
      });
    });
    
  } catch (error) {
    console.error('❌ 업데이트 다운로드 실패:', error);
    return { success: false, error: (error as Error).message };
  }
});

// ============= Naver Cookies Management =============

// 네이버 쿠키 저장 경로
function getNaverCookiesPath(): string {
  return path.join(app.getPath('userData'), 'naver_cookies.txt');
}

// 네이버 쿠키 가져오기
ipcMain.handle('naver:get-cookies', async () => {
  const fs = require('fs');
  const cookiesPath = getNaverCookiesPath();

  try {
    if (fs.existsSync(cookiesPath)) {
      const cookies = fs.readFileSync(cookiesPath, 'utf-8');
      console.log('✅ 네이버 쿠키 로드 완료');
      return cookies;
    }
    return null;
  } catch (error) {
    console.error('네이버 쿠키 로드 실패:', error);
    return null;
  }
});

// 네이버 쿠키 저장
ipcMain.handle('naver:save-cookies', async (event: any, cookies: string) => {
  const fs = require('fs');
  const cookiesPath = getNaverCookiesPath();

  try {
    fs.writeFileSync(cookiesPath, cookies, 'utf-8');
    console.log('✅ 네이버 쿠키 저장 완료');
    return true;
  } catch (error) {
    console.error('네이버 쿠키 저장 실패:', error);
    throw error;
  }
});

// 네이버 쿠키 삭제
ipcMain.handle('naver:delete-cookies', async () => {
  const fs = require('fs');
  const cookiesPath = getNaverCookiesPath();

  try {
    if (fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
      console.log('✅ 네이버 쿠키 삭제 완료');
    }
    return true;
  } catch (error) {
    console.error('네이버 쿠키 삭제 실패:', error);
    throw error;
  }
});

// 네이버 로그인 페이지 열기 (PlaywrightService 사용)
ipcMain.handle('naver:open-login', async () => {
  try {
    // PlaywrightService를 통해 네이버 로그인 수행
    const result = await playwrightService.naverLogin();

    if (!result.success) {
      throw new Error(result.error || '로그인 실패');
    }

    // 쿠키 저장
    const cookiesPath = getNaverCookiesPath();
    fs.writeFileSync(cookiesPath, result.cookies!, 'utf-8');
    console.log('✅ 쿠키 저장 완료:', cookiesPath);

    // 브라우저 닫기
    await playwrightService.cleanup();

    return { success: true, cookies: result.cookies };

  } catch (error) {
    console.error('네이버 로그인 실패:', error);
    await playwrightService.cleanup();
    return { success: false, error: (error as Error).message };
  }
});

// 네이버 트렌드 가져오기
ipcMain.handle('naver:get-trends', async (event: any, category?: string, limit: number = 20, date?: string) => {
  const fs = require('fs');
  const cookiesPath = getNaverCookiesPath();

  try {
    // 쿠키 확인
    if (!fs.existsSync(cookiesPath)) {
      return { needsLogin: true };
    }

    const cookies = fs.readFileSync(cookiesPath, 'utf-8');

    // 날짜 설정 (전달받은 날짜 또는 어제)
    let dateStr: string;
    if (date) {
      dateStr = date;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateStr = yesterday.toISOString().split('T')[0];
    }

    // 카테고리 설정
    const categories = [
      { name: '비즈니스·경제', value: '비즈니스·경제' },
      { name: 'IT·컴퓨터', value: 'IT·컴퓨터' },
      { name: '일상·생각', value: '일상·생각' },
      { name: '육아·결혼', value: '육아·결혼' },
      { name: '요리·레시피', value: '요리·레시피' },
      { name: '패션·미용', value: '패션·미용' },
      { name: '음악', value: '음악' },
      { name: '영화·드라마', value: '영화·드라마' },
    ];

    const selectedCategory = category || categories[0].value;
    const encodedCategory = encodeURIComponent(selectedCategory);

    // API URL
    const url = `https://creator-advisor.naver.com/api/v6/trend/category?categories=${encodedCategory}&contentType=text&date=${dateStr}&hasRankChange=true&interval=day&limit=${limit}&service=naver_blog`;

    console.log('🔥 네이버 트렌드 API 호출:', url);

    // API 호출
    return new Promise((resolve) => {
      https.get(url, {
        headers: {
          'accept': 'application/json',
          'accept-language': 'ko-KR,ko;q=0.9',
          'cookie': cookies,
          'referer': 'https://creator-advisor.naver.com/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 응답 상태:', res.statusCode);

          if (res.statusCode === 401 || res.statusCode === 403) {
            // 쿠키 만료
            try {
              fs.unlinkSync(cookiesPath);
              console.log('✅ 만료된 쿠키 삭제');
            } catch (e) {}
            resolve({ needsLogin: true });
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ error: `API 호출 실패: ${res.statusCode}` });
            return;
          }

          try {
            const json = JSON.parse(data);

            // 트렌드 키워드 추출
            const trends: any[] = [];

            if (json.data && Array.isArray(json.data)) {
              for (const categoryData of json.data) {
                if (categoryData.queryList && Array.isArray(categoryData.queryList)) {
                  for (const item of categoryData.queryList) {
                    trends.push({
                      keyword: item.query || item.keyword || item.title || '키워드 없음',
                      rank: item.rank || trends.length + 1,
                      rankChange: item.rankChange !== undefined ? item.rankChange : null
                    });

                    if (trends.length >= limit) break;
                  }
                }
                if (trends.length >= limit) break;
              }
            }

            console.log(`✅ 트렌드 ${trends.length}개 가져오기 완료`);
            resolve({ trends });

          } catch (error) {
            resolve({ error: 'JSON 파싱 실패' });
          }
        });
      }).on('error', (error) => {
        console.error('API 호출 오류:', error);
        resolve({ error: error.message });
      });
    });

  } catch (error) {
    console.error('네이버 트렌드 가져오기 실패:', error);
    return { error: (error as Error).message };
  }
});

// 네이버 트렌드 콘텐츠 가져오기 (특정 키워드의 상위 블로그 글 목록)
ipcMain.handle('naver:get-trend-contents', async (event, keyword: string, date: string, limit: number = 20) => {
  try {
    console.log('🔍 트렌드 콘텐츠 요청:', { keyword, date, limit });

    const cookiesPath = getNaverCookiesPath();
    console.log('🔍 쿠키 파일 경로:', cookiesPath);

    // 쿠키 확인
    if (!fs.existsSync(cookiesPath)) {
      console.log('❌ 쿠키 파일이 없습니다!');
      return { needsLogin: true };
    }

    console.log('✅ 쿠키 파일 존재');
    const cookies = fs.readFileSync(cookiesPath, 'utf-8');
    console.log('✅ 쿠키 로드 완료, 길이:', cookies.length);

    // URL 인코딩 (파라미터 순서 중요!)
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://creator-advisor.naver.com/api/v6/trend/trend-contents?date=${date}&interval=day&keyword=${encodedKeyword}&limit=${limit}&service=naver_blog`;

    console.log('📊 네이버 트렌드 콘텐츠 API 호출:', url);

    // API 호출
    return new Promise((resolve) => {
      https.get(url, {
        headers: {
          'accept': 'application/json',
          'accept-language': 'ko-KR,ko;q=0.9',
          'cookie': cookies,
          'referer': 'https://creator-advisor.naver.com/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 응답 상태:', res.statusCode);

          if (res.statusCode === 401 || res.statusCode === 403) {
            // 쿠키 만료
            try {
              fs.unlinkSync(cookiesPath);
              console.log('✅ 만료된 쿠키 삭제');
            } catch (e) {}
            resolve({ needsLogin: true });
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ error: `API 호출 실패: ${res.statusCode}` });
            return;
          }

          try {
            const json = JSON.parse(data);

            // 블로그 글 목록 추출
            const contents: any[] = [];

            if (json.data && Array.isArray(json.data)) {
              for (const item of json.data) {
                if (item.metaUrl && item.title) {
                  contents.push({
                    metaUrl: item.metaUrl,
                    title: item.title,
                    myContent: item.myContent || false
                  });
                }

                if (contents.length >= limit) break;
              }
            }

            console.log(`✅ 블로그 글 ${contents.length}개 가져오기 완료`);
            resolve({ contents });

          } catch (error) {
            resolve({ error: 'JSON 파싱 실패' });
          }
        });
      }).on('error', (error) => {
        console.error('API 호출 오류:', error);
        resolve({ error: error.message });
      });
    });

  } catch (error) {
    console.error('네이버 트렌드 콘텐츠 가져오기 실패:', error);
    return { error: (error as Error).message };
  }
});

// Settings 가져오기
ipcMain.handle('settings:get', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'llm-settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Settings 가져오기 실패:', error);
    return null;
  }
});

