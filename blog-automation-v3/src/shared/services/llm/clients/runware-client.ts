import { BaseLLMClient } from './base-client';
import { LLMMessage, LLMResponse, LLMTool, ImageGenerationOptions } from '../types/llm.types';

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

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
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