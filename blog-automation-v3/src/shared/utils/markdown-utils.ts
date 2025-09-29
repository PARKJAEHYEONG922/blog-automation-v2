/**
 * 마크다운 처리 관련 유틸리티 함수들
 */

export interface MarkdownParseResult {
  title?: string;
  content: string;
  headings: { level: number; text: string; id: string }[];
  links: { text: string; url: string }[];
  images: { alt: string; url: string }[];
}

export interface TableOfContents {
  level: number;
  text: string;
  id: string;
  children?: TableOfContents[];
}

/**
 * 마크다운을 HTML로 변환 (기본적인 변환)
 */
export function markdownToHtml(markdown: string): string {
  return markdown
    // 헤딩
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 굵은 텍스트
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    // 기울임 텍스트
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    // 링크
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    // 이미지
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img alt="$1" src="$2" />')
    // 코드 (인라인)
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // 줄바꿈
    .replace(/\n/gim, '<br>');
}

/**
 * HTML을 마크다운으로 변환 (기본적인 변환)
 */
export function htmlToMarkdown(html: string): string {
  return html
    // 헤딩
    .replace(/<h1[^>]*>(.*?)<\/h1>/gim, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gim, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gim, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gim, '#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gim, '##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gim, '###### $1\n')
    // 굵은 텍스트
    .replace(/<strong[^>]*>(.*?)<\/strong>/gim, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gim, '**$1**')
    // 기울임 텍스트
    .replace(/<em[^>]*>(.*?)<\/em>/gim, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gim, '*$1*')
    // 링크
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gim, '[$2]($1)')
    // 이미지
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gim, '![$1]($2)')
    // 코드
    .replace(/<code[^>]*>(.*?)<\/code>/gim, '`$1`')
    // 줄바꿈
    .replace(/<br\s*\/?>/gim, '\n')
    // HTML 태그 제거
    .replace(/<[^>]*>/gim, '');
}

/**
 * 마크다운 파싱
 */
export function parseMarkdown(markdown: string): MarkdownParseResult {
  const lines = markdown.split('\n');
  let title: string | undefined;
  const headings: { level: number; text: string; id: string }[] = [];
  const links: { text: string; url: string }[] = [];
  const images: { alt: string; url: string }[] = [];

  // 첫 번째 헤딩을 제목으로 사용
  const firstHeading = lines.find(line => line.match(/^#+\s/));
  if (firstHeading) {
    title = firstHeading.replace(/^#+\s/, '').trim();
  }

  // 헤딩 추출
  const headingRegex = /^(#+)\s(.+)$/;
  lines.forEach(line => {
    const match = line.match(headingRegex);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w가-힣\s-]/g, '').replace(/\s+/g, '-');
      headings.push({ level, text, id });
    }
  });

  // 링크 추출
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(markdown)) !== null) {
    links.push({ text: linkMatch[1], url: linkMatch[2] });
  }

  // 이미지 추출
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let imageMatch;
  while ((imageMatch = imageRegex.exec(markdown)) !== null) {
    images.push({ alt: imageMatch[1], url: imageMatch[2] });
  }

  return {
    title,
    content: markdown,
    headings,
    links,
    images
  };
}

/**
 * 목차 생성
 */
export function generateTableOfContents(headings: { level: number; text: string; id: string }[]): TableOfContents[] {
  const toc: TableOfContents[] = [];
  const stack: TableOfContents[] = [];

  headings.forEach(heading => {
    const tocItem: TableOfContents = {
      level: heading.level,
      text: heading.text,
      id: heading.id,
      children: []
    };

    // 스택에서 현재 레벨보다 깊은 항목들 제거
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      toc.push(tocItem);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) parent.children = [];
      parent.children.push(tocItem);
    }

    stack.push(tocItem);
  });

  return toc;
}

/**
 * 마크다운 목차를 문자열로 변환
 */
export function tocToMarkdown(toc: TableOfContents[]): string {
  function renderItem(item: TableOfContents, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let result = `${indent}- [${item.text}](#${item.id})\n`;
    
    if (item.children && item.children.length > 0) {
      result += item.children.map(child => renderItem(child, depth + 1)).join('');
    }
    
    return result;
  }

  return toc.map(item => renderItem(item)).join('');
}

/**
 * 코드 블록 추출
 */
export function extractCodeBlocks(markdown: string): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: { language: string; code: string }[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
}

/**
 * 마크다운에 헤딩 ID 추가
 */
export function addHeadingIds(markdown: string): string {
  return markdown.replace(/^(#+)\s(.+)$/gm, (match, hashes, text) => {
    const id = text.toLowerCase().replace(/[^\w가-힣\s-]/g, '').replace(/\s+/g, '-');
    return `${hashes} ${text} {#${id}}`;
  });
}

/**
 * 상대 링크를 절대 링크로 변환
 */
export function resolveRelativeLinks(markdown: string, baseUrl: string): string {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    if (url.startsWith('http') || url.startsWith('//')) {
      return match; // 이미 절대 URL
    }
    
    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      return `[${text}](${absoluteUrl})`;
    } catch {
      return match; // URL 파싱 실패 시 원본 유지
    }
  });
}

const markdownUtils = {
  markdownToHtml,
  htmlToMarkdown,
  parseMarkdown,
  generateTableOfContents,
  tocToMarkdown,
  extractCodeBlocks,
  addHeadingIds,
  resolveRelativeLinks
};

export default markdownUtils;