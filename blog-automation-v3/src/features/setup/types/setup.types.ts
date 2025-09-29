// Setup 기능 관련 타입 정의

export interface SetupData {
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
}

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