// 공통 타입 정의

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
  imagePrompts?: any[];
  imagePromptGenerationFailed?: boolean;
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