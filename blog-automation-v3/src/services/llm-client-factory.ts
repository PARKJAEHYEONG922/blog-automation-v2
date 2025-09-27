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
  abstract generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' | '1920x1080'; style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist' }): Promise<string>; // 이미지 URL 반환
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

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024'; style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 OpenAI ${this.config.model} 이미지 생성 시작 (${attempt}/${maxRetries})`);

        // 모델별 지원 해상도 매핑
        let requestSize: string;

        if (this.config.model === 'gpt-image-1') {
          // gpt-image-1은 특정 크기만 지원
          const gptImageSizeMapping: {[key: string]: string} = {
            '1024x1024': '1024x1024',
            '1024x1536': '1024x1536',
            '1536x1024': '1536x1024',
            '512x768': '1024x1024', // 지원 크기로 매핑
            '768x512': '1024x1024'
          };
          requestSize = gptImageSizeMapping[options?.size || '1024x1024'] || '1024x1024';
        } else {
          // DALL-E 3 모델
          const dalle3SizeMapping: {[key: string]: string} = {
            '1024x1024': '1024x1024',
            '1024x1536': '1024x1792',
            '1536x1024': '1792x1024',
            '512x768': '1024x1024',
            '768x512': '1024x1024'
          };
          requestSize = dalle3SizeMapping[options?.size || '1024x1024'] || '1024x1024';
        }

        const requestBody: any = {
          model: this.config.model,
          prompt: prompt,
          size: requestSize,
          n: 1
        };

        if (this.config.model === 'gpt-image-1') {
          // gpt-image-1 파라미터 설정
          const qualityMapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high'
          };
          requestBody.quality = qualityMapping[options?.quality as keyof typeof qualityMapping] || 'high';
          requestBody.response_format = 'url'; // gpt-image-1은 URL 반환
        } else if (this.config.model === 'dall-e-3') {
          // DALL-E 3 파라미터 설정
          requestBody.quality = options?.quality === 'low' ? 'standard' : 'hd';
          requestBody.style = 'vivid';
          requestBody.response_format = 'url';
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestBody)
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

        if (this.config.model === 'gpt-image-1' || this.config.model === 'dall-e-3') {
          // gpt-image-1과 DALL-E 3는 URL 형태로 반환
          const imageUrl = data.data?.[0]?.url;
          if (imageUrl) {
            return imageUrl;
          }
        }

        console.error('OpenAI 응답 구조:', JSON.stringify(data, null, 2));

        if (attempt === maxRetries) {
          throw new Error('OpenAI에서 이미지 데이터를 받지 못했습니다.');
        }

        // 재시도 전 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
        
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

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024'; style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist' }): Promise<string> {
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

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' | '1920x1080'; style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist' }): Promise<string> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini 2.5 Flash Image 이미지 생성 시작 (${attempt}/${maxRetries})`);

        // Gemini는 기본적으로 정사각형만 생성하므로 크기 옵션 무시
        let enhancedPrompt = prompt;

        // 스타일 옵션 처리 (Gemini 최적화)
        const style = options?.style || 'photographic';
        if (style === 'photographic') {
          enhancedPrompt += ', studio-lit photography, high-resolution commercial photography, professional quality';
        } else if (style === 'minimalist') {
          enhancedPrompt += ', minimalist design, clean composition, negative space';
        } else if (style === 'kawaii') {
          enhancedPrompt += ', kawaii style, cute and colorful, soft pastel colors';
        } else if (style === 'artistic') {
          enhancedPrompt += ', artistic illustration, detailed brushwork, creative composition';
        } else if (style === 'impressionist') {
          enhancedPrompt += ', impressionist style, Van Gogh inspired, painterly brushstrokes';
        }

        console.log(`🎨 스타일: ${style}, 향상된 프롬프트: "${enhancedPrompt}"`);

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
                  text: enhancedPrompt // 비율 정보가 추가된 프롬프트 사용
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

// Runware 스타일별 실제 모델 매핑
const runwareStyleModels = {
  'sdxl-base': {
    realistic: 'civitai:4201@130072', // Realistic Vision V6.0
    photographic: 'civitai:102438@133677', // SDXL Base (사진 특화)
    illustration: 'civitai:24149@144666', // Mistoon Anime (일러스트)
    anime: 'civitai:24149@144666', // Mistoon Anime
    dreamy: 'civitai:1125067@1250712' // CyberRealistic (몽환적)
  },
  'flux-base': {
    realistic: 'civitai:618692@691639', // FLUX.1 Schnell
    photographic: 'civitai:618692@691639', // FLUX.1 Schnell
    illustration: 'civitai:618692@691639', // FLUX.1 Schnell
    anime: 'civitai:618692@691639', // FLUX.1 Schnell
    dreamy: 'civitai:618692@691639' // FLUX.1 Schnell
  }
};

export class RunwareClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    throw new Error('Runware는 텍스트 생성을 지원하지 않습니다. 이미지 생성 전용입니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024'; style?: 'photographic' | 'minimalist' | 'kawaii' | 'artistic' | 'impressionist' }): Promise<string> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Runware 이미지 생성 시작 (${attempt}/${maxRetries}) - 프롬프트: ${prompt}`);

        // 해상도 옵션을 width, height로 변환
        let width = 1024;
        let height = 1024;

        if (options?.size) {
          const [w, h] = options.size.split('x').map(Number);
          width = w;
          height = h;
        }

        // 품질에 따른 steps 설정 (Runware는 steps로 품질 조절)
        let steps = 20; // 기본값
        if (options?.quality === 'low') steps = 10;
        else if (options?.quality === 'medium') steps = 15;
        else if (options?.quality === 'high') steps = 25;

        // 스타일에 따른 실제 모델 선택 (v2와 동일하게 config에서 가져옴)
        let actualModel = this.config.model;
        console.log(`🔍 Runware 설정 확인:`, {
          configModel: this.config.model,
          configStyle: this.config.style,
          optionsStyle: options?.style,
          availableStyleModels: Object.keys(runwareStyleModels)
        });

        // options 스타일이 있으면 사용, 없으면 config 스타일 사용 (v2와 동일)
        const styleToUse = options?.style || this.config.style;

        if (styleToUse && runwareStyleModels[this.config.model as keyof typeof runwareStyleModels]) {
          const styleModels = runwareStyleModels[this.config.model as keyof typeof runwareStyleModels];
          actualModel = styleModels[styleToUse as keyof typeof styleModels] || this.config.model;
          console.log(`🎨 Runware 스타일 매핑: ${this.config.model} + ${styleToUse} → ${actualModel}`);
        } else {
          console.log(`⚠️ 스타일 매핑 실패 - 기본 모델 사용: ${actualModel}`);
        }

        // UUID 생성 (간단한 방법)
        const taskUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        const response = await fetch('https://api.runware.ai/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify([
            {
              taskType: 'imageInference',
              taskUUID: taskUUID,
              positivePrompt: prompt,
              width: width,
              height: height,
              model: actualModel, // 스타일에 따라 매핑된 실제 모델 사용
              numberResults: 1,
              steps: steps,
              CFGScale: 7,
              seed: Math.floor(Math.random() * 1000000)
            }
          ])
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Runware API 상세 오류 (${attempt}/${maxRetries}):`, errorText);
          console.error(`📝 요청 데이터:`, JSON.stringify({
            taskType: 'imageInference',
            taskUUID: taskUUID,
            positivePrompt: prompt,
            width: width,
            height: height,
            model: actualModel,
            numberResults: 1,
            steps: steps,
            CFGScale: 7,
            seed: Math.floor(Math.random() * 1000000)
          }, null, 2));

          if (attempt === maxRetries) {
            throw new Error(`Runware API 오류: ${response.status} ${response.statusText} - ${errorText}`);
          }

          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();

        // 응답에서 이미지 URL 추출
        if (data.data && data.data[0] && data.data[0].imageURL) {
          console.log(`✅ Runware 이미지 생성 완료: ${data.data[0].imageURL}`);
          return data.data[0].imageURL;
        } else {
          console.error('Runware 응답 구조:', JSON.stringify(data, null, 2));

          if (attempt === maxRetries) {
            throw new Error('Runware에서 이미지 URL을 추출할 수 없습니다.');
          }

          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

      } catch (error) {
        console.error(`Runware API 호출 실패 (${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }

    throw new Error('Runware 이미지 생성에 실패했습니다.');
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