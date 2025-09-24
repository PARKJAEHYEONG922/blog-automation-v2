import { LLMClientFactory, LLMMessage } from './llm-client-factory';
import { CollectedBlogData, CollectedYouTubeData } from './data-collection-engine';
import { BaseRequestInfo } from '../types/common-interfaces';
import { getContentTypeDescription, getReviewTypeDescription } from '../constants/content-options';

export interface BlogSelectionRequest extends Omit<BaseRequestInfo, 'selectedTitle'> {
  targetTitle: string; // selectedTitle 대신 targetTitle 사용
  blogTitles: CollectedBlogData[];
  youtubeTitles?: CollectedYouTubeData[]; // YouTube 데이터 추가
}

export interface SelectedBlogTitle {
  title: string;
  url: string;
  relevanceReason: string;
}

export interface SelectedYouTubeVideo {
  videoId: string; // YouTube videoId
  title: string;
  channelName: string;
  viewCount: number;
  duration: number;
  priority: number;
  relevanceReason: string;
  subscriberCount?: number;
  publishedAt?: string;
  likeCount?: string;
  commentCount?: string;
}

export interface BlogSelectionResult {
  selectedTitles: SelectedBlogTitle[];
  selectedVideos: SelectedYouTubeVideo[]; // YouTube 선별 결과 추가
}

export class BlogTitleSelector {
  async selectTopBlogs(request: BlogSelectionRequest): Promise<BlogSelectionResult> {
    try {
      const hasYouTube = request.youtubeTitles && request.youtubeTitles.length > 0;
      
      if (hasYouTube) {
        console.log('🤖 정보요약 AI로 블로그 + YouTube 통합 선별 시작');
      } else {
        console.log('🤖 정보요약 AI로 상위 10개 블로그 선별 시작');
      }
      
      const informationClient = LLMClientFactory.getInformationClient();
      
      // 통합 프롬프트 사용 (YouTube 유무 자동 대응)
      const userPrompt = this.buildIntegratedPrompt(request);
      
      const messages: LLMMessage[] = [
        { role: 'user', content: userPrompt }
      ];
      
      console.log(`🤖 [LLM 요청] ${hasYouTube ? '블로그+YouTube 통합' : '블로그'} 선별 요청`);
      
      const response = await informationClient.generateText(messages);
      
      console.log(`🤖 [LLM 응답] ${hasYouTube ? '통합' : '블로그'} 선별 결과 받음`);
      
      // JSON 응답 파싱 (통합 파서 사용)
      const result = this.parseIntegratedResult(response.content, request.blogTitles, request.youtubeTitles || []);
      
      console.log(`✅ 블로그 ${result.selectedTitles.length}개${hasYouTube ? `, YouTube ${result.selectedVideos.length}개` : ''} 선별 완료`);
      
      return result;
      
    } catch (error) {
      console.error('블로그 제목 선별 실패:', error);
      
      // 오류 시 순위대로 상위 10개 반환
      const fallbackResult: BlogSelectionResult = {
        selectedTitles: request.blogTitles.slice(0, 10).map((blog) => ({
          title: blog.title,
          url: blog.url,
          relevanceReason: '자동 선별 (AI 분석 실패)'
        })),
        selectedVideos: (request.youtubeTitles || []).slice(0, 10).map((video) => ({
          videoId: video.videoId,
          title: video.title,
          channelName: video.channelName,
          viewCount: video.viewCount,
          duration: video.duration,
          priority: video.priority,
          relevanceReason: '자동 선별 (AI 분석 실패)'
        }))
      };
      
      return fallbackResult;
    }
  }

  private buildIntegratedPrompt(request: BlogSelectionRequest): string {
    // 블로그 제목들 텍스트 구성
    const blogTitlesText = request.blogTitles.map((blog, index) => 
      `${index + 1}. ${blog.title}`
    ).join('\n');
    
    // YouTube 제목들 텍스트 구성 (제목만)
    const youtubeTitlesText = request.youtubeTitles?.map((video, index) => 
      `${index + 1}. ${video.title}`
    ).join('\n') || '';
    
    // 보조키워드 텍스트 준비
    let subKeywordsText = "";
    let subKeywordsCriteria = "";
    if (request.subKeywords && request.subKeywords.length > 0) {
      const subKeywordsStr = request.subKeywords.join(', ');
      subKeywordsText = `**보조 키워드**: ${subKeywordsStr}`;
      subKeywordsCriteria = `6. 보조 키워드(${subKeywordsStr})와 관련성이 있는 콘텐츠`;
    }
    
    // 콘텐츠 유형 설명 구성
    const contentTypeDescription = getContentTypeDescription(request.contentType);
    let contentTypeInfo = `**콘텐츠 유형**: ${request.contentType}`;
    if (contentTypeDescription) {
      contentTypeInfo += ` (${contentTypeDescription})`;
    }
    
    // 후기 유형 정보 구성 (있는 경우)
    let reviewTypeInfo = '';
    if (request.reviewType) {
      const reviewTypeDescription = getReviewTypeDescription(request.reviewType);
      reviewTypeInfo = `\n**후기 유형**: ${request.reviewType}`;
      if (reviewTypeDescription) {
        reviewTypeInfo += ` (${reviewTypeDescription})`;
      }
    }

    const hasYouTubeData = request.youtubeTitles && request.youtubeTitles.length > 0;
    
    return `"${request.targetTitle}" 제목으로 블로그 글을 작성하려고 합니다. 
블로그 글 작성에 도움이 될 만한 ${hasYouTubeData ? '네이버 블로그와 YouTube 영상을' : '네이버 블로그를'} 선별해주세요.

**타겟 제목**: ${request.targetTitle}
**메인 키워드**: ${request.mainKeyword}
${subKeywordsText}
**검색 키워드**: ${request.searchKeyword}
${contentTypeInfo}${reviewTypeInfo}

**선별 목적**: 
- 블로그: 참고할 구조, 정보, 관점을 얻기 위함${hasYouTubeData ? '\n- YouTube: 자막을 추출하여 블로그 본문 작성에 활용할 예정' : ''}

**선별 기준**:
1. 타겟 제목 "${request.targetTitle}"과 가장 주제적 관련성이 높은 콘텐츠 (최우선)
2. 메인 키워드와 직접적으로 연관된 내용
3. ${request.contentType} 유형에 적합한 접근방식의 콘텐츠${request.reviewType ? ` (${request.reviewType} 관점)` : ''}
4. 구체적이고 실용적인 정보를 담고 있을 것으로 예상되는 제목
5. 정보성 콘텐츠 우선 (명백한 상품 판매나 업체 홍보가 아닌 경우 포함)
${subKeywordsCriteria}

**네이버 블로그 제목들**:
${blogTitlesText}
${hasYouTubeData ? `
**YouTube 영상들**:
${youtubeTitlesText}` : ''}

**출력 형식**:
타겟 제목과의 관련도가 가장 높은 순서대로 ${hasYouTubeData ? '블로그 10개, YouTube 10개를' : '블로그 10개를'} JSON 형태로 선별해주세요.

{
  "selected_blogs": [
    {
      "title": "타겟 제목과 가장 관련성 높은 블로그 제목 (1위)",
      "relevance_reason": "타겟 제목과의 관련성 및 선별 이유"
    },
    ...
    {
      "title": "열 번째로 관련성 높은 블로그 제목 (10위)",
      "relevance_reason": "타겟 제목과의 관련성 및 선별 이유"
    }
  ],
  "selected_videos": [${hasYouTubeData ? `
    {
      "title": "타겟 제목과 가장 관련성 높은 YouTube 제목 (1위)",
      "relevance_reason": "자막 추출 시 블로그 작성에 도움될 이유"
    },
    ...
    {
      "title": "열 번째로 관련성 높은 YouTube 제목 (10위)",
      "relevance_reason": "자막 추출 시 블로그 작성에 도움될 이유"
    }` : ''}
  ]
}

반드시 타겟 제목 "${request.targetTitle}"과의 관련도를 기준으로 1위부터 10위까지 순서를 매겨서 반환해주세요.`;
  }

  private parseIntegratedResult(
    content: string, 
    originalBlogs: CollectedBlogData[], 
    originalVideos: CollectedYouTubeData[]
  ): BlogSelectionResult {
    try {
      // JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        
        // 블로그 선별 처리
        let selectedTitles: SelectedBlogTitle[] = [];
        if (jsonData.selected_blogs && Array.isArray(jsonData.selected_blogs)) {
          console.log(`🎯 AI가 선별한 블로그 ${jsonData.selected_blogs.length}개 처리 시작`);
          
          selectedTitles = jsonData.selected_blogs.slice(0, 10).map((item: any, aiIndex: number) => {
            console.log(`\n🔍 [${aiIndex + 1}] AI 선별 블로그: "${item.title}"`);
            
            // 제목으로 원본 블로그 찾기
            let originalBlog = originalBlogs.find(blog => blog.title === item.title);
            
            if (!originalBlog) {
              originalBlog = originalBlogs.find(blog => 
                blog.title.includes(item.title) || item.title.includes(blog.title)
              );
            }
            
            if (!originalBlog && originalBlogs.length > 0) {
              const index = Math.min(originalBlogs.length - 1, aiIndex);
              originalBlog = originalBlogs[index];
            }
            
            const url = originalBlog?.url || '';
            
            return {
              title: item.title,
              url: url,
              relevanceReason: item.relevance_reason || '선별됨'
            };
          }).filter((blog: SelectedBlogTitle) => !!blog.url);
        }

        // YouTube 선별 처리
        let selectedVideos: SelectedYouTubeVideo[] = [];
        if (jsonData.selected_videos && Array.isArray(jsonData.selected_videos)) {
          console.log(`🎯 AI가 선별한 YouTube ${jsonData.selected_videos.length}개 처리 시작`);
          
          selectedVideos = jsonData.selected_videos.slice(0, 10).map((item: any, aiIndex: number) => {
            console.log(`\n📺 [${aiIndex + 1}] AI 선별 YouTube: "${item.title}"`);
            
            // 제목으로 원본 비디오 찾기
            let originalVideo = originalVideos.find(video => video.title === item.title);
            
            if (!originalVideo) {
              originalVideo = originalVideos.find(video => 
                video.title.includes(item.title) || item.title.includes(video.title)
              );
            }
            
            if (!originalVideo && originalVideos.length > 0) {
              const index = Math.min(originalVideos.length - 1, aiIndex);
              originalVideo = originalVideos[index];
            }
            
            if (!originalVideo) {
              console.warn(`⚠️ YouTube 매칭 실패: "${item.title}"`);
              return null;
            }
            
            return {
              videoId: originalVideo.videoId,
              title: item.title,
              channelName: originalVideo.channelName,
              viewCount: originalVideo.viewCount,
              duration: originalVideo.duration,
              priority: originalVideo.priority,
              relevanceReason: item.relevance_reason || '선별됨'
            };
          }).filter((video: SelectedYouTubeVideo | null): video is SelectedYouTubeVideo => video !== null);
        }

        console.log(`✅ 최종 선별 완료: 블로그 ${selectedTitles.length}개, YouTube ${selectedVideos.length}개`);
        
        return { 
          selectedTitles,
          selectedVideos 
        };
      }
    } catch (error) {
      console.warn('통합 선별 결과 JSON 파싱 실패:', error);
    }
    
    // 파싱 실패 시 상위 10개씩 반환
    return {
      selectedTitles: originalBlogs.slice(0, 10).map((blog) => ({
        title: blog.title,
        url: blog.url,
        relevanceReason: '자동 선별 (파싱 실패)'
      })),
      selectedVideos: originalVideos.slice(0, 10).map((video) => ({
        videoId: video.videoId,
        title: video.title,
        channelName: video.channelName,
        viewCount: video.viewCount,
        duration: video.duration,
        priority: video.priority,
        relevanceReason: '자동 선별 (파싱 실패)'
      }))
    };
  }
}