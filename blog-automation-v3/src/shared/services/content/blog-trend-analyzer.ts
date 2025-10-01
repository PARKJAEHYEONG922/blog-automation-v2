import { BlogCrawler, BlogContent } from './blog-crawler';
import { LLMClientFactory } from '../llm/llm-factory';

export interface TrendAnalysisResult {
  mainKeyword: string;
  recommendedTitles: string[];
  subKeywords: string[];
  contentDirection: string;
  analyzedBlogs: {
    title: string;
    url: string;
    contentLength: number;
  }[];
  // 제목 재생성용 데이터
  crawledContents?: BlogContent[];
  allTitles?: string[];
}

export interface TrendAnalysisProgress {
  stage: 'crawling' | 'analyzing' | 'complete';
  current: number;
  total: number;
  message: string;
}

export class BlogTrendAnalyzer {

  /**
   * 선택된 블로그 글들을 분석하여 제목, 키워드, 방향성 추천
   * @param urls 분석할 블로그 URL 배열 (최대 3개)
   * @param titles 블로그 제목 배열
   * @param mainKeyword 메인 키워드
   * @param progressCallback 진행 상황 콜백
   */
  static async analyzeTrendBlogs(
    urls: string[],
    titles: string[],
    mainKeyword: string,
    progressCallback?: (progress: TrendAnalysisProgress) => void,
    allTitles?: string[]  // 전체 20개 제목 리스트
  ): Promise<TrendAnalysisResult> {

    // 최대 3개로 제한 (크롤링용)
    const limitedUrls = urls.slice(0, 3);
    const limitedTitles = titles.slice(0, 3);

    try {
      // 1단계: 블로그 크롤링
      progressCallback?.({
        stage: 'crawling',
        current: 0,
        total: limitedUrls.length,
        message: '선택한 블로그 글 크롤링 중...'
      });

      const crawler = new BlogCrawler((crawlProgress) => {
        progressCallback?.({
          stage: 'crawling',
          current: crawlProgress.current,
          total: crawlProgress.total,
          message: `${crawlProgress.current}/${crawlProgress.total} 크롤링 중...`
        });
      });

      // URL과 제목을 SelectedBlogTitle 형식으로 변환
      const selectedBlogs = limitedUrls.map((url, index) => ({
        title: limitedTitles[index] || `블로그 ${index + 1}`,
        url: url,
        relevanceReason: ''
      }));

      const crawledContents = await crawler.crawlSelectedBlogs(selectedBlogs, limitedUrls.length);

      console.log('📊 크롤링 결과:', crawledContents.map(c => ({
        url: c.url,
        title: c.title,
        success: c.success,
        contentLength: c.contentLength,
        error: c.error
      })));

      // 크롤링 성공한 것만 필터링
      const successfulContents = crawledContents.filter(c => c.success && c.textContent.length > 100);

      console.log(`✅ 성공: ${successfulContents.length}개, ❌ 실패: ${crawledContents.length - successfulContents.length}개`);

      if (successfulContents.length === 0) {
        const errors = crawledContents.map(c => c.error).filter(Boolean).join(', ');
        throw new Error(`크롤링에 실패했습니다: ${errors || '알 수 없는 오류'}`);
      }

      // 2단계: LLM 분석
      progressCallback?.({
        stage: 'analyzing',
        current: 0,
        total: 1,
        message: 'AI로 제목 및 키워드 생성 중...'
      });

      const analysisResult = await this.generateRecommendations(
        successfulContents,
        mainKeyword,
        allTitles || limitedTitles  // 전체 제목 리스트 전달
      );

      // 3단계: 완료
      progressCallback?.({
        stage: 'complete',
        current: 1,
        total: 1,
        message: '분석 완료!'
      });

      return {
        mainKeyword,
        recommendedTitles: analysisResult.titles,
        subKeywords: analysisResult.subKeywords,
        contentDirection: analysisResult.direction,
        analyzedBlogs: successfulContents.map(c => ({
          title: c.title,
          url: c.url,
          contentLength: c.contentLength
        })),
        // 제목 재생성을 위한 데이터 포함
        crawledContents: successfulContents,
        allTitles: allTitles || limitedTitles
      };

    } catch (error) {
      console.error('트렌드 분석 실패:', error);
      throw error;
    }
  }

  /**
   * LLM을 사용하여 제목, 키워드, 방향성 추천
   */
  private static async generateRecommendations(
    contents: BlogContent[],
    mainKeyword: string,
    allTitles: string[]  // 전체 제목 리스트 추가
  ): Promise<{
    titles: string[];
    subKeywords: string[];
    direction: string;
  }> {

    // 크롤링한 글들의 정보 요약
    const blogsInfo = contents.map((content, index) => {
      // 본문이 너무 길면 앞부분만 사용 (토큰 절약)
      const truncatedContent = content.textContent.length > 3000
        ? content.textContent.substring(0, 3000) + '...'
        : content.textContent;

      return `
[블로그 ${index + 1}]
제목: ${content.title}
본문 (${content.contentLength}자):
${truncatedContent}
`;
    }).join('\n\n---\n\n');

    // 전체 제목 리스트 (최대 20개)
    const allTitlesList = allTitles.slice(0, 20).map((title, i) => `${i + 1}. ${title}`).join('\n');

    // LLM 프롬프트 생성
    const prompt = `당신은 블로그 콘텐츠 전략 전문가입니다.

아래는 "${mainKeyword}" 키워드로 검색했을 때 상위에 랭크된 인기 블로그 글들입니다.

## 상위 랭크 제목들 (참고용):
${allTitlesList}

## 상세 분석 글들:
${blogsInfo}

---

위 인기 블로그 글들을 분석하여 다음을 제공해주세요:

1. **새로운 제목 추천 (10개)**
   - 위 글들과는 다른 새로운 관점이나 각도에서 접근
   - 독자의 관심을 끌 수 있는 매력적인 제목
   - SEO에 최적화된 제목
   - "${mainKeyword}" 키워드가 자연스럽게 포함된 제목

2. **보조 키워드 추천**
   - 위 글들에서 자주 언급되는 관련 키워드들
   - "${mainKeyword}"와 함께 사용하면 좋은 키워드들
   - 없으면 생략 가능

3. **블로그 글 방향성 제안**
   - 위 인기 글들의 공통 패턴 분석
   - 독자들이 궁금해하는 포인트
   - 차별화할 수 있는 접근 방법 제안
   - 2-3문장으로 간결하게

**반드시 아래 JSON 형식으로만 응답해주세요:**

\`\`\`json
{
  "titles": [
    "제목1",
    "제목2",
    "제목3",
    "제목4",
    "제목5",
    "제목6",
    "제목7",
    "제목8",
    "제목9",
    "제목10"
  ],
  "subKeywords": ["키워드1", "키워드2", "키워드3", ...],
  "direction": "글 방향성 설명..."
}
\`\`\``;

    try {
      // LLM 설정 가져오기 (글쓰기 AI 사용)
      const settingsData = await window.electronAPI.getLLMSettings();

      if (!settingsData?.appliedSettings?.writing?.provider) {
        throw new Error('글쓰기 AI가 설정되지 않았습니다. 설정에서 LLM을 구성해주세요.');
      }

      const writingLLM = settingsData.appliedSettings.writing;

      // LLM 클라이언트 생성
      const client = LLMClientFactory.createClient({
        provider: writingLLM.provider,
        apiKey: writingLLM.apiKey,
        model: writingLLM.model
      });

      // LLM 호출
      const llmResponse = await client.generateText([
        { role: 'user', content: prompt }
      ]);

      const response = llmResponse.content;

      // JSON 파싱
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('LLM 응답 형식이 올바르지 않습니다.');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      return {
        titles: parsed.titles || [],
        subKeywords: parsed.subKeywords || [],
        direction: parsed.direction || ''
      };

    } catch (error) {
      console.error('LLM 분석 실패:', error);
      throw new Error('AI 분석에 실패했습니다: ' + (error as Error).message);
    }
  }

  /**
   * 제목만 재생성 (크롤링 데이터 재사용)
   */
  static async regenerateTitlesOnly(
    contents: BlogContent[],
    mainKeyword: string,
    allTitles: string[]
  ): Promise<string[]> {
    try {
      // 크롤링한 글들의 정보 요약
      const blogsInfo = contents.map((content, index) => {
        const truncatedContent = content.textContent.length > 3000
          ? content.textContent.substring(0, 3000) + '...'
          : content.textContent;

        return `
[블로그 ${index + 1}]
제목: ${content.title}
본문 (${content.contentLength}자):
${truncatedContent}
`;
      }).join('\n\n---\n\n');

      const allTitlesList = allTitles.slice(0, 20).map((title, i) => `${i + 1}. ${title}`).join('\n');

      // 제목만 생성하는 프롬프트
      const prompt = `당신은 블로그 콘텐츠 전략 전문가입니다.

아래는 "${mainKeyword}" 키워드로 검색했을 때 상위에 랭크된 인기 블로그 글들입니다.

## 상위 랭크 제목들 (참고용):
${allTitlesList}

## 상세 분석 글들:
${blogsInfo}

---

위 인기 블로그 글들을 분석하여 **새로운 제목 10개**를 추천해주세요:

- 위 글들과는 다른 새로운 관점이나 각도에서 접근
- 독자의 관심을 끌 수 있는 매력적인 제목
- SEO에 최적화된 제목
- "${mainKeyword}" 키워드가 자연스럽게 포함된 제목

**반드시 아래 JSON 형식으로만 응답해주세요:**

\`\`\`json
{
  "titles": [
    "제목1",
    "제목2",
    "제목3",
    "제목4",
    "제목5",
    "제목6",
    "제목7",
    "제목8",
    "제목9",
    "제목10"
  ]
}
\`\`\``;

      // LLM 설정 가져오기
      const settingsData = await window.electronAPI.getLLMSettings();

      if (!settingsData?.appliedSettings?.writing?.provider) {
        throw new Error('글쓰기 AI가 설정되지 않았습니다.');
      }

      const writingLLM = settingsData.appliedSettings.writing;

      // LLM 클라이언트 생성
      const client = LLMClientFactory.createClient({
        provider: writingLLM.provider,
        apiKey: writingLLM.apiKey,
        model: writingLLM.model
      });

      // LLM 호출
      const llmResponse = await client.generateText([
        { role: 'user', content: prompt }
      ]);

      const response = llmResponse.content;

      // JSON 파싱
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('LLM 응답 형식이 올바르지 않습니다.');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      return parsed.titles || [];

    } catch (error) {
      console.error('제목 재생성 실패:', error);
      throw new Error('제목 재생성에 실패했습니다: ' + (error as Error).message);
    }
  }
}