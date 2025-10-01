import { BaseLLMClient } from './base-client';
import { LLMMessage, LLMResponse, LLMTool, ImageGenerationOptions } from '../types/llm.types';

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

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini 2.5 Flash Image 이미지 생성 시작 (${attempt}/${maxRetries})`);

        // Gemini는 기본적으로 정사각형만 생성하므로 크기 옵션 무시
        let enhancedPrompt = prompt;

        // 스타일 옵션 처리 (Gemini 2.5 Flash Image 최적화 - 서술형 프롬프트)
        const style = options?.style || 'photographic';
        if (style === 'photographic') {
          // 실사/사진: 전문 스튜디오 촬영 느낌
          enhancedPrompt = `A photorealistic photograph of ${prompt}. Captured with professional studio lighting setup using three-point softbox lighting. High-resolution commercial photography with sharp details and natural colors. Professional quality with perfect exposure and composition.`;
        } else if (style === 'illustration') {
          // 일러스트: 디지털 아트 느낌
          enhancedPrompt = `A professional digital illustration of ${prompt}. Clean and detailed artwork with vibrant colors and smooth shading. Modern illustration style suitable for editorial or blog content. High-quality digital art with polished composition.`;
        } else if (style === 'minimalist') {
          // 미니멀: 깔끔하고 간결한 디자인
          enhancedPrompt = `A minimalist composition featuring ${prompt}. Clean design with simple shapes and negative space. Limited color palette with focus on essential elements. Modern and elegant aesthetic with balanced composition.`;
        } else if (style === 'natural') {
          // 자연스러운: 일상적이고 편안한 느낌
          enhancedPrompt = `A natural and casual scene of ${prompt}. Soft natural lighting with warm and inviting atmosphere. Authentic and relatable composition that feels comfortable and approachable. Real-life everyday aesthetic with genuine feeling.`;
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