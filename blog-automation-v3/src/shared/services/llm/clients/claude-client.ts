import { BaseLLMClient } from './base-client';
import { LLMMessage, LLMResponse, LLMTool, ImageGenerationOptions } from '../types/llm.types';

export class ClaudeClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟣 Claude ${this.config.model} 텍스트 생성 시작 (${attempt}/${maxRetries})`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: 2000,
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'user' : msg.role,
              content: msg.role === 'system' ? `System: ${msg.content}` : msg.content
            }))
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Claude 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`Claude API 오류: ${response.status} ${response.statusText}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ Claude 응답 수신 완료`);
        
        return {
          content: data.content[0]?.text || '',
          usage: {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
          }
        };
        
      } catch (error) {
        console.error(`Claude API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Claude 텍스트 생성에 실패했습니다.');
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    throw new Error('Claude는 이미지 생성을 지원하지 않습니다.');
  }
}