import { chromium } from 'playwright';
import * as fs from 'fs';

export class ClaudeWebService {
  private browser: any;
  private page: any;
  private debugPort: number;

  constructor() {
    this.browser = null;
    this.page = null;
    this.debugPort = 9222; // 기본 포트
  }

  // 사용 가능한 포트 찾기
  private async findAvailablePort(startPort: number = 9222): Promise<number> {
    const { exec } = require('child_process');

    for (let port = startPort; port < startPort + 100; port++) {
      const isAvailable = await new Promise<boolean>((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error: any, stdout: string) => {
          // 포트가 사용중이면 stdout에 결과가 있음
          resolve(!stdout || stdout.trim() === '');
        });
      });

      if (isAvailable) {
        console.log(`✅ 사용 가능한 포트 발견: ${port}`);
        return port;
      } else {
        console.log(`⚠️ 포트 ${port} 사용중, 다음 포트 확인...`);
      }
    }

    throw new Error('사용 가능한 포트를 찾을 수 없습니다 (9222-9321 범위)');
  }

  async openBrowser() {
    try {
      const { exec } = require('child_process');
      const os = require('os');
      const path = require('path');

      // 사용 가능한 포트 찾기
      this.debugPort = await this.findAvailablePort(9222);
      console.log(`🚀 Chrome을 포트 ${this.debugPort}에서 실행합니다`);

      // 자동화 전용 프로필 디렉토리
      const automationProfileDir = path.join(os.homedir(), 'AppData', 'Local', 'BlogAutomation', 'Chrome_Profile');

      // 자동화용 Chrome을 별도 프로필로 실행 (동적 포트 사용 + 큰 창 크기)
      exec(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${this.debugPort} --user-data-dir="${automationProfileDir}" --no-first-run --no-default-browser-check --disable-background-timer-throttling --window-size=1600,1000 --window-position=100,100`);

      // Chrome 시작 대기
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 실행중인 Chrome에 연결 (동적 포트 사용)
      this.browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);
      
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
      
      // Chrome 실행시 이미 큰 창으로 설정됨 (1600x1000)
      console.log('Chrome이 1600x1000 창 크기로 실행됨');
      
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
          console.log(`✅ 자료 조사 완료! 아티팩트 생성 감지 (${researchCheckCount * 5}초 경과)`);
          console.log('아티팩트 글 생성 완료 모니터링을 시작합니다...');
          researchPhase = false;
          break;
        } else if (hasWebResults) {
          console.log(`🔍 자료 조사 중... (${researchCheckCount * 5}초 경과)`);
        } else {
          console.log(`⏳ AI 사고 중... (${researchCheckCount * 5}초 경과)`);
        }
        
        await this.page.waitForTimeout(5000); // 5초마다 체크
        
        // AI 사고 중이었고 아직 아티팩트가 없다면 일반 채팅 완료 여부 확인
        if (!hasArtifact) {
          // AI 생성이 완료되었는지 확인 (개선된 감지 로직)
          const aiCompleted = await this.page.evaluate(() => {
            // 1. data-is-streaming="false" 속성 확인 (가장 정확한 방법)
            const streamingElements = document.querySelectorAll('[data-is-streaming="false"]');
            if (streamingElements.length > 0) {
              console.log('✅ data-is-streaming="false" 감지됨 - AI 생성 완료');
              return true;
            }
            
            // 2. 복사 버튼 활성화 상태 확인
            const copyButtons = document.querySelectorAll('button[data-testid="action-bar-copy"]');
            let hasCopyButton = false;
            for (const button of copyButtons) {
              const htmlButton = button as HTMLButtonElement;
              if (!htmlButton.disabled && htmlButton.offsetWidth > 0 && htmlButton.offsetHeight > 0) {
                hasCopyButton = true;
                console.log('✅ 활성화된 복사 버튼 발견 - AI 생성 완료');
                break;
              }
            }
            
            if (hasCopyButton) {
              return true;
            }
            
            // 3. 기존 로직: 사용자 메시지 기반 감지 (백업용)
            const userMessages = document.querySelectorAll('[data-testid="user-message"]');
            const lastUserMessage = userMessages[userMessages.length - 1];
            
            if (!lastUserMessage) {
              console.log('사용자 메시지를 찾을 수 없음');
              return false;
            }
            
            // 마지막 사용자 메시지 다음에 AI 응답이 있는지 확인
            let currentElement = lastUserMessage.closest('.mb-1, .group')?.nextElementSibling;
            let hasAiResponse = false;
            
            // 다음 형제 요소들 중에서 AI 응답 찾기
            while (currentElement && !hasAiResponse) {
              // AI 응답 메시지인지 확인 (사용자 메시지가 아니고 내용이 있는 경우)
              const hasUserTestId = currentElement.querySelector('[data-testid="user-message"]');
              const hasContent = currentElement.textContent && currentElement.textContent.trim().length > 10;
              
              if (!hasUserTestId && hasContent) {
                hasAiResponse = true;
                console.log('AI 응답 발견:', currentElement.textContent.substring(0, 100) + '...');
                
                // AI 응답에 생성 중 표시가 있는지 확인
                const responseText = currentElement.textContent || '';
                const isGenerating = responseText.includes('생각') || 
                                   responseText.includes('Thinking') || 
                                   responseText.includes('...') ||
                                   responseText.includes('타이핑');
                
                if (isGenerating) {
                  console.log('AI 응답에서 생성 중 텍스트 발견:', responseText.substring(0, 50));
                  return false;
                }
              }
              
              currentElement = currentElement.nextElementSibling;
            }
            
            if (!hasAiResponse) {
              console.log('사용자 메시지 후 AI 응답이 아직 없음');
              return false;
            }
            
            // 4. 전역 스피너 확인 (페이지 전체)
            const globalSpinners = document.querySelectorAll('[class*="animate-spin"], .animate-spin');
            if (globalSpinners.length > 0) {
              console.log('전역 스피너 감지됨:', globalSpinners.length + '개');
              return false;
            }
            
            console.log('=== AI 생성 완료로 판단됨 (기존 로직) ===');
            return true;
          });
          
          const nowHasArtifact = await this.page.$('#markdown-artifact');
          
          if (aiCompleted && !nowHasArtifact) {
            console.log('🔄 AI 사고 완료 감지! 아티팩트 생성 여유시간 10초 대기 중...');
            
            // 10초 여유시간 후 아티팩트 재확인
            await this.page.waitForTimeout(10000);
            const finalArtifactCheck = await this.page.$('#markdown-artifact');
            
            if (!finalArtifactCheck) {
              console.log('✅ 10초 후에도 아티팩트 없음 → 일반 채팅으로 글 생성 완료!');
              console.log('복사는 copyContent()에서 처리됩니다.');
              
              // 일반 채팅 완료 - 함수 종료
              return;
            } else {
              console.log('🎉 10초 여유시간 중 아티팩트가 생성되었습니다!');
              researchPhase = false; // 아티팩트 감지로 기존 로직 진행
              break;
            }
          }
        }
        
        // 5분 이상 걸리면 강제 종료
        if (researchCheckCount >= 60) { // 5초 * 60 = 5분
          console.log('5분 이상 경과, 강제로 다음 단계로 이동...');
          researchPhase = false;
        }
      }
      
      // AI 사고 완료 후 아티팩트 체크는 이미 위에서 완료됨
      // 여기까지 왔다면 아티팩트가 있다는 의미이므로 바로 아티팩트 처리 진행
      console.log('아티팩트 감지됨, 아티팩트 처리 로직 시작...');
      
      // 오른쪽 아티팩트 영역이 실제로 보이는지 확인
      const artifactInfo = await this.page.$eval('#markdown-artifact', (el: Element) => {
        const rect = el.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          visible: rect.width > 0 && rect.height > 0
        };
      });
      
      console.log(`오른쪽 아티팩트 영역 확인: 너비=${artifactInfo.width}, 높이=${artifactInfo.height}, 좌측=${artifactInfo.left}, 우측=${artifactInfo.right}`);
      
      if (!artifactInfo.visible || artifactInfo.width < 200) {
        console.warn('⚠️ 아티팩트 영역이 제대로 보이지 않습니다. 화면이 너무 작을 수 있습니다.');
      } else {
        console.log('✅ 오른쪽 아티팩트 영역이 정상적으로 보입니다.');
      }
      
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

    // 먼저 아티팩트가 있는지 확인
    const hasArtifact = await this.page.$('#markdown-artifact');
    
    if (!hasArtifact) {
      console.log('아티팩트 없음 → 일반 채팅에서 복사 시도');
      
      // 일반 채팅에서 복사 (copyContentFromChat 로직을 여기에 통합)
      console.log('페이지를 맨 아래로 스크롤 중...');
      
      // 페이지를 맨 아래로 스크롤하여 복사 버튼이 보이도록 함
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // 스크롤 완료 대기
      await this.page.waitForTimeout(1000);
      
      console.log('채팅 영역 복사 버튼 클릭 중...');
      
      // 채팅 영역의 복사 버튼 찾기
      const chatCopySelectors = [
        'button[data-testid="action-bar-copy"]',
        'button:has(svg[viewBox="0 0 20 20"]):has(path[d*="M10 1.5C11.1097"])',
        'button[aria-label*="복사"]',
        'button[aria-label*="Copy"]',
        'button:has-text("복사")',
        'button:has-text("Copy")',
        '[data-testid="conversation"] > div:last-child button[data-testid="action-bar-copy"]'
      ];
      
      let copyButton = null;
      for (const selector of chatCopySelectors) {
        try {
          copyButton = await this.page.waitForSelector(selector, { timeout: 2000 });
          console.log(`✅ 채팅 복사 버튼 찾음: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!copyButton) {
        throw new Error('채팅 영역에서 복사 버튼을 찾을 수 없습니다');
      }
      
      // 복사 버튼 클릭
      await copyButton.click();
      console.log('채팅 복사 버튼 클릭됨');
      
      // 클립보드에서 내용 가져오기
      await this.page.waitForTimeout(1000);
      const content = await this.page.evaluate(() => {
        return navigator.clipboard.readText();
      });
      
      console.log('채팅 복사 완료, 내용 길이:', content.length);
      return content;
    }

    try {
      console.log('아티팩트에서 복사 버튼 클릭 중...');
      
      // 방법 1: 직접 복사 버튼 찾기 (화면이 넓을 때)
      try {
        console.log('직접 복사 버튼 찾는 중...');
        const directCopyButton = await this.page.waitForSelector('button:has-text("복사")', { timeout: 3000 });
        await directCopyButton.click();
        console.log('✅ 직접 복사 버튼 클릭 성공');
      } catch (directError) {
        console.log('직접 복사 버튼 없음, ... 메뉴 방식 시도...');
        
        // 방법 2: ... 버튼 클릭 후 메뉴에서 복사 선택 (화면이 좁을 때)
        // ... 버튼 (3개 점) 찾기
        const moreButtonSelectors = [
          'button:has(svg[viewBox="0 0 20 20"]):has(path[d*="10 14C10.8284 14"])', // 3개 점 SVG
          'button:has(div:has(svg[viewBox="0 0 20 20"]))',
          'button[aria-label*="더보기"]',
          'button[aria-label*="More"]',
          'button:has(svg):has(path[d*="10 14"])',
          'div[style*="width: 16px; height: 16px"]:has(svg) button',
          'button:has(div[style*="width: 16px"]):has(svg)'
        ];
        
        let moreButton = null;
        for (const selector of moreButtonSelectors) {
          try {
            moreButton = await this.page.waitForSelector(selector, { timeout: 2000 });
            console.log(`✅ ... 버튼 찾음: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
        
        if (!moreButton) {
          throw new Error('복사 버튼과 ... 메뉴 버튼을 모두 찾을 수 없습니다');
        }
        
        // ... 버튼 클릭
        await moreButton.click();
        console.log('... 버튼 클릭됨');
        
        // 드롭다운 메뉴가 나타날 때까지 대기
        await this.page.waitForTimeout(500);
        
        // 메뉴에서 복사 항목 클릭
        const menuCopySelectors = [
          'div[role="menuitem"]:has-text("복사")',
          '[role="menuitem"]:has-text("복사")',
          '[role="menuitem"]:has-text("Copy")',
          'div[data-radix-collection-item]:has-text("복사")',
          '[tabindex="-1"]:has-text("복사")'
        ];
        
        let menuCopyButton = null;
        for (const selector of menuCopySelectors) {
          try {
            menuCopyButton = await this.page.waitForSelector(selector, { timeout: 2000 });
            console.log(`✅ 메뉴 복사 버튼 찾음: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
        
        if (!menuCopyButton) {
          throw new Error('드롭다운 메뉴에서 복사 버튼을 찾을 수 없습니다');
        }
        
        await menuCopyButton.click();
        console.log('✅ 메뉴에서 복사 버튼 클릭 성공');
      }
      
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


  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

