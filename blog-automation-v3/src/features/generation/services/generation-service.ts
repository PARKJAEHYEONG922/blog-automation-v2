/**
 * Step2 Generation 관련 비즈니스 로직
 */

import { BlogWritingService } from '@/shared/services/content/blog-writing-service';

export interface AIModelStatus {
  writing: string;
  image: string;
}

class GenerationServiceClass {

  /**
   * AI 모델 상태 로드
   */
  async loadModelStatus(): Promise<AIModelStatus> {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings) {
        const { writing, image } = llmSettings.appliedSettings;
        return {
          writing: writing?.provider && writing?.model ? `${writing.provider} ${writing.model}` : '미설정',
          image: image?.provider && image?.model ? `${image.provider} ${image.model}` : '미설정'
        };
      }
    } catch (error) {
      console.error('모델 상태 로드 실패:', error);
    }

    return {
      writing: '미설정',
      image: '미설정'
    };
  }

  /**
   * 이미지 AI 설정 정보 가져오기
   */
  async getImageAIInfo(): Promise<string> {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings?.image) {
        const { provider, model } = llmSettings.appliedSettings.image;
        if (provider && model) {
          return `✅ ${provider} ${model}`;
        }
      }
    } catch (error) {
      console.error('이미지 AI 정보 로드 실패:', error);
    }

    return '❌ 미설정';
  }

  /**
   * Claude에서 수정된 콘텐츠 다운로드
   */
  async downloadContentFromClaude(): Promise<string> {
    const newContent = await window.electronAPI.downloadFromClaude();

    if (!newContent) {
      throw new Error('Claude에서 콘텐츠를 다운로드할 수 없습니다. 브라우저가 열려있는지 확인해주세요.');
    }

    return newContent;
  }

  /**
   * 이미지 프롬프트 재생성
   */
  async regenerateImagePrompts(content: string): Promise<string[]> {
    return await BlogWritingService.generateImagePrompts(content);
  }
}

// 싱글톤 인스턴스 export
export const GenerationService = new GenerationServiceClass();
