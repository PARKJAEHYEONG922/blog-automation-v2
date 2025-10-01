// 발행 관련 타입 정의

// 공통 타입을 재사용
export type { WorkflowData, ImageUrls } from '@/shared/types/common.types';

// 발행 상태 타입
export interface PublishStatus {
  isPublishing: boolean;
  isLoggedIn: boolean;
  error: string;
  success: boolean;
}

// 발행 결과 타입 (UI용 - 상세 정보 포함)
export interface PublishingResult {
  success: boolean;
  message: string;
  url?: string; // 발행된 글의 URL
  selectedBoard?: string; // 선택된 게시판명
}

// 플랫폼별 발행 컴포넌트 Props
export interface PublishComponentProps {
  data: import('@/shared/types/common.types').WorkflowData;
  editedContent: string;
  imageUrls: import('@/shared/types/common.types').ImageUrls;
  onComplete: (data: Partial<import('@/shared/types/common.types').WorkflowData>) => void;
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
