/**
 * 콘텐츠 자동 편집 처리를 위한 유틸리티 클래스
 */
import '@/shared/types/electron.types';
export class ContentProcessor {
  /**
   * 원본 마크다운을 자동편집된 형태로 변환 (V2의 processMarkdown과 동일)
   * 네이버 블로그 호환 HTML로 변환
   */
  static processContent(originalContent: string): string {
    return this.convertToNaverBlogHTML(originalContent);
  }

  /**
   * 콘텐츠의 통계 정보 계산
   */
  static getContentStats(content: string): {
    totalChars: number;
    charsWithoutSpaces: number;
    lines: number;
    paragraphs: number;
    headings: number;
  } {
    if (!content) {
      return {
        totalChars: 0,
        charsWithoutSpaces: 0,
        lines: 0,
        paragraphs: 0,
        headings: 0
      };
    }

    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const headings = lines.filter(line => line.trim().match(/^#+\s/));

    return {
      totalChars: content.length,
      charsWithoutSpaces: content.replace(/\s/g, '').length,
      lines: lines.length,
      paragraphs: paragraphs.length,
      headings: headings.length
    };
  }

  /**
   * 이미지 위치 감지 및 정리
   */
  static processImages(content: string): {
    content: string;
    imageCount: number;
    imagePositions: string[];
  } {
    const imageRegex = /\(이미지\)/g;
    const positions: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      positions.push(`이미지${positions.length + 1}`);
    }
    
    return {
      content,
      imageCount: positions.length,
      imagePositions: positions
    };
  }

  /**
   * V2의 processMarkdown 로직 - 네이버 블로그 호환 HTML 변환
   * 1. # 제목 제거
   * 2. ## → 24px 볼드 대제목 
   * 3. ### → 19px 볼드 소제목
   * 4. 일반 → 15px
   */
  static convertToNaverBlogHTML(content: string): string {
    // 먼저 콘텐츠 정리
    let cleanedContent = this.cleanAIGeneratedContent(content);
    
    // 1. # 제목 제거
    cleanedContent = this.removeSingleHashTitles(cleanedContent);
    
    // 이미지 플레이스홀더에 번호 매기기
    const numberedContent = this.addImageNumbers(cleanedContent);
    
    const lines = numberedContent.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // 표 감지 (| 포함된 연속 라인들)
      if (line.includes('|')) {
        const tableLines: string[] = [];
        let j = i;
        
        // 연속된 표 라인들 수집
        while (j < lines.length && (lines[j].includes('|') || lines[j].includes('---'))) {
          tableLines.push(lines[j]);
          j++;
        }
        
        if (tableLines.length > 0) {
          result.push(this.convertMarkdownTable(tableLines));
          i = j;
          continue;
        }
      }
      
      // 마크다운 구분선 처리 (---) - 시각적으로 보이는 실선
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        result.push('<hr style="border: none; border-top: 1px solid #666; margin: 16px auto; width: 30%;">');
      } else if (line.trim().startsWith('## ')) {
        const text = line.substring(line.indexOf('## ') + 3);
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs24" style="color: rgb(0, 0, 0); font-weight: bold;">${text}</span></p>`);
      } else if (line.trim().startsWith('### ')) {
        const text = line.substring(line.indexOf('### ') + 4);
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs19" style="color: rgb(0, 0, 0); font-weight: bold;">${text}</span></p>`);
      } else if (line.trim() === '') {
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">&nbsp;</span></p>`);
      } else if (line.trim().match(/^(\d+\.|[-•*]\s+|✓\s+|[①-⑳]\s+|[가-힣]\.\s+)/)) {
        // 모든 리스트 항목 처리
        let text = line.trim();
        text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="se-ff-nanumgothic se-fs16" style="color: rgb(0, 0, 0); font-weight: bold;">$1</span>');
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${text}</span></p>`);
      } else if (line.trim().startsWith('원본태그 =')) {
        // 태그 라인은 줄바꿈 안 함 ("원본태그 =" 으로 시작하면 태그로 간주, 한 줄로 유지)
        // "원본태그 =" 제거하고 태그만 표시
        const tagsOnly = line.trim().replace(/^원본태그\s*=\s*/, '');
        let processedLine = tagsOnly.replace(/\*\*([^*]+)\*\*/g, '<span class="se-ff-nanumgothic se-fs16" style="color: rgb(0, 0, 0); font-weight: bold;">$1</span>');
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${processedLine}</span></p>`);
      } else if (line.trim().match(/^\(이미지\d*\)$/)) {
        // 이미지 플레이스홀더 처리 (자동 구분선 제거 - 클로드가 필요한 곳에만 --- 생성)
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${line.trim()}</span></p>`);
      } else {
        // 일반 텍스트 처리 (28자 이상이면 재귀적으로 자르기)
        const processedLines = this.breakLongText(line.trim());
        for (const textLine of processedLines) {
          let processedLine = textLine.replace(/\*\*([^*]+)\*\*/g, '<span class="se-ff-nanumgothic se-fs16" style="color: rgb(0, 0, 0); font-weight: bold;">$1</span>');
          result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${processedLine}</span></p>`);
        }
      }

      i++;
    }
    
    return result.join('');
  }

  /**
   * AI 생성 콘텐츠 정리 (V2 로직)
   */
  private static cleanAIGeneratedContent(content: string): string {
    try {
      let cleanedContent = content;
      
      // AI가 생성한 메타 지시사항들 제거
      const patternsToRemove = [
        /\[제목.*?\]/gi,
        /\[서론.*?\]/gi,
        /\[본문.*?\]/gi,
        /\[결론.*?\]/gi,
        /\[메인키워드와 보조키워드를 활용하여 글 내용에 적합한 태그.*?\]/gi,
        /\[상위 블로그 인기 태그 참고:.*?\]/gi
      ];
      
      for (const pattern of patternsToRemove) {
        cleanedContent = cleanedContent.replace(pattern, '');
      }
      
      // 해시태그 정리 (사용 안 함 - 원본 유지)
      
      // 연속된 공백과 줄바꿈 정리
      cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      cleanedContent = cleanedContent.trim();
      
      return cleanedContent;
    } catch (error) {
      console.warn('콘텐츠 정리 중 오류:', error);
      return content;
    }
  }

  /**
   * 해시태그 정리: 중복 제거하고 한 줄로 정리
   */
  private static cleanHashtags(content: string): string {
    try {
      const hashtags = content.match(/#\w+/g) || [];
      
      if (hashtags.length === 0) {
        return content;
      }
      
      // 중복 제거하되 순서 유지
      const seen = new Set<string>();
      const uniqueHashtags: string[] = [];
      
      for (const tag of hashtags) {
        if (!seen.has(tag.toLowerCase())) {
          seen.add(tag.toLowerCase());
          uniqueHashtags.push(tag);
        }
      }
      
      // 원본에서 해시태그 부분 제거
      const contentWithoutTags = content.replace(/#\w+/g, '').trim();
      
      // 정리된 태그들을 마지막에 한 줄로 추가
      if (uniqueHashtags.length > 0) {
        const tagsLine = uniqueHashtags.join(' ');
        return `${contentWithoutTags}\n\n${tagsLine}`;
      }
      
      return contentWithoutTags;
    } catch (error) {
      console.warn('해시태그 정리 중 오류:', error);
      return content;
    }
  }

  /**
   * # 제목 제거 (있을 때만 제거, 없으면 그대로 유지)
   */
  private static removeSingleHashTitles(content: string): string {
    const lines = content.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      
      // 단독으로 나오는 # 제거
      if (trimmedLine === '#') {
        return false;
      }
      
      // # 뒤에 공백이 있는 제목 제거 (## ###는 유지)
      if (trimmedLine.match(/^#\s+/)) {
        return false;
      }
      
      return true;
    });
    
    let result = filteredLines.join('\n');
    
    // 제거 후 생기는 연속된 빈 줄 정리 (3개 이상 → 2개로)
    result = result.replace(/\n\n\n+/g, '\n\n');
    
    // 시작 부분의 빈 줄 제거
    result = result.replace(/^\n+/, '');
    
    // 끝 부분의 빈 줄 제거
    result = result.replace(/\n+$/, '');
    
    return result;
  }

  /**
   * (이미지) 플레이스홀더를 번호가 매겨진 형태로 변경
   */
  private static addImageNumbers(content: string): string {
    // 먼저 [이미지]를 (이미지)로 통일
    content = content.replace(/\[이미지\]/g, '(이미지)');
    
    let imageIndex = 1;
    
    // 모든 (이미지)를 순서대로 번호가 매겨진 형태로 변경
    content = content.replace(/\(이미지\)/g, () => {
      return `(이미지${imageIndex++})`;
    });
    
    return content;
  }

  /**
   * 긴 텍스트를 28자 기준으로 재귀적으로 자르는 함수
   * 강조 표시(**텍스트**)가 끊기지 않도록 처리
   */
  private static breakLongText(text: string): string[] {
    // 해시태그 라인은 절대 자르지 않음
    if (text.includes('#') && text.match(/#\S+/)) {
      return [text];
    }

    // 마크다운 제거하여 실제 텍스트 길이 계산
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');

    if (plainText.length <= 25) {
      return [text];
    }

    // 15-28자 구간에서 자를 위치 찾기
    let cutPosition = -1;

    // 1순위: 마침표 (15-28자 구간)
    for (let i = 15; i <= Math.min(28, plainText.length - 1); i++) {
      if (plainText[i] === '.') {
        cutPosition = i + 1;
        break;
      }
    }

    // 2순위: 쉼표 (15-28자 구간)
    if (cutPosition === -1) {
      for (let i = 15; i <= Math.min(28, plainText.length - 1); i++) {
        if (plainText[i] === ',') {
          cutPosition = i + 1;
          break;
        }
      }
    }

    // 3순위: 접속사 (15-25자 구간)
    if (cutPosition === -1) {
      const conjunctions = ['그리고', '하지만', '또한', '따라서', '그런데', '그러나', '그래서', '또는', '그러면', '그럼', '이제', '이때'];
      for (let i = 15; i <= Math.min(25, plainText.length - 3); i++) {
        const remaining = plainText.substring(i);
        for (const conj of conjunctions) {
          if (remaining.startsWith(conj)) {
            cutPosition = i;
            break;
          }
        }
        if (cutPosition !== -1) break;
      }
    }

    // 4순위: 공백 (20-25자 구간에서 뒤에서부터 찾기)
    if (cutPosition === -1) {
      for (let i = Math.min(25, plainText.length - 1); i >= 20; i--) {
        if (plainText[i] === ' ') {
          cutPosition = i;
          break;
        }
      }
    }

    // 5순위: 강제로 25자에서 자르기
    if (cutPosition === -1) {
      cutPosition = 25;
    }

    if (cutPosition !== -1) {
      // ** 강조 영역 찾기
      const boldRanges: Array<{start: number, end: number}> = [];
      let pos = 0;
      while (pos < text.length) {
        const startIdx = text.indexOf('**', pos);
        if (startIdx === -1) break;
        const endIdx = text.indexOf('**', startIdx + 2);
        if (endIdx === -1) break;
        boldRanges.push({start: startIdx, end: endIdx + 2});
        pos = endIdx + 2;
      }

      // 원본 텍스트에서 실제 자를 위치 찾기 (마크다운 고려)
      let realCutPosition = 0;
      let plainCount = 0;
      let i = 0;

      while (i < text.length && plainCount < cutPosition) {
        if (text.substring(i, i + 2) === '**') {
          // ** 태그는 건너뛰기
          realCutPosition = i + 2;
          i += 2;
        } else {
          // 일반 문자는 카운트
          plainCount++;
          realCutPosition = i + 1;
          i++;
        }
      }

      // 강조로 시작하는지 확인
      const startsWithBold = text.trim().startsWith('**');

      // 자를 위치가 강조 영역 안에 있는지 확인
      let insideBold = false;
      let boldRange: {start: number, end: number} | null = null;

      for (const range of boldRanges) {
        if (realCutPosition > range.start && realCutPosition < range.end) {
          insideBold = true;
          boldRange = range;
          break;
        }
      }

      let firstPart: string;
      let secondPart: string;

      // 강조로 시작하고 + 강조 영역 안에서 잘라야 하는 경우만 특별 처리
      if (startsWithBold && insideBold && boldRange) {
        // 강조 끝까지 포함해서 자르기
        firstPart = text.substring(0, boldRange.end).trim();
        secondPart = text.substring(boldRange.end).trim();
      } else {
        // 일반적인 경우: 그냥 자르기
        firstPart = text.substring(0, realCutPosition).trim();
        secondPart = text.substring(realCutPosition).trim();
      }

      // 재귀적으로 두 번째 부분도 처리
      const restParts = this.breakLongText(secondPart);

      return [firstPart, ...restParts];
    } else {
      return [text];
    }
  }

  /**
   * 마크다운 표를 네이버 블로그 HTML 표로 변환
   */
  private static convertMarkdownTable(tableLines: string[]): string {
    const rows: string[][] = [];

    for (const line of tableLines) {
      if (line.includes('---')) continue; // 구분선 무시

      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return '';

    let tableHtml = '<div class="se-component se-table" style="text-align: center; margin: 16px auto;"><table class="se-table-content" style="margin: 0 auto;">';

    rows.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const backgroundColor = isHeader ? 'background-color: rgb(248, 249, 250);' : '';

      tableHtml += '<tr class="se-tr">';

      row.forEach(cell => {
        let processedCell = cell;
        // **강조** 처리
        processedCell = processedCell.replace(/\*\*([^*]+)\*\*/g, '<span style="font-weight: bold;">$1</span>');

        tableHtml += `<td class="se-cell" style="border: 1px solid rgb(221, 221, 221); padding: 8px; ${backgroundColor}"><div class="se-module-text"><p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${processedCell}</span></p></div></td>`;
      });

      tableHtml += '</tr>';
    });

    tableHtml += '</table></div>';

    return tableHtml;
  }
}
