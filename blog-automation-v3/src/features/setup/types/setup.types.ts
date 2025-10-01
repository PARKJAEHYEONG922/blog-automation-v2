// Setup 기능 관련 타입 정의

import type { WorkflowData } from '@/shared/types/common.types';

/**
 * SetupData는 WorkflowData의 Setup 단계 필수 필드만 포함
 * @deprecated WorkflowData를 직접 사용하세요
 */
export type SetupData = Pick<
  WorkflowData,
  | 'writingStylePaths'
  | 'seoGuidePath'
  | 'topic'
  | 'selectedTitle'
  | 'mainKeyword'
  | 'subKeywords'
  | 'blogContent'
  | 'generatedContent'
  | 'isAIGenerated'
  | 'generatedTitles'
  | 'imagePrompts'
  | 'imagePromptGenerationFailed'
>;

export interface DocumentData {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

export interface TitleGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface TitleGenerationResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface DeleteDialogState {
  isOpen: boolean;
  docId: string;
  docName: string;
  type: 'writingStyle' | 'seoGuide';
}
