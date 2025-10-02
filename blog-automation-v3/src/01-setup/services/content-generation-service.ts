/**
 * Step1 콘텐츠 생성 관련 비즈니스 로직
 */

import { BlogPromptService } from '@/shared/services/content/blog-prompt-service';
import { SavedDocument } from '@/shared/services/storage/storage-service';

export interface ContentGenerationParams {
  finalTitle: string;
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument;
}

export interface ImagePromptGenerationResult {
  imagePrompts: string[];
  expectedImageCount: number;
  generatedImageCount: number;
  failed: boolean;
}

class ContentGenerationServiceClass {

  /**
   * 필수 입력값 검증
   */
  validateInputs(params: {
    finalTitle: string;
    mainKeyword: string;
    selectedSeoGuide: SavedDocument | null;
  }): { valid: boolean; error?: string } {

    if (!params.finalTitle) {
      return { valid: false, error: '제목을 선택하거나 입력해주세요!' };
    }

    if (!params.mainKeyword.trim()) {
      return { valid: false, error: '메인키워드를 입력해주세요!' };
    }

    if (!params.selectedSeoGuide) {
      return { valid: false, error: 'SEO 가이드를 선택해주세요!' };
    }

    return { valid: true };
  }

  /**
   * 커스텀 제목 입력값 가져오기
   */
  getCustomTitleInput(): string {
    const customTitleInputs = document.querySelectorAll('input[placeholder*="사용하고 싶은 제목"]') as NodeListOf<HTMLInputElement>;

    for (const input of customTitleInputs) {
      if (input.value && input.value.trim()) {
        return input.value.trim();
      }
    }

    return '';
  }

  /**
   * 최종 제목 결정 (우선순위: 커스텀 입력 > AI 선택 제목)
   */
  determineFinalTitle(customTitle: string, selectedTitle: string): string {
    return customTitle || (selectedTitle !== '__CUSTOM__' ? selectedTitle : '');
  }

  /**
   * Claude Web으로 콘텐츠 생성
   */
  async generateWithClaudeWeb(params: ContentGenerationParams, onStepChange: (step: string) => void): Promise<string> {
    const { finalTitle, mainKeyword, subKeywords, blogContent, selectedWritingStyles, selectedSeoGuide } = params;

    onStepChange('클로드 웹 브라우저 열기...');
    await window.electronAPI.openClaudeWeb();

    onStepChange('문서 업로드 중...');

    // 서비스에서 Claude Web용 통합 프롬프트 생성
    const detailedInstructions = BlogPromptService.getClaudeWebPrompt({
      selectedTitle: finalTitle,
      mainKeyword,
      subKeywords,
      blogContent,
      writingStyleCount: selectedWritingStyles.length,
      hasSeoGuide: !!selectedSeoGuide
    });

    await window.electronAPI.sendToClaudeWeb(
      selectedWritingStyles.map(doc => doc.filePath),
      selectedSeoGuide?.filePath || '',
      detailedInstructions
    );

    onStepChange('AI 응답 생성 중...');
    await window.electronAPI.waitForClaudeResponse();

    onStepChange('마크다운 다운로드 중...');

    if (!window.electronAPI?.downloadFromClaude) {
      throw new Error('Claude 다운로드 API를 사용할 수 없습니다.');
    }

    const content = await window.electronAPI.downloadFromClaude();

    if (!content) {
      throw new Error('Claude에서 콘텐츠를 다운로드할 수 없습니다.');
    }

    onStepChange('완료!');
    return content;
  }

  /**
   * 이미지 프롬프트 생성
   */
  async generateImagePrompts(content: string, onStepChange: (step: string) => void): Promise<ImagePromptGenerationResult> {
    onStepChange('이미지 프롬프트 생성 중...');

    let imagePrompts: string[] = [];

    try {
      // 동적 import로 BlogWritingService 불러오기
      const { BlogWritingService } = await import('@/shared/services/content/blog-writing-service');
      const result = await BlogWritingService.generateImagePrompts(content);
      imagePrompts = result.imagePrompts || [];  // 객체에서 imagePrompts 배열만 추출
    } catch (error) {
      console.error('이미지 프롬프트 생성 실패:', error);
      imagePrompts = [];
    }

    // 이미지 프롬프트 생성 실패 여부 확인
    const hasImageTags = content.match(/\(이미지\)|\[이미지\]/g);
    const expectedImageCount = hasImageTags ? hasImageTags.length : 0;
    const generatedImageCount = imagePrompts ? imagePrompts.length : 0;

    return {
      imagePrompts,
      expectedImageCount,
      generatedImageCount,
      failed: expectedImageCount > 0 && generatedImageCount === 0
    };
  }

  /**
   * 수동 업로드 콘텐츠에서 제목 추출
   */
  extractTitleFromContent(content: string): string {
    // 첫 번째 #으로 시작하는 줄 추출
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    // 제목이 없으면 '직접 업로드 글'
    return '직접 업로드 글';
  }
}

// 싱글톤 인스턴스 export
export const ContentGenerationService = new ContentGenerationServiceClass();
