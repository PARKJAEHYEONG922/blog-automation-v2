const { chromium } = require('playwright');

class ClaudeWebService {
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
      
      // 자동화용 Chrome을 별도 프로필로 실행
      exec(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="${automationProfileDir}" --no-first-run --no-default-browser-check`);
      
      // Chrome 시작 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 실행중인 Chrome에 연결
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      
      // 기존 페이지들 가져오기
      const pages = this.browser.contexts()[0].pages();
      
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

  async sendPrompt(writingStylePaths: string[], seoGuidePath: string, topic: string) {
    if (!this.page) {
      throw new Error('브라우저가 열려있지 않습니다.');
    }

    console.log('========== 파일 첨부 시작 ==========');
    console.log('말투 문서 파일 개수:', writingStylePaths?.length);
    console.log('말투 문서 파일들:', writingStylePaths);
    console.log('SEO 가이드 파일:', seoGuidePath || '없음');
    console.log('주제:', topic);
    console.log('=====================================');

    try {
      console.log('1단계: 말투 문서들 첨부...');
      
      const fs = require('fs');
      
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
      
      // 3. 전체 프롬프트 한 번에 입력 - 말투/SEO 설명 먼저, 주제는 마지막
      let finalPrompt = '';
      
      // 첨부된 파일에 따른 구체적인 설명
      if (writingStylePaths.length > 0) {
        if (writingStylePaths.length === 1) {
          finalPrompt += `1번 문서는 블로그 말투 참고 문서입니다. 이 말투를 참고해서 `;
        } else {
          finalPrompt += `1번, 2번 문서는 블로그 말투 참고 문서입니다. 이 말투들을 참고해서 `;
        }
      }
      
      if (seoGuidePath && seoGuidePath.trim() !== '') {
        if (writingStylePaths.length > 0) {
          finalPrompt += `자연스럽게 글을 작성하되, ${writingStylePaths.length + 1}번 문서의 네이버 블로그 SEO 최적화 가이드를 지켜서 `;
        } else {
          finalPrompt += `1번 문서의 네이버 블로그 SEO 최적화 가이드를 지켜서 `;
        }
      }
      
      finalPrompt += `다음 SEO 가이드를 준수하여 블로그 글을 작성해주세요.\n\n`;
      
      finalPrompt += `## SEO 및 기술적 요구사항\n`;
      finalPrompt += `- 글자 수: 1,700-2,000자 (공백 제외)\n`;
      finalPrompt += `- 메인 키워드: 5-6회 자연 반복\n`;
      finalPrompt += `- 보조 키워드: 각각 3-4회 사용\n`;
      finalPrompt += `- 이미지: 5개 이상 (이미지) 표시로 배치\n\n`;
      
      finalPrompt += `## 이미지 배치 규칙 (중요)\n`;
      finalPrompt += `- **소제목과 설명이 완전히 끝난 후**에만 (이미지) 배치\n`;
      finalPrompt += `- **단계별 설명 중간에는 절대 이미지 배치 금지** (1단계, 2단계, - 항목 등의 중간)\n`;
      finalPrompt += `- **최적 배치 위치**: 소제목 → 설명 → (이미지) 순서\n`;
      finalPrompt += `- **이미지 집중 배치**: 소제목이 적고 이미지가 많이 필요한 경우 한 곳에 (이미지)(이미지) 연속 배치 가능\n`;
      finalPrompt += `- **안정적인 패턴**: 큰 주제가 완료된 후 관련 이미지들을 모아서 배치\n\n`;
      
      finalPrompt += `## 마크다운 구조 규칙 (자동화 호환성)\n`;
      finalPrompt += `- **대제목**: ## 만 사용 (### 사용 금지)\n`;
      finalPrompt += `- **소제목**: ### 텍스트 (세부 항목용)\n`;
      finalPrompt += `- **강조**: **텍스트** (단계명, 중요 포인트)\n`;
      finalPrompt += `- **리스트**: - 항목 (일반 목록)\n`;
      finalPrompt += `- **체크리스트**: ✓ 항목 (완료/확인 항목)\n`;
      finalPrompt += `- **번호 목록**: 1. 항목 (순서가 중요한 경우)\n\n`;
      
      finalPrompt += `## 글쓰기 품질 요구사항\n`;
      finalPrompt += `- **제목 중심 작성**: 참고 자료와 선택된 제목이 다르더라도 반드시 선택된 제목에 맞는 내용으로 작성\n`;
      finalPrompt += `- **참고 자료 활용**: 위 분석 결과는 참고용이므로, 제목과 관련된 부분만 선별적으로 활용\n`;
      finalPrompt += `- **자연스러운 문체**: AI 생성티 없는 개성 있고 자연스러운 어투로 작성\n`;
      finalPrompt += `- **완전한 내용**: XX공원, OO병원 같은 placeholder 사용 금지. 구체적인 정보가 없다면 "근처 공원", "동네 병원" 등 일반적 표현 사용\n`;
      finalPrompt += `- **이미지 배치 준수**: 단계별 설명이나 목록 중간에는 절대 이미지를 넣지 말고, 주제별 설명이 완전히 끝난 후에만 배치\n\n`;
      
      finalPrompt += `주제: ${topic}`;
      
      await this.typeInEditor(finalPrompt);
      
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
      'p:text("파일 업로드")'
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
      // AI 응답 완료 대기 (로딩 인디케이터가 사라질 때까지)
      await this.page.waitForFunction(() => {
        const loadingElements = document.querySelectorAll('[data-testid="loading"], .loading, [class*="loading"]');
        return loadingElements.length === 0;
      }, { timeout: 300000 }); // 5분 대기
      
      // 추가로 2초 대기 (안전장치)
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('AI 응답 대기 실패:', error);
      throw error;
    }
  }

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
      const fs = require('fs');
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

module.exports = { ClaudeWebService };