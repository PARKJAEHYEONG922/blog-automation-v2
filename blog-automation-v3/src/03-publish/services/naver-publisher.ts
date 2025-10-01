// 네이버 블로그 발행 서비스

import { PublishResult, WorkflowData, NaverCredentials, PublishOption } from '../types/publishing.types';
import { NaverBlogAutomation } from '@/shared/services/automation/naver-automation';
import type { LoginResult, PublishResult as AutomationPublishResult } from '@/shared/types/automation.types';

export interface NaverPublishConfig {
  option: PublishOption;
  scheduledTime?: string;
  boardCategory?: string;
  credentials: NaverCredentials;
  saveCredentials?: boolean;
}

export class NaverPublisher {
  private automation: NaverBlogAutomation;
  private isInitialized: boolean = false;

  constructor() {
    this.automation = new NaverBlogAutomation();
  }

  /**
   * 네이버 블로그 발행
   */
  async publish(data: WorkflowData, content: string, config: NaverPublishConfig): Promise<PublishResult> {
    try {
      console.log('🟢 네이버 블로그 발행 시작...');

      // 1. 로그인 (필요한 경우)
      if (!this.automation.getLoginStatus()) {
        console.log('🔐 네이버 로그인 필요...');
        
        const loginResult = await this.automation.login(
          config.credentials.username, 
          config.credentials.password
        );

        if (loginResult !== 'success') {
          return {
            success: false,
            message: this.getLoginErrorMessage(loginResult)
          };
        }

        // 로그인 정보 저장 (옵션)
        if (config.saveCredentials) {
          this.saveCredentials(config.credentials);
        }
      }

      // 2. 글쓰기 페이지로 이동
      const navigated = await this.automation.navigateToWritePage();
      if (!navigated) {
        return {
          success: false,
          message: '글쓰기 페이지로 이동할 수 없습니다.'
        };
      }


      // 3. 게시판 선택 (옵션) 및 현재 선택된 게시판 확인
      let selectedBoardName = '기본 카테고리';
      if (config.boardCategory) {
        const boardInfo = await this.automation.selectBoardWithInfo(config.boardCategory);
        if (boardInfo.success && boardInfo.selectedBoard) {
          selectedBoardName = boardInfo.selectedBoard;
        } else {
          console.warn(`⚠️ 게시판 선택 실패: ${config.boardCategory}`);
        }
      } else {
        // 카테고리 입력이 없더라도 현재 선택된 카테고리 확인
        const boardInfo = await this.automation.selectBoardWithInfo('');
        if (boardInfo.success && boardInfo.selectedBoard) {
          selectedBoardName = boardInfo.selectedBoard;
        }
      }

      // 4. 콘텐츠 입력
      const contentFilled = await this.automation.fillContent(data.selectedTitle, content);
      if (!contentFilled) {
        return {
          success: false,
          message: '콘텐츠 입력에 실패했습니다.'
        };
      }


      // 5. 발행 실행 (옵션 매핑)
      const automationOption = config.option === 'temp' ? 'draft' : config.option;
      const publishResult: AutomationPublishResult = await this.automation.publish(
        automationOption,
        config.scheduledTime
      );

      if (publishResult === 'success' || publishResult === 'scheduled' || publishResult === 'draft_saved') {
        return {
          success: true,
          message: this.getSuccessMessage(config.option, publishResult),
          selectedBoard: selectedBoardName
        };
      } else {
        return {
          success: false,
          message: '발행에 실패했습니다.'
        };
      }

    } catch (error) {
      console.error('❌ 네이버 블로그 발행 실패:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 로그인 상태 확인
   */
  async getLoginStatus(): Promise<boolean> {
    return this.automation.getLoginStatus();
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<boolean> {
    return await this.automation.logout();
  }

  /**
   * 게시판 목록 가져오기
   */
  async getBoardList(): Promise<string[]> {
    return await this.automation.getBoardList();
  }

  /**
   * 저장된 계정 목록 가져오기
   */
  getSavedAccounts(): any[] {
    try {
      const saved = localStorage.getItem('naverAccounts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('저장된 계정 목록 로드 실패:', error);
      return [];
    }
  }

  /**
   * 계정 정보 저장
   */
  private saveCredentials(credentials: NaverCredentials): void {
    try {
      const accountId = `naver_${credentials.username}`;
      const accountInfo = {
        id: accountId,
        username: credentials.username,
        lastUsed: Date.now()
      };

      // 계정 목록 업데이트
      let accounts = this.getSavedAccounts();
      accounts = accounts.filter(acc => acc.id !== accountId);
      accounts.unshift(accountInfo);
      
      // 최대 5개까지만 저장
      if (accounts.length > 5) {
        accounts = accounts.slice(0, 5);
      }

      localStorage.setItem('naverAccounts', JSON.stringify(accounts));
      localStorage.setItem(`naverPassword_${accountId}`, credentials.password);

      console.log('✅ 네이버 계정 정보 저장 완료');
    } catch (error) {
      console.error('❌ 계정 정보 저장 실패:', error);
    }
  }



  /**
   * 로그인 에러 메시지 생성
   */
  private getLoginErrorMessage(loginResult: string): string {
    switch (loginResult) {
      case 'failed':
        return '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      case 'device_registration':
        return '기기 등록이 필요합니다. 네이버에서 기기 등록을 완료해주세요.';
      case 'captcha_required':
        return '보안 문자 입력이 필요합니다.';
      case 'two_factor_auth':
        return '2단계 인증이 필요합니다. 스마트폰에서 인증을 완료해주세요.';
      default:
        return '로그인 중 알 수 없는 오류가 발생했습니다.';
    }
  }

  /**
   * 성공 메시지 생성
   */
  private getSuccessMessage(option: PublishOption, result: string): string {
    switch (result) {
      case 'draft_saved':
        return '네이버 블로그에 임시저장되었습니다.';
      case 'scheduled':
        return '네이버 블로그 예약발행이 설정되었습니다.';
      case 'success':
      default:
        if (option === 'temp') {
          return '네이버 블로그에 임시저장되었습니다.';
        } else if (option === 'scheduled') {
          return '네이버 블로그 예약발행이 설정되었습니다.';
        } else {
          return '네이버 블로그에 성공적으로 발행되었습니다.';
        }
    }
  }

  /**
   * 네이버 블로그 전체 발행 프로세스 (원본과 완전 동일)
   */
  async publishToNaverBlog(
    credentials: { username: string; password: string },
    publishOption: 'temp' | 'immediate' | 'scheduled',
    scheduledDate?: string,
    scheduledHour?: string,
    scheduledMinute?: string,
    onStatusUpdate?: (status: { error?: string; isPublishing?: boolean; isLoggedIn?: boolean; success?: boolean }) => void,
    copyToClipboard?: () => Promise<boolean>,
    saveAccount?: (username: string, password: string) => void,
    timeError?: boolean,
    editedContent?: any,
    imageUrls?: Record<string, string>,
    onComplete?: (data: any) => void,
    workflowData?: any,  // 원본에서 data로 받던 WorkflowData
    boardCategory?: string  // 게시판 카테고리 추가
  ): Promise<{ success: boolean; message: string; url?: string }> {
    
    if (!credentials.username || !credentials.password) {
      onStatusUpdate?.({
        error: '아이디와 비밀번호를 입력해주세요.'
      });
      return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
    }
    
    onStatusUpdate?.({
      error: '',
      isPublishing: true
    });
    
    try {
      console.log('네이버 로그인 시도:', { username: credentials.username });
      
      // 1단계: 먼저 클립보드에 복사
      if (copyToClipboard) {
        onStatusUpdate?.({
          error: '콘텐츠를 클립보드에 복사하는 중...'
        });
        
        try {
          console.log('📋 클립보드 복사 함수 호출 시작...');
          const copySuccess = await copyToClipboard();
          console.log('📋 클립보드 복사 결과:', copySuccess);
          
          if (!copySuccess) {
            console.warn('⚠️ HTML 형식 복사 실패, 텍스트로 복사되었습니다.');
          } else {
            console.log('✅ 클립보드 복사 성공');
          }
        } catch (clipboardError) {
          console.error('❌ 클립보드 복사 중 오류:', clipboardError);
          
          // 클립보드 복사 실패 시 사용자에게 알림
          onStatusUpdate?.({
            error: `클립보드 복사 실패: ${(clipboardError as Error).message}. 에디터가 로드되지 않았을 수 있습니다.`
          });
          
          // 클립보드 복사 실패 시에도 계속 진행할지 아니면 중단할지 결정
          // 현재는 중단하도록 설정 (필요시 계속 진행하도록 변경 가능)
          throw new Error(`클립보드 복사 실패: ${(clipboardError as Error).message}`);
        }
      } else {
        console.warn('⚠️ copyToClipboard 함수가 전달되지 않음');
        onStatusUpdate?.({
          error: 'copyToClipboard 함수가 제공되지 않았습니다.'
        });
        throw new Error('copyToClipboard 함수가 제공되지 않았습니다.');
      }
      
      // 2단계: 브라우저 초기화
      onStatusUpdate?.({
        error: '브라우저를 시작하는 중...'
      });
      
      const initResult = await window.electronAPI.playwrightInitialize();
      if (!initResult.success) {
        throw new Error(`브라우저 초기화 실패: ${initResult.error}`);
      }
      
      // 3단계: 네이버 로그인
      onStatusUpdate?.({
        error: '네이버 로그인 중...'
      });
      
      const loginStatus: LoginResult = await this.automation.login(credentials.username, credentials.password);
      
      if (loginStatus === 'success') {
        // 로그인 성공 - 계정 자동 저장 (성공한 로그인만)
        if (credentials.username && credentials.password && saveAccount) {
          saveAccount(credentials.username, credentials.password);
        }
        
        onStatusUpdate?.({ 
          isLoggedIn: true,
          error: '로그인 성공! 글쓰기 페이지로 이동 중...'
        });
        console.log('로그인 성공!');
        
        // 4단계: 블로그 글쓰기 페이지로 이동
        const blogSuccess = await this.automation.navigateToWritePage();
        if (!blogSuccess) {
          throw new Error('블로그 글쓰기 페이지 이동 실패');
        }
        
        // 5단계: 본문 및 이미지 자동 입력
        onStatusUpdate?.({
          error: '본문과 이미지를 자동으로 입력하는 중...'
        });
        
        // 제목과 내용 추출 (원본과 완전 동일 - workflowData.selectedTitle 우선)
        const title = workflowData?.selectedTitle || editedContent?.selectedTitle || '📝 글제목';
        const content = editedContent?.htmlContent || editedContent?.content || '';
        
        console.log('📝 제목:', title);
        console.log('📝 내용 길이:', content.length);
        console.log('📝 WorkflowData selectedTitle:', workflowData?.selectedTitle);
        console.log('📝 editedContent selectedTitle:', editedContent?.selectedTitle);
        
        const contentSuccess = await this.automation.fillContent(title, content, imageUrls);
        if (!contentSuccess) {
          console.warn('⚠️ 본문 및 이미지 자동 입력 실패, 수동으로 진행해주세요.');
        }
        
        // 6단계: 발행 옵션에 따른 처리
        onStatusUpdate?.({
          error: `${publishOption === 'temp' ? '임시저장' : publishOption === 'immediate' ? '즉시 발행' : '예약 발행'} 처리 중...`
        });
        
        // 예약발행인 경우 시간 유효성 체크
        if (publishOption === 'scheduled' && timeError) {
          onStatusUpdate?.({
            error: '예약 시간을 올바르게 설정해주세요.',
            isPublishing: false
          });
          return { success: false, message: '예약 시간을 올바르게 설정해주세요.' };
        }
        
        // 발행 실행
        let publishResult: AutomationPublishResult;
        let selectedBoardName = '기본 카테고리';

        if (publishOption === 'temp') {
          publishResult = await this.automation.publish('draft');
        } else {
          // 예약 시간 문자열 생성 (원본 방식)
          let scheduledTime: string | undefined;
          if (publishOption === 'scheduled' && scheduledDate && scheduledHour && scheduledMinute) {
            scheduledTime = `${scheduledDate} ${scheduledHour}:${scheduledMinute}:00`;
          }

          // 게시판 카테고리 정보를 publish 메서드에 전달
          publishResult = await this.automation.publish(
            publishOption as 'immediate' | 'scheduled',
            scheduledTime,
            boardCategory  // 게시판 카테고리 전달
          );
          
          // 발행 성공 시 실제 선택된 게시판 정보 사용
          if (publishResult === 'success' || publishResult === 'scheduled') {
            // 발행 과정에서 실제 선택된 게시판 정보 가져오기
            const finalSelectedBoard = this.automation.getLastSelectedBoard();
            if (finalSelectedBoard && finalSelectedBoard !== '기본 카테고리') {
              selectedBoardName = finalSelectedBoard;
            }
            console.log('📋 최종 선택된 게시판:', selectedBoardName);
          }
        }
        
        if (publishResult === 'success' || publishResult === 'scheduled' || publishResult === 'draft_saved') {
          // 7단계: 완료 안내
          const successMessage = publishOption === 'temp' ? '임시저장 완료!' : 
                                publishOption === 'immediate' ? '즉시 발행 완료!' : 
                                '예약 발행 설정 완료!';
          
          onStatusUpdate?.({
            error: `${successMessage} 브라우저에서 확인해주세요.`
          });
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 성공 처리 (브라우저는 열린 상태로 유지)
          onStatusUpdate?.({
            success: true,
            isPublishing: false,
            error: ''
          });
          
          const result = {
            success: true,
            message: '네이버 블로그에 발행 완료! 브라우저에서 확인해주세요.',
            url: `https://blog.naver.com/${credentials.username}?Redirect=Write&`,
            selectedBoard: selectedBoardName  // 선택된 게시판 정보 추가
          };
          
          // 상위 컴포넌트에 완료 알림
          onComplete?.({ 
            generatedContent: editedContent
          });
          
          return result;
        } else {
          throw new Error('발행 실패');
        }
        
      } else if (loginStatus === 'two_factor_auth') {
        onStatusUpdate?.({
          error: '2차 인증이 필요합니다. 브라우저에서 인증을 완료해주세요.',
          isPublishing: false
        });
        return { 
          success: false, 
          message: '2차 인증이 필요합니다. 브라우저에서 인증을 완료한 후 다시 시도해주세요.' 
        };
        
      } else if (loginStatus === 'device_registration') {
        onStatusUpdate?.({
          error: '새 기기 등록이 필요합니다. 브라우저에서 등록을 완료해주세요.',
          isPublishing: false
        });
        return { 
          success: false, 
          message: '새 기기 등록이 필요합니다. 브라우저에서 등록을 완료한 후 다시 시도해주세요.' 
        };
        
      } else {
        throw new Error('로그인 실패');
      }
      
    } catch (error) {
      console.error('로그인 또는 발행 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인 또는 발행에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      
      onStatusUpdate?.({
        error: errorMessage,
        isLoggedIn: false,
        isPublishing: false
      });
      
      // 브라우저 정리
      try {
        await window.electronAPI.playwrightCleanup();
      } catch (cleanupError) {
        console.error('브라우저 정리 실패:', cleanupError);
      }
      
      return { success: false, message: errorMessage };
    }
  }
}