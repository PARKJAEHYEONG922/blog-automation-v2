import { BaseLLMClient } from './base-client';
import { LLMMessage, LLMResponse, LLMTool, ImageGenerationOptions } from '../types/llm.types';

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

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
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