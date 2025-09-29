import { BaseLLMClient } from './clients/base-client';
import { OpenAIClient } from './clients/openai-client';
import { ClaudeClient } from './clients/claude-client';
import { GeminiClient } from './clients/gemini-client';
import { RunwareClient } from './clients/runware-client';
import { LLMConfig } from './types/llm.types';

export class LLMClientFactory {
  private static writingClient: BaseLLMClient | null = null;
  private static imageClient: BaseLLMClient | null = null;

  static createClient(config: LLMConfig): BaseLLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'claude':
        return new ClaudeClient(config);
      case 'gemini':
        return new GeminiClient(config);
      case 'runware':
        return new RunwareClient(config);
      default:
        throw new Error(`지원되지 않는 LLM 공급업체: ${config.provider}`);
    }
  }

  static setWritingClient(config: LLMConfig): void {
    this.writingClient = this.createClient(config);
  }

  static setImageClient(config: LLMConfig): void {
    this.imageClient = this.createClient(config);
  }

  static getWritingClient(): BaseLLMClient {
    if (!this.writingClient) {
      throw new Error('Writing LLM client not configured');
    }
    return this.writingClient;
  }

  static getImageClient(): BaseLLMClient {
    if (!this.imageClient) {
      throw new Error('Image LLM client not configured');
    }
    return this.imageClient;
  }

  static hasWritingClient(): boolean {
    return this.writingClient !== null;
  }

  static hasImageClient(): boolean {
    return this.imageClient !== null;
  }
}