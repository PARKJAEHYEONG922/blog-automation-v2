import { SelectedBlogTitle } from './blog-title-selector';

export interface BlogContent {
  url: string;
  title: string;
  textContent: string;
  contentLength: number;
  success: boolean;
  error?: string;
}

export interface CrawlingProgress {
  current: number;
  total: number;
  url: string;
  status: 'crawling' | 'success' | 'failed';
}

export class BlogCrawler {
  private progressCallback?: (progress: CrawlingProgress) => void;

  constructor(progressCallback?: (progress: CrawlingProgress) => void) {
    this.progressCallback = progressCallback;
  }

  async crawlSelectedBlogs(selectedBlogs: SelectedBlogTitle[], targetSuccessCount = 3): Promise<BlogContent[]> {
    const results: BlogContent[] = [];
    let successCount = 0;
    let processedCount = 0;
    
    console.log(`📝 선별된 블로그에서 유효한 콘텐츠 ${targetSuccessCount}개 크롤링 시작 (총 ${selectedBlogs.length}개 중)`);
    
    // 유효한 블로그를 targetSuccessCount개 찾을 때까지 또는 모든 블로그를 확인할 때까지 진행
    for (let i = 0; i < selectedBlogs.length && successCount < targetSuccessCount; i++) {
      const blog = selectedBlogs[i];
      processedCount++;
      
      // 진행률 콜백 호출 (목표 개수 기준으로 계산)
      if (this.progressCallback) {
        this.progressCallback({
          current: Math.min(successCount + 1, targetSuccessCount),
          total: targetSuccessCount,
          url: blog.url,
          status: 'crawling'
        });
      }
      
      try {
        console.log(`🔍 [${processedCount}/${selectedBlogs.length}] 크롤링 시작: ${blog.title} (유효 수집: ${successCount}/${targetSuccessCount})`);
        console.log(`🔗 URL: ${blog.url}`);
        
        const content = await this.crawlBlogContent(blog.url, blog.title);
        console.log(`📊 크롤링 원시 결과 - 제목: "${content.title}", 성공: ${content.success}, 오류: ${content.error || 'none'}`);

        results.push(content);
        
        if (content.success) {
          successCount++;
          console.log(`✅ [${processedCount}/${selectedBlogs.length}] 크롤링 완료: ${content.contentLength}자 (유효 수집: ${successCount}/${targetSuccessCount})`);
          
          // 성공 콜백
          if (this.progressCallback) {
            this.progressCallback({
              current: successCount,
              total: targetSuccessCount,
              url: blog.url,
              status: 'success'
            });
          }
        } else {
          console.log(`⚠️ [${processedCount}/${selectedBlogs.length}] 필터링됨, 다음 블로그 시도: ${content.error}`);
          
          // 실패 콜백 (하지만 계속 진행)
          if (this.progressCallback) {
            this.progressCallback({
              current: Math.min(successCount + 1, targetSuccessCount),
              total: targetSuccessCount,
              url: blog.url,
              status: 'failed'
            });
          }
        }
        
        // 요청 간 딜레이 (과부하 방지)
        if (i < selectedBlogs.length - 1 && successCount < targetSuccessCount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ [${processedCount}/${selectedBlogs.length}] 크롤링 실패: ${blog.url}`, error);
        
        // 실패한 경우에도 결과에 포함 (빈 콘텐츠로)
        results.push({
          url: blog.url,
          title: blog.title,
          textContent: '',
          contentLength: 0,
          success: false,
          error: error instanceof Error ? error.message : '크롤링 실패'
        });
        
        // 실패 콜백
        if (this.progressCallback) {
          this.progressCallback({
            current: Math.min(successCount + 1, targetSuccessCount),
            total: targetSuccessCount,
            url: blog.url,
            status: 'failed'
          });
        }
      }
    }
    
    console.log(`🎯 블로그 크롤링 완료: ${successCount}/${targetSuccessCount} 목표 달성 (총 ${processedCount}개 시도)`);
    
    if (successCount < targetSuccessCount) {
      console.warn(`⚠️ 목표한 유효 블로그 수(${targetSuccessCount}개)에 못 미침: ${successCount}개만 수집됨`);
    }
    
    return results;
  }

  async crawlBlogContent(url: string, title: string): Promise<BlogContent> {
    try {
      // 네이버 블로그 URL 검증
      console.log(`🔍 URL 검증: "${url}" (길이: ${url?.length || 0})`);
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        console.error(`❌ 빈 URL 또는 잘못된 URL 타입: ${JSON.stringify(url)}`);
        return {
          url: url || '',
          title,
          textContent: '',
          contentLength: 0,
          success: false,
          error: 'URL이 비어있거나 잘못된 형식입니다'
        };
      }
      
      const cleanUrl = url.trim();
      const isNaverBlog = cleanUrl.includes('blog.naver.com');
      const isTistory = cleanUrl.includes('.tistory.com');
      
      if (!isNaverBlog && !isTistory) {
        console.error(`❌ 지원하지 않는 블로그 플랫폼: "${cleanUrl}"`);
        return {
          url: cleanUrl,
          title,
          textContent: '',
          contentLength: 0,
          success: false,
          error: '네이버 블로그 또는 티스토리만 지원됩니다'
        };
      }

      // User-Agent 설정으로 차단 우회
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      // 플랫폼별 URL 생성 후 다중 시도
      const urlsToTry = this.generateCrawlingUrls(url, isNaverBlog, isTistory);
      console.log(`🔍 ${isNaverBlog ? '네이버 블로그' : '티스토리'} URL 다중 시도: ${urlsToTry.length}개`);

      for (let i = 0; i < urlsToTry.length; i++) {
        const tryUrl = urlsToTry[i];
        console.log(`🔗 [${i + 1}/${urlsToTry.length}] 시도: ${tryUrl}`);
        
        try {
          const response = await fetch(tryUrl, {
            method: 'GET',
            headers,
            redirect: 'follow'
          });

          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const html = this.decodeWithEncoding(buffer, tryUrl);
            
            console.log(`✅ 성공적으로 HTML 획득 (${html.length}자)`);
            
            // HTML 파싱 및 콘텐츠 추출
            return this.parseHTMLContent(html, url, title, isNaverBlog, isTistory);
          } else {
            console.warn(`⚠️ [${i + 1}/${urlsToTry.length}] HTTP ${response.status}: ${tryUrl}`);
          }
        } catch (error) {
          console.warn(`⚠️ [${i + 1}/${urlsToTry.length}] 요청 실패: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      throw new Error('모든 URL 시도 실패');

    } catch (error) {
      console.error(`블로그 크롤링 오류 (${url}):`, error);
      throw error;
    }
  }

  private generateCrawlingUrls(originalUrl: string, isNaverBlog: boolean, isTistory: boolean): string[] {
    const urls: string[] = [];
    
    if (isNaverBlog) {
      // 1. PostView URL 직접 생성 (네이버 블로그 레거시 방식)
      const postViewUrl = this.convertToPostViewUrl(originalUrl);
      if (postViewUrl) {
        urls.push(postViewUrl);
      }
      
      // 2. 원본 URL 폴백
      urls.push(originalUrl);
    } else if (isTistory) {
      // 티스토리는 원본 URL을 그대로 사용
      urls.push(originalUrl);
      
      // 티스토리 모바일 버전도 시도해볼 수 있음
      if (originalUrl.includes('.tistory.com/') && !originalUrl.includes('m.')) {
        const mobileUrl = originalUrl.replace('.tistory.com/', '.tistory.com/m/');
        urls.push(mobileUrl);
      }
    }
    
    return urls;
  }

  private convertToPostViewUrl(blogUrl: string): string | null {
    // 레거시 패턴: https://blog.naver.com/{blogId}/{logNo}
    const pattern = /https:\/\/blog\.naver\.com\/([^\/]+)\/(\d+)/;
    const match = blogUrl.match(pattern);

    if (match) {
      const blogId = match[1];
      const logNo = match[2];
      
      // PostView URL 직접 생성
      return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
    }

    // 이미 PostView URL인 경우 그대로 반환
    if (blogUrl.includes('PostView.naver')) {
      return blogUrl;
    }

    return null;
  }

  private decodeWithEncoding(buffer: ArrayBuffer, url: string): string {
    const uint8Array = new Uint8Array(buffer);
    
    // 네이버 블로그는 일반적으로 UTF-8이지만, 구 버전은 EUC-KR 사용
    const encodings = ['utf-8', 'euc-kr', 'cp949'];
    
    for (const encoding of encodings) {
      try {
        // TextDecoder로 디코딩 시도
        const decoder = new TextDecoder(encoding, { fatal: true });
        const html = decoder.decode(uint8Array);
        
        // 한국어 문자가 포함되어 있고 깨짐이 없으면 성공
        if (html.includes('네이버') || html.includes('블로그') || /[가-힣]/.test(html.substring(0, 1000))) {
          console.log(`인코딩 감지 성공: ${encoding} for ${url}`);
          return html;
        }
      } catch (error) {
        // 디코딩 실패 시 다음 인코딩 시도
        continue;
      }
    }
    
    // 모든 인코딩 실패 시 UTF-8 강제 사용
    console.warn(`인코딩 자동감지 실패, UTF-8로 강제 디코딩: ${url}`);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(uint8Array);
  }

  private parseHTMLContent(html: string, url: string, originalTitle: string, isNaverBlog = true, isTistory = false): BlogContent {
    // 블로그 플랫폼별 HTML 파싱
    let extractedTitle = originalTitle;
    let textContent = '';

    console.log(`🔍 ${isNaverBlog ? '네이버 블로그' : '티스토리'} HTML 파싱 시작`);

    try {
      // 1. 제목 추출 - HTML에서 실제 제목을 추출
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        let htmlTitle = titleMatch[1].trim();
        // HTML 엔티티 디코딩
        htmlTitle = htmlTitle
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'");

        // 네이버 블로그의 경우 " : 네이버 블로그" 제거
        if (isNaverBlog && htmlTitle.includes(' : 네이버 블로그')) {
          htmlTitle = htmlTitle.replace(' : 네이버 블로그', '');
        }

        // 티스토리의 경우 사이트명 제거 (보통 " - 사이트명" 형태)
        if (isTistory && htmlTitle.includes(' - ')) {
          const parts = htmlTitle.split(' - ');
          if (parts.length > 1) {
            htmlTitle = parts[0]; // 첫 번째 부분만 사용 (실제 제목)
          }
        }

        extractedTitle = htmlTitle.trim() || originalTitle;
      } else {
        extractedTitle = originalTitle;
      }
      console.log(`🏷️ 제목 추출: "${extractedTitle}"`);

      // 2. 본문 텍스트 추출 - 플랫폼별 로직
      // 먼저 script, style 태그 제거
      let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      let totalText = '';
      
      if (isNaverBlog) {
        // 네이버 블로그: 레거시 방식 - 스마트에디터 3.0 텍스트 모듈 추출
        const textModulePattern = /<div[^>]*class="[^"]*se-module[^"]*se-module-text[^"]*"[^>]*(?![^>]*se-title-text)(?![^>]*se-caption)[^>]*>([\s\S]*?)<\/div>/gi;
        let textMatch;
        
        while ((textMatch = textModulePattern.exec(cleanHtml)) !== null) {
          if (textMatch[1]) {
            const moduleText = this.extractTextFromHtml(textMatch[1]);
            if (moduleText && moduleText.trim()) {
              totalText += moduleText.trim() + ' ';
            }
          }
        }
        
        // 네이버 블로그 Fallback 방식들
        if (totalText.trim().length < 100) {
          console.log(`⚠️ 스마트에디터 텍스트 부족 (${totalText.length}자), Fallback 시도`);
          const fallbackSelectors = [
            '.se-viewer', '#post_view', '.post_content', '.se-main-container',
            '.postViewArea', '.se-component-wrap', '.se-component'
          ];
          
          for (const selector of fallbackSelectors) {
            const selectorPattern = new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'i');
            const idPattern = new RegExp(`<[^>]*id="${selector.replace('#', '')}"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'i');
            
            const match = cleanHtml.match(selectorPattern) || cleanHtml.match(idPattern);
            if (match && match[1]) {
              const text = this.extractTextFromHtml(match[1]);
              if (text.length > totalText.length) {
                totalText = text;
                break;
              }
            }
          }
        }
      } else if (isTistory) {
        // 티스토리: article 태그 우선, 기타 컨텐츠 영역 폴백
        let contentExtracted = false;
        
        // 1. article 태그에서 추출 (가장 확실한 방법)
        const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch && articleMatch[1]) {
          totalText = this.extractTextFromHtml(articleMatch[1]);
          contentExtracted = true;
          console.log(`✅ 티스토리 article 태그에서 텍스트 추출: ${totalText.length}자`);
        }
        
        // 2. area_view 클래스에서 추출 (티스토리 특화)
        if (!contentExtracted || totalText.length < 100) {
          const areaViewMatch = cleanHtml.match(/<div[^>]*class="[^"]*area_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (areaViewMatch && areaViewMatch[1]) {
            const areaText = this.extractTextFromHtml(areaViewMatch[1]);
            if (areaText.length > totalText.length) {
              totalText = areaText;
              contentExtracted = true;
              console.log(`✅ 티스토리 area_view에서 텍스트 추출: ${totalText.length}자`);
            }
          }
        }
        
        // 3. 기타 티스토리 컨텐츠 영역들
        if (!contentExtracted || totalText.length < 100) {
          const tistorySelectors = ['.contents_style', '.entry-content', '.post-content'];
          for (const selector of tistorySelectors) {
            const pattern = new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'i');
            const match = cleanHtml.match(pattern);
            if (match && match[1]) {
              const text = this.extractTextFromHtml(match[1]);
              if (text.length > totalText.length) {
                totalText = text;
                console.log(`✅ 티스토리 ${selector}에서 텍스트 추출: ${totalText.length}자`);
                break;
              }
            }
          }
        }
      }
      
      // 공통 Fallback: p 태그에서 텍스트 추출
      if (totalText.trim().length < 100) {
        console.log(`⚠️ 플랫폼별 추출 실패, p 태그 Fallback 시도`);
        const pMatches = cleanHtml.match(/<p[^>]*>(.*?)<\/p>/gi);
        if (pMatches) {
          let pText = '';
          pMatches.forEach(p => {
            const text = this.extractTextFromHtml(p);
            if (text.trim() && text.length > 5) {
              pText += text + ' ';
            }
          });
          if (pText.length > totalText.length) {
            totalText = pText;
          }
        }
      }
      
      textContent = totalText.trim();

      // 텍스트 추출 완료

    } catch (error) {
      console.warn(`HTML 파싱 오류 (${url}):`, error);
    }

    // 줄바꿈을 유지하면서 글자수 계산
    const finalText = textContent.trim(); // 앞뒤 공백만 제거, 줄바꿈은 유지
    const contentLength = finalText.replace(/\s/g, '').length; // 공백 제거한 순수 글자수 (글자수 계산용)
    textContent = finalText;

    console.log(`📊 크롤링 결과 - 제목: "${extractedTitle}", 본문: ${contentLength}자`);

    return {
      url,
      title: extractedTitle,
      textContent,
      contentLength,
      success: true
    };
  }

  // HTML에서 텍스트 추출하며 줄바꿈 유지
  private extractTextFromHtml(html: string): string {
    if (!html) return '';

    // 블록 레벨 요소들을 줄바꿈으로 변환
    let text = html
      .replace(/<\/?(div|p|br|h[1-6]|li|blockquote|pre)[^>]*>/gi, '\n')
      .replace(/<\/?(ul|ol|dl)[^>]*>/gi, '\n\n')
      .replace(/<\/?(tr|td|th)[^>]*>/gi, '\n');

    // 나머지 HTML 태그 제거
    text = text.replace(/<[^>]*>/g, '');

    // HTML 엔티티 디코딩
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    // 줄바꿈 정리 (연속된 줄바꿈을 최대 2개로 제한, 각 줄의 앞뒤 공백 제거)
    text = text
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }
}