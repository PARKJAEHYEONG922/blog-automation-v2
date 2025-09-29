/**
 * 콘텐츠 처리 관련 유틸리티 함수들
 */

export interface ProcessedContent {
  text: string;
  wordCount: number;
  readingTime: number; // 분 단위
  hasImages: boolean;
  hasCodeBlocks: boolean;
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  publishDate?: Date;
}

/**
 * 텍스트에서 HTML 태그 제거
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * 텍스트에서 마크다운 문법 제거
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/[#*`_~\[\]()]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '$1')
    .trim();
}

/**
 * 콘텐츠 메타데이터 분석
 */
export function analyzeContent(content: string): ProcessedContent {
  const cleanText = stripHtmlTags(stripMarkdown(content));
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // 분당 200단어 기준
  const hasImages = /!\[.*?\]\(.*?\)/.test(content) || /<img[^>]*>/i.test(content);
  const hasCodeBlocks = /```[\s\S]*?```/.test(content) || /<code[^>]*>/.test(content);

  return {
    text: cleanText,
    wordCount,
    readingTime,
    hasImages,
    hasCodeBlocks
  };
}

/**
 * 텍스트에서 키워드 추출
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const cleanText = stripHtmlTags(stripMarkdown(text)).toLowerCase();
  
  // 불용어 목록 (한국어 기준)
  const stopWords = new Set([
    '그', '그것', '그런', '그러나', '그래서', '그리고', '그때', '그런데',
    '이', '이것', '이런', '그리고', '하지만', '그러므로', '따라서',
    '있다', '없다', '되다', '하다', '이다', '아니다', '같다', '다르다',
    '의', '가', '이', '을', '를', '에', '에서', '와', '과', '로', '으로'
  ]);

  const words = cleanText
    .split(/[^\w가-힣]+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  // 빈도수 계산
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // 빈도수 기준 정렬하여 상위 키워드 반환
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * 콘텐츠 요약 생성
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  const cleanText = stripHtmlTags(stripMarkdown(content));
  const sentences = cleanText.split(/[.!?]/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) return '';
  
  let summary = sentences[0].trim();
  
  for (let i = 1; i < sentences.length && summary.length < maxLength; i++) {
    const nextSentence = sentences[i].trim();
    if (summary.length + nextSentence.length + 1 <= maxLength) {
      summary += '. ' + nextSentence;
    } else {
      break;
    }
  }
  
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary;
}

/**
 * 이미지 URL 추출
 */
export function extractImageUrls(content: string): string[] {
  const imageUrls: string[] = [];
  
  // 마크다운 이미지 패턴
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = markdownImageRegex.exec(content)) !== null) {
    imageUrls.push(match[1]);
  }
  
  // HTML img 태그 패턴
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImageRegex.exec(content)) !== null) {
    imageUrls.push(match[1]);
  }
  
  return [...new Set(imageUrls)]; // 중복 제거
}

/**
 * 콘텐츠 길이별 분류
 */
export function categorizeContentLength(wordCount: number): 'short' | 'medium' | 'long' {
  if (wordCount < 300) return 'short';
  if (wordCount < 1000) return 'medium';
  return 'long';
}

/**
 * 텍스트 정리 (공백, 줄바꿈 등)
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .replace(/\n\s*\n/g, '\n\n') // 연속된 빈 줄을 두 개로
    .trim();
}

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const contentProcessor = {
  stripHtmlTags,
  stripMarkdown,
  analyzeContent,
  extractKeywords,
  generateSummary,
  extractImageUrls,
  categorizeContentLength,
  cleanText,
  extractDomain
};

export default contentProcessor;