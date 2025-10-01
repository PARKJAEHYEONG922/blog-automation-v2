/**
 * 제목 생성 관련 비즈니스 로직
 */

import { BlogPromptService } from '@/shared/services/content/blog-prompt-service';
import { BlogTrendAnalyzer, TrendAnalysisResult } from '@/01-setup/services/blog-trend-analyzer';
import { handleAPIError } from '@/shared/utils/error-handler';

export interface TitleGenerationParams {
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
}

export interface TrendAnalysisCache {
  contents: any[];
  mainKeyword: string;
  allTitles: string[];
  subKeywords: string[];
  direction: string;
}

class TitleGenerationServiceClass {

  /**
   * API 설정 확인
   */
  async getWritingAPISettings(): Promise<{
    provider: string;
    model: string;
    apiKey: string;
  } | null> {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings?.writing) {
        const { provider, model, apiKey } = llmSettings.appliedSettings.writing;
        if (provider && model && apiKey) {
          return { provider, model, apiKey };
        }
      }
      return null;
    } catch (error) {
      console.error('글쓰기 API 설정 로드 실패:', error);
      return null;
    }
  }

  /**
   * 캐시된 트렌드 데이터로 제목 재생성
   */
  async regenerateTitlesFromCache(cache: TrendAnalysisCache): Promise<string[]> {
    console.log('🔄 트렌드 분석 데이터로 제목 재생성...');

    const newTitles = await BlogTrendAnalyzer.regenerateTitlesOnly(
      cache.contents,
      cache.mainKeyword,
      cache.allTitles
    );

    if (newTitles.length === 0) {
      throw new Error('제목 생성에 실패했습니다.');
    }

    return newTitles;
  }

  /**
   * 제목 추천 생성 (기존 방식)
   */
  async generateTitles(params: TitleGenerationParams): Promise<string[]> {
    const { mainKeyword, subKeywords, blogContent } = params;

    // 서비스에서 프롬프트 생성
    const systemPrompt = BlogPromptService.getTitleGenerationSystemPrompt();
    const userPrompt = BlogPromptService.getTitleGenerationUserPrompt({
      mainKeyword,
      subKeywords,
      blogContent
    });

    // 연결된 글쓰기 API를 통해 제목 생성
    const response = await window.electronAPI.generateTitles({
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
    });

    // API 응답에서 제목 추출
    let titles: string[] = [];

    if (response.success) {
      // titles 배열이 직접 있는 경우 사용
      if (response.titles && Array.isArray(response.titles)) {
        titles = response.titles.slice(0, 10);
      }
      // content 속성에서 파싱이 필요한 경우 (main process에서 content로 반환)
      else if ((response as any).content) {
        titles = this.parseTitlesFromContent((response as any).content);
      }
    } else {
      throw new Error(response.error || '제목 생성 API 호출 실패');
    }

    if (titles.length === 0) {
      throw new Error('제목 생성에 실패했습니다. 다시 시도해주세요.');
    }

    return titles;
  }

  /**
   * API 응답 content에서 제목 파싱
   */
  private parseTitlesFromContent(content: string): string[] {
    let titles: string[] = [];

    try {
      // JSON 형식으로 응답이 올 경우 파싱
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (jsonData.titles && Array.isArray(jsonData.titles)) {
          titles = jsonData.titles.slice(0, 10);
        }
      }
    } catch (error) {
      console.warn('JSON 파싱 실패, 번호 목록으로 처리:', error);
    }

    // fallback: 번호 목록 형태 처리
    if (titles.length === 0) {
      const titleMatches = content.match(/^\d+\.\s*(.+)$/gm);
      if (titleMatches && titleMatches.length > 0) {
        titles = titleMatches
          .map((match: string): string => match.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 10);
      }
    }

    return titles;
  }

  /**
   * 에러 메시지 변환
   */
  getErrorMessage(error: Error): string {
    const errorMessage = error.message;

    if (errorMessage.includes('일시적으로 과부하')) {
      return '🔄 AI 서버가 바쁩니다. 잠시 후 "🔄 재생성" 버튼을 눌러 다시 시도해주세요.';
    } else if (errorMessage.includes('사용량 한도')) {
      return '⏰ API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
    } else if (errorMessage.includes('API 키가 올바르지')) {
      return '🔑 API 키 설정에 문제가 있습니다. 설정 → LLM 설정에서 API 키를 확인해주세요.';
    } else {
      return `제목 생성 중 오류가 발생했습니다.\n\n오류 상세: ${errorMessage}`;
    }
  }
}

// 싱글톤 인스턴스 export
export const TitleGenerationService = new TitleGenerationServiceClass();
