// 발행 관련 타입 정의

// 워크플로우 데이터 타입 (임시 정의)
export interface WorkflowData {
  writingStylePaths: string[];
  seoGuidePath: string;
  topic: string;
  selectedTitle: string;
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
  generatedContent?: string;
  isAIGenerated: boolean;
  generatedTitles: string[];
  imagePrompts: any[];
  imagePromptGenerationFailed: boolean;
  publishedUrl?: string; // 발행된 글의 URL
  publishPlatform?: string; // 발행된 플랫폼
  selectedBoard?: string; // 선택된 게시판
}

// 이미지 URL 타입
export interface ImageUrls {
  [promptId: string]: string;
}

// 발행 상태 타입
export interface PublishStatus {
  isPublishing: boolean;
  isLoggedIn: boolean;
  error: string;
  success: boolean;
}

// 발행 결과 타입
export interface PublishResult {
  success: boolean;
  message: string;
  url?: string; // 발행된 글의 URL
  selectedBoard?: string; // 선택된 게시판명
}

// 플랫폼별 발행 컴포넌트 Props
export interface PublishComponentProps {
  data: WorkflowData;
  editedContent: string;
  imageUrls: ImageUrls;
  onComplete: (data: Partial<WorkflowData>) => void;
  copyToClipboard?: () => Promise<boolean>;
}

// 플랫폼별 발행 컴포넌트가 구현해야 할 인터페이스
export interface IPublishComponent {
  platform: string;
  name: string;
  icon: string;
}

// 네이버 자격 증명 타입
export interface NaverCredentials {
  username: string;
  password: string;
}

// 발행 옵션 타입
export type PublishOption = 'temp' | 'immediate' | 'scheduled';

// 게시판 정보 타입
export interface BoardInfo {
  id: string;
  name: string;
  url?: string;
}

// 저장된 계정 타입
export interface SavedAccount {
  id: string;
  username: string;
  lastUsed: number;
}

