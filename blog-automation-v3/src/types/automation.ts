// 브라우저 자동화 관련 타입 정의

// 로그인 결과 타입
export type LoginResult = 'success' | 'failed' | 'device_registration' | 'captcha_required' | 'two_factor_auth';

// 발행 결과 타입 (자동화용)
export type PublishResult = 'success' | 'failed' | 'draft_saved' | 'scheduled';

// 브라우저 자동화 기본 인터페이스
export interface IBrowserAutomation {
  // 로그인
  login(username: string, password: string): Promise<LoginResult>;
  
  // 로그아웃
  logout(): Promise<boolean>;
  
  // 글쓰기 페이지로 이동
  navigateToWritePage(): Promise<boolean>;
  
  // 콘텐츠 입력
  fillContent(title: string, content: string, imageUrls?: Record<string, string>): Promise<boolean>;
  
  // 발행
  publish(option: 'immediate' | 'scheduled' | 'draft', scheduledTime?: string): Promise<PublishResult>;
}

// 네이버 블로그 자동화 전용 인터페이스
export interface INaverBlogAutomation extends IBrowserAutomation {
  // 게시판 선택
  selectBoard(boardName: string): Promise<boolean>;
  
  // 게시판 목록 가져오기
  getBoardList(): Promise<string[]>;
  
  // 태그 입력
  addTags(tags: string[]): Promise<boolean>;
  
  // 이미지 업로드
  uploadImage(imagePath: string): Promise<string>;
}

// Playwright 명령 결과 타입
export interface PlaywrightResult {
  success: boolean;
  result?: any;
  error?: string;
}

// 2단계 인증 관련 타입
export interface TwoFactorAuthInfo {
  detected: boolean;
  method: 'app' | 'sms' | 'email';
  remainingTime: number;
}