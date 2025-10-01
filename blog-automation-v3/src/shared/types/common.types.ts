// 공통 타입 정의

/**
 * 워크플로우 전체 데이터 타입 (Single Source of Truth)
 * - Step1 (Setup): topic, mainKeyword, subKeywords, blogContent 등
 * - Step2 (Generation): generatedContent, imagePrompts 등
 * - Publishing: publishedUrl, publishPlatform, selectedBoard 등
 */
export interface WorkflowData {
  // Step1: 초기 설정
  writingStylePaths: string[];
  seoGuidePath: string;
  topic: string;
  selectedTitle: string;
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;

  // Step2: 콘텐츠 생성
  generatedContent?: string;
  isAIGenerated: boolean;
  generatedTitles: string[];
  imagePrompts?: any[];
  imagePromptGenerationFailed?: boolean;

  // Publishing: 발행 정보
  publishedUrl?: string;
  publishPlatform?: string;
  selectedBoard?: string;
}

export interface AIModelStatus {
  writing: string;
  image: string;
}

export interface ImageUrls {
  [key: string]: string;
}
