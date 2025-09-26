// LLM 클라이언트 팩토리
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini' | 'runware';
  model: string;
  apiKey: string;
  style?: string;
}

export interface LLMResponse {
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

export abstract class BaseLLMClient {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse>;
  abstract generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string>; // 이미지 URL 반환
}

export class OpenAIClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 OpenAI ${this.config.model} 텍스트 생성 시작 (${attempt}/${maxRetries})`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ OpenAI 응답 수신 완료`);
        
        return {
          content: data.choices[0]?.message?.content || '',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
          }
        };
        
      } catch (error) {
        console.error(`OpenAI API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('OpenAI 텍스트 생성에 실패했습니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 OpenAI gpt-image-1 이미지 생성 시작 (${attempt}/${maxRetries})`);
        
        // OpenAI는 제한된 해상도만 지원
        const requestSize = options?.size || '1024x1024';
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: prompt,
            size: requestSize, // '1024x1024', '1024x1536', '1536x1024' 중 선택
            n: 1
            // gpt-image-1은 항상 base64로 반환하므로 response_format 불필요
            // quality 파라미터도 gpt-image-1에서는 지원하지 않음
          })
        });

        console.log(`📊 OpenAI 응답 상태: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`OpenAI Image API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ OpenAI 응답 수신 완료`);
        
        // gpt-image-1은 base64 형태로 반환
        const base64Image = data.data?.[0]?.b64_json;
        if (base64Image) {
          return `data:image/png;base64,${base64Image}`;
        } else {
          console.error('OpenAI 응답 구조:', JSON.stringify(data, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error('OpenAI에서 이미지 데이터를 받지 못했습니다.');
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`OpenAI Image API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('OpenAI 이미지 생성에 실패했습니다.');
  }
}

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

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    throw new Error('Claude는 이미지 생성을 지원하지 않습니다.');
  }
}

export class GeminiClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini ${this.config.model} 텍스트 생성 시작 (${attempt}/${maxRetries})`);
        
        // 메시지를 Gemini 형식으로 변환
        let textContent = '';
        for (const message of messages) {
          if (message.role === 'system') {
            textContent += `System: ${message.content}\n\n`;
          } else if (message.role === 'user') {
            textContent += `User: ${message.content}`;
          }
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: textContent
                }]
              }],
              generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ Gemini 응답 수신 완료`);
        
        return {
          content: data.candidates[0]?.content?.parts[0]?.text || '',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
          }
        };
        
      } catch (error) {
        console.error(`Gemini API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Gemini 텍스트 생성에 실패했습니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini 2.5 Flash Image 이미지 생성 시작 (${attempt}/${maxRetries})`);
        
        // Gemini 2.5 Flash Image Preview 모델 사용 (2025년 8월 출시)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt // 직접 프롬프트 사용 (Create an image: 접두어 불필요)
                }]
              }]
            })
          }
        );

        console.log(`📊 Gemini 응답 상태: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`Gemini Image API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ Gemini 응답 수신 완료`);
        
        // Gemini 2.5 Flash Image의 실제 응답 구조에 따른 이미지 데이터 추출
        const parts = data.candidates?.[0]?.content?.parts;
        let imageData = null;
        
        if (parts && Array.isArray(parts)) {
          // parts 배열에서 inlineData가 있는 요소 찾기
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              break;
            }
          }
        }
        
        if (imageData) {
          console.log('✅ Gemini 이미지 데이터 추출 성공');
          // Base64 데이터를 data URL로 변환
          return `data:image/png;base64,${imageData}`;
        } else {
          console.error('Gemini 응답 구조:', JSON.stringify(data, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error('Gemini에서 이미지 데이터를 추출할 수 없습니다.');
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`Gemini Image API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Gemini 이미지 생성에 실패했습니다.');
  }
}

export class RunwareClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    throw new Error('Runware는 텍스트 생성을 지원하지 않습니다. 이미지 생성 전용입니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    // Runware 구현은 복잡하므로 일단 에러 처리
    throw new Error('Runware 이미지 생성은 아직 구현되지 않았습니다.');
  }
}

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