// Generation 기능 관련 타입 정의

export interface GenerationProps {
  content: string;
  setupData: any; // SetupData 타입 참조
  onReset: () => void;
  onGoBack: () => void;
  aiModelStatus: {
    writing: string;
    image: string;
  };
}

export interface ImagePrompt {
  id: string;
  prompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface ContentState {
  originalContent: string;
  editedContent: string;
  isEdited: boolean;
}

export interface ImageGenerationOptions {
  quality: 'low' | 'medium' | 'high';
  size: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024';
  style: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist';
}

export interface WorkSummaryData {
  totalWords: number;
  mainKeywordCount: number;
  subKeywordCount: number;
  imageCount: number;
  estimatedReadTime: number;
}