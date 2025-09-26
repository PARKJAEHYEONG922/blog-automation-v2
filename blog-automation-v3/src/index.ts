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