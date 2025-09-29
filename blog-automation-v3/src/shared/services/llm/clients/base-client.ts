import { LLMConfig, LLMMessage, LLMResponse, LLMTool, ImageGenerationOptions } from '../types/llm.types';

export abstract class BaseLLMClient {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse>;
  abstract generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string>; // 이미지 URL 반환
}