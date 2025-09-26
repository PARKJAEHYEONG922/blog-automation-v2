import { chromium } from 'playwright';
import * as fs from 'fs';

export class ClaudeWebService {
  private browser: any;
  private page: any;

  constructor() {
    this.browser = null;
    this.page = null;
  }

  async openBrowser() {
    try {
      const { exec } = require('child_process');
      const os = require('os');
      const path = require('path');
      
      // 기존 디버깅 모드 Chrome 종료 (포트 9222 사용하는 프로세스만)
      await new Promise((resolve) => {
        exec('netstat -ano | findstr :9222', (error: any, stdout: string) => {
          if (stdout) {
            const lines = stdout.split('\n');
            lines.forEach((line: string) => {
              const pid = line.trim().split(/\s+/).pop();
              if (pid && pid !== 'PID') {
                exec(`taskkill /F /PID ${pid}`, () => {});
              }
            });
          }
          setTimeout(resolve, 2000);
        });
      });
      
      // 자동화 전용 프로필 디렉토리
      const automationProfileDir = path.join(os.homedir(), 'AppData', 'Local', 'BlogAutomation', 'Chrome_Profile');
      
      // 자동화용 Chrome을 별도 프로필로 실행 (클립보드 권한만 허용)
      exec(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="${automationProfileDir}" --no-first-run --no-default-browser-check --disable-background-timer-throttling`);
      
      // Chrome 시작 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 실행중인 Chrome에 연결
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      
      // 클립보드 권한 허용
      const context = this.browser.contexts()[0];
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      
      // 기존 페이지들 가져오기
      const pages = context.pages();
      
      // 첫 번째 페이지 사용 (이미 열린 탭)
      if (pages.length > 0) {
        this.page = pages[0];
        await this.page.goto('https://claude.ai/');
      } else {
        // 페이지가 없으면 새로 생성
        this.page = await this.browser.newPage();
        await this.page.goto('https://claude.ai/');
      }
      
      // 로그인 상태 확인 및 대기
      let currentUrl = this.page.url();
      
      // 로그인 화면인지 확인
      if (currentUrl.includes('/login')) {
        console.log('로그인이 필요합니다. 로그인 완료까지 대기 중...');
        
        // 로그인 완료까지 대기 (URL이 /new나 메인 페이지로 변경될 때까지)
        await this.page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('/new') || (url === 'https://claude.ai/' || url.endsWith('claude.ai/'));
          },
          { timeout: 300000 } // 5분 대기
        );
        
        console.log('로그인 완료 감지됨!');
      }
      
      // 채팅 입력창 대기
      await this.page.waitForSelector('.ProseMirror', { timeout: 60000 });
      
    } catch (error) {
      console.error('클로드 웹 브라우저 열기 실패:', error);
      throw error;
    }
  }

  async sendPrompt(writingStylePaths: string[], seoGuidePath: string, prompt: string) {
    if (!this.page) {
      throw new Error('브라우저가 열려있지 않습니다.');
    }

    console.log('========== 파일 첨부 시작 ==========');
    console.log('말투 문서 파일 개수:', writingStylePaths?.length);
    console.log('말투 문서 파일들:', writingStylePaths);
    console.log('SEO 가이드 파일:', seoGuidePath || '없음');
    console.log('프롬프트 길이:', prompt.length);
    console.log('=====================================');

    try {
      console.log('1단계: 말투 문서들 첨부...');
      
      
      // 1. 말투 문서 파일들 첨부
      for (let i = 0; i < writingStylePaths.length; i++) {
        const filePath = writingStylePaths[i];
        
        // 파일 존재 확인
        if (!fs.existsSync(filePath)) {
          console.warn(`말투 문서 파일이 존재하지 않음: ${filePath}`);
          continue;
        }
        
        console.log(`말투 문서 ${i + 1} 첨부 중: ${filePath}`);
        
        // 파일 첨부
        await this.attachFile(filePath);
        
        // 각 파일 첨부 사이에 대기
        await this.page.waitForTimeout(1000);
      }
      
      console.log('========== 2단계: SEO 가이드 첨부 ==========');
      
      // 2. SEO 가이드 파일 첨부
      if (seoGuidePath && seoGuidePath.trim() !== '') {
        // 파일 존재 확인
        if (fs.existsSync(seoGuidePath)) {
          console.log('SEO 가이드 첨부 중:', seoGuidePath);
          await this.attachFile(seoGuidePath);
          await this.page.waitForTimeout(1000);
        } else {
          console.warn(`SEO 가이드 파일이 존재하지 않음: ${seoGuidePath}`);
        }
      }
      console.log('=====================================');
      
      console.log('3단계: 클립보드 초기화 및 프롬프트 입력 중...');
      
      // 클립보드 초기화 (파일 첨부로 인한 오염 제거)
      await this.page.evaluate(() => {
        return navigator.clipboard.writeText('');
      });
      
      // 3. 전달받은 프롬프트를 그대로 사용
      await this.typeInEditor(prompt);
      
      // 4. 전송
      await this.sendMessage();
      
    } catch (error) {
      console.error('프롬프트 전송 실패:', error);
      throw error;
    }
  }

  private async typeInEditor(text: string) {
    // ProseMirror 에디터 클릭
    const editorElement = await this.page.waitForSelector('.ProseMirror');
    await editorElement.click();
    
    // 클립보드에 프롬프트 복사
    await this.page.evaluate((textToCopy: string) => {
      return navigator.clipboard.writeText(textToCopy);
    }, text);
    
    // 잠시 대기 후 Ctrl+V로 붙여넣기
    await this.page.waitForTimeout(500);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('v');
    await this.page.keyboard.up('Control');
    
    console.log('프롬프트 복사 붙여넣기 완료');
  }

  private async attachFile(filePath: string) {
    console.log(`파일 첨부 시도: ${filePath}`);
    
    // + 버튼 클릭
    console.log('+ 버튼 클릭 중...');
    const plusButton = await this.page.waitForSelector('button[data-testid="input-menu-plus"]', { timeout: 10000 });
    await plusButton.click();
    
    // "파일 업로드" 메뉴 클릭
    console.log('파일 업로드 메뉴 클릭 중...');
    await this.page.waitForTimeout(1000);
    
    const uploadSelectors = [
      'text="파일 업로드"',
      ':text("파일 업로드")',
      '[role="menuitem"]:has-text("파일 업로드")',
      'p:text("파일 업로드")',
      'text="Upload file"',
      ':text("Upload file")',
      '[role="menuitem"]:has-text("Upload file")',
      'button:has-text("파일")',
      'div:has-text("파일 업로드")',
      '[data-testid*="upload"]',
      '[aria-label*="파일"]',
      '[aria-label*="upload"]'
    ];
    
    let uploadButton = null;
    for (const selector of uploadSelectors) {
      try {
        uploadButton = await this.page.waitForSelector(selector, { timeout: 2000 });
        console.log(`파일 업로드 버튼 찾음: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!uploadButton) {
      throw new Error('파일 업로드 메뉴 버튼을 찾을 수 없습니다');
    }
    
    // fileChooser 이벤트와 클릭을 동시에
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      uploadButton.click()
    ]);
    
    console.log(`파일 선택: ${filePath}`);
    await fileChooser.setFiles(filePath);
    await this.page.waitForTimeout(3000);
    console.log('파일 첨부 완료');
  }

  private async sendMessage() {
    console.log('메시지 전송 중...');
    
    // 텍스트 입력 완료 후 잠시 대기
    await this.page.waitForTimeout(1000);
    
    // 엔터키로 전송 (더 간단하고 안전함)
    await this.page.keyboard.press('Enter');
    console.log('엔터키로 전송 완료');
  }

  async waitForResponse() {
    if (!this.page) {
      throw new Error('브라우저가 열려있지 않습니다.');
    }

    try {
      console.log('0단계: 자료 조사 단계 모니터링 중...');
      
      // 0단계: 자료 조사 단계 감지 (5초마다 체크)
      let researchPhase = true;
      let researchCheckCount = 0;
      
      while (researchPhase) {
        researchCheckCount++;
        
        // 웹 검색 결과가 있는지 확인
        const hasWebResults = await this.page.$('.transition-all.duration-400.ease-out.rounded-lg.border-0\\.5.flex.flex-col');
        
        // 아티팩트가 생성되었는지 확인
        const hasArtifact = await this.page.$('#markdown-artifact');
        
        if (hasArtifact) {
          console.log(`✅ 자료 조사 완료! 아티팩트 생성 시작 (${researchCheckCount * 5}초 경과)`);
          researchPhase = false;
          break;
        } else if (hasWebResults) {
          console.log(`🔍 자료 조사 중... (${researchCheckCount * 5}초 경과)`);
        } else {
          console.log(`⏳ AI 사고 중... (${researchCheckCount * 5}초 경과)`);
        }
        
        await this.page.waitForTimeout(5000); // 5초마다 체크
        
        // 5분 이상 걸리면 아티팩트 생성 대기로 전환
        if (researchCheckCount >= 60) { // 5초 * 60 = 5분
          console.log('자료 조사가 길어지고 있습니다. 아티팩트 생성 대기로 전환...');
          researchPhase = false;
        }
      }
      
      console.log('1단계: 아티팩트 생성 대기 중...');
      // 1단계: 아티팩트 생성 대기
      await this.page.waitForSelector('#markdown-artifact', { timeout: 300000 });
      console.log('✨ 아티팩트 생성 감지됨!');
      
      console.log('2단계: 내용 변화 모니터링 시작 (3초 간격)');
      // 2단계: 내용 변화 모니터링 (3초 간격)
      let previousContent = '';
      let noChangeCount = 0;
      const maxNoChangeCount = 4; // 10초 대기 (3초 * 3 + 1초 여유)
      
      while (noChangeCount < maxNoChangeCount) {
        await this.page.waitForTimeout(3000);
        
        const currentContent = await this.page.$eval('#markdown-artifact', (el: Element) => el.textContent || '');
        const contentLength = currentContent.length;
        
        if (currentContent === previousContent) {
          noChangeCount++;
          console.log(`🔄 변화 없음 ${noChangeCount}/${maxNoChangeCount} (글자 수: ${contentLength})`);
        } else {
          noChangeCount = 0; // 변화가 있으면 카운트 리셋
          previousContent = currentContent;
          console.log(`✏️ 내용 변화 감지, 카운트 리셋 (글자 수: ${contentLength})`);
        }
      }
      
      console.log('3단계: 추가 안전 대기 (2초)');
      // 3단계: 추가 안전장치
      await this.page.waitForTimeout(2000);
      console.log('✅ 아티팩트 완료 감지 완마!');
      
    } catch (error) {
      console.error('AI 응답 대기 실패:', error);
      throw error;
    }
  }

  async copyContent() {
    if (!this.page) {
      throw new Error('브라우저가 열려있지 않습니다.');
    }

    try {
      console.log('복사 버튼 클릭 중...');
      
      // 복사 버튼 클릭
      const copyButton = await this.page.waitForSelector('button:has-text("복사")', { timeout: 10000 });
      await copyButton.click();
      
      // 잠시 대기 후 클립보드에서 내용 가져오기
      await this.page.waitForTimeout(1000);
      
      const content = await this.page.evaluate(() => {
        return navigator.clipboard.readText();
      });
      
      console.log('복사 완료, 내용 길이:', content.length);
      return content;
      
    } catch (error) {
      console.error('콘텐츠 복사 실패:', error);
      throw error;
    }
  }

  // 기존 다운로드 방식도 유지 (백업용)
  async downloadContent() {
    if (!this.page) {
      throw new Error('브라우저가 열려있지 않습니다.');
    }

    try {
      // 다운로드 버튼 찾기 및 클릭
      const downloadButton = await this.page.waitForSelector('button[aria-label*="다운로드"], button[aria-label*="Download"]');
      
      // 다운로드 시작
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        downloadButton.click()
      ]);

      // 다운로드 완료 대기 및 경로 얻기
      const path = await download.path();
      
      if (!path) {
        throw new Error('다운로드 파일 경로를 찾을 수 없습니다.');
      }

      // 파일 내용 읽기
      const content = fs.readFileSync(path, 'utf-8');
      
      // 임시 파일 삭제
      fs.unlinkSync(path);
      
      return content;
      
    } catch (error) {
      console.error('콘텐츠 다운로드 실패:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

