// LLM 관련 타입 정의

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini' | 'runware';
  model: string;
  apiKey: string;
  style?: string;
}

export interface LLMResponse {
  match(arg0: RegExp): unknown;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: any;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxIterations?: number;
}

export interface ImageGenerationOptions {
  quality?: 'low' | 'medium' | 'high';
  size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' | '1920x1080';
  style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist';
}