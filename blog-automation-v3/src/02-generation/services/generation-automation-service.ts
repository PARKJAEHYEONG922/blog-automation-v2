/**
 * Step2 자동화 서비스
 * Playwright 기반 네이버 블로그 자동화 로직
 */

import '@/shared/types/electron.types';

export class GenerationAutomationService {
  /**
   * 이미지 생성 (LLM API 호출)
   */
  static async generateImage(prompt: string): Promise<string> {
    try {
      const imageUrl = await window.electronAPI.generateImage(prompt);
      return imageUrl;
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 여러 이미지 일괄 생성
   */
  static async generateImages(
    prompts: Array<{ prompt: string }>,
    onProgress?: (index: number, total: number) => void
  ): Promise<{ [key: string]: string }> {
    const generatedImages: { [key: string]: string } = {};

    for (let i = 0; i < prompts.length; i++) {
      const imagePrompt = prompts[i];
      const imageKey = `이미지${i + 1}`;

      console.log(`🖼️ 이미지 ${i + 1} 생성 중... 프롬프트: ${imagePrompt.prompt.substring(0, 50)}...`);

      try {
        const imageUrl = await this.generateImage(imagePrompt.prompt);
        generatedImages[imageKey] = imageUrl;
        console.log(`✅ 이미지 ${i + 1} 생성 완료`);

        if (onProgress) {
          onProgress(i + 1, prompts.length);
        }
      } catch (error) {
        console.error(`❌ 이미지 ${i + 1} 생성 실패:`, error);
        throw error;
      }
    }

    return generatedImages;
  }

  /**
   * Claude Web에서 수정된 콘텐츠 다운로드
   */
  static async downloadFromClaude(): Promise<string> {
    try {
      console.log('🔄 Claude Web에서 콘텐츠 다운로드 중...');
      const content = await window.electronAPI.downloadFromClaude();
      console.log('✅ Claude Web 콘텐츠 다운로드 완료');
      return content;
    } catch (error) {
      console.error('❌ Claude Web 다운로드 실패:', error);
      throw error;
    }
  }

  /**
   * 네이버 블로그에 발행
   */
  static publishToNaverBlog(htmlContent: string): void {
    try {
      console.log('📤 네이버 블로그 발행 시작...');
      window.electronAPI.publishToBlog(htmlContent);
      console.log('✅ 네이버 블로그 발행 요청 완료');
    } catch (error) {
      console.error('❌ 네이버 블로그 발행 실패:', error);
      throw error;
    }
  }

  /**
   * LLM 설정 가져오기
   */
  static async getLLMSettings(): Promise<any> {
    try {
      const settings = await window.electronAPI?.getLLMSettings?.();
      return settings;
    } catch (error) {
      console.error('LLM 설정 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * LLM 설정 저장하기
   */
  static async saveLLMSettings(settings: any): Promise<void> {
    try {
      await window.electronAPI?.saveLLMSettings?.(settings);
      console.log('LLM 설정 저장 완료');
    } catch (error) {
      console.error('LLM 설정 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 이미지 설정만 업데이트 (기존 설정 유지)
   */
  static async updateImageSettings(settingType: 'style' | 'quality' | 'size', value: string): Promise<void> {
    try {
      const currentSettings = await this.getLLMSettings();
      if (currentSettings?.appliedSettings?.image) {
        const updatedSettings = {
          ...currentSettings,
          appliedSettings: {
            ...currentSettings.appliedSettings,
            image: {
              ...currentSettings.appliedSettings.image,
              [settingType]: value
            }
          }
        };

        await this.saveLLMSettings(updatedSettings);
        console.log(`이미지 ${settingType} 설정 저장됨:`, value);
      }
    } catch (error) {
      console.error('이미지 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 이미지 설정 불러오기 (style, quality, size)
   */
  static async getImageSettings(): Promise<{ style?: string; quality?: string; size?: string } | null> {
    try {
      const llmSettings = await this.getLLMSettings();
      if (llmSettings?.appliedSettings?.image) {
        return llmSettings.appliedSettings.image;
      }
      return null;
    } catch (error) {
      console.error('이미지 설정 불러오기 실패:', error);
      return null;
    }
  }
}
