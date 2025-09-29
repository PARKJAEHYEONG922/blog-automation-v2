/**
 * 콘텐츠 자동 편집 처리를 위한 유틸리티 클래스
 */
import '../../../shared/types/electron.types';
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
      
      // 일반 텍스트 처리
      if (line.trim().startsWith('## ')) {
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
      
      // 해시태그 정리
      cleanedContent = this.cleanHashtags(cleanedContent);
      
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
   */
  private static breakLongText(text: string): string[] {
    // 마크다운 제거하여 실제 텍스트 길이 계산
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    if (plainText.length <= 28) {
      return [text];
    }
    
    // 15-35자 구간에서 자를 위치 찾기 (범위 확장)
    let cutPosition = -1;
    
    // 1순위: 마침표 (15-35자 구간)
    for (let i = 15; i <= Math.min(35, plainText.length - 1); i++) {
      if (plainText[i] === '.') {
        cutPosition = i + 1;
        break;
      }
    }
    
    // 2순위: 쉼표 (15-35자 구간)
    if (cutPosition === -1) {
      for (let i = 15; i <= Math.min(35, plainText.length - 1); i++) {
        if (plainText[i] === ',') {
          cutPosition = i + 1;
          break;
        }
      }
    }
    
    // 3순위: 접속사 (15-32자 구간)
    if (cutPosition === -1) {
      const conjunctions = ['그리고', '하지만', '또한', '따라서', '그런데', '그러나', '그래서', '또는', '그러면', '그럼', '이제', '이때'];
      for (let i = 15; i <= Math.min(32, plainText.length - 3); i++) {
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
    
    // 4순위: 공백 (20-30자 구간에서 뒤에서부터 찾기)
    if (cutPosition === -1) {
      for (let i = Math.min(30, plainText.length - 1); i >= 20; i--) {
        if (plainText[i] === ' ') {
          cutPosition = i;
          break;
        }
      }
    }
    
    // 5순위: 강제로 28자에서 자르기
    if (cutPosition === -1) {
      cutPosition = 28;
    }
    
    if (cutPosition !== -1) {
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
      
      const firstPart = text.substring(0, realCutPosition).trim();
      const secondPart = text.substring(realCutPosition).trim();
      
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
    // 간단한 표 변환 로직 (실제 구현 필요)
    return tableLines.map(line => 
      `<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${line}</span></p>`
    ).join('');
  }

  // ========== Step2 네이버 블로그 에디터 관련 함수들 (백업 파일에서 이동) ==========

  /**
   * Step2 글씨 크기 매핑 (4가지만 사용)
   */
  static mapStep2FontSize(fontSize: string): { size: string; bold: boolean } {
    const sizeMap: { [key: string]: { size: string; bold: boolean } } = {
      '24px': { size: '24', bold: true },   // 대제목
      '19px': { size: '19', bold: true },   // 소제목  
      '16px': { size: '16', bold: true },   // 강조
      '15px': { size: '15', bold: false }   // 일반
    };
    return sizeMap[fontSize] || { size: '15', bold: false }; // 기본값
  }

  /**
   * 네이버 블로그에서 글씨 크기 변경
   */
  static async changeFontSize(fontSize: string): Promise<boolean> {
    console.log(`📏 글씨 크기 변경: ${fontSize}`);
    
    try {
      // 글씨 크기 버튼 클릭
      const fontSizeButtonResult = await window.electronAPI.playwrightClickInFrames('.se-font-size-code-toolbar-button');
      
      if (fontSizeButtonResult.success) {
        await window.electronAPI.playwrightWaitTimeout(500);
        
        // 특정 크기 선택
        const sizeSelector = `.se-toolbar-option-font-size-code-fs${fontSize}-button`;
        const sizeOptionResult = await window.electronAPI.playwrightClickInFrames(sizeSelector);
        
        if (sizeOptionResult.success) {
          console.log(`✅ 글씨 크기 ${fontSize} 적용 완료`);
          await window.electronAPI.playwrightWaitTimeout(300);
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 글씨 크기 변경 실패: ${error}`);
    }
    
    return false;
  }

  /**
   * 네이버 블로그에서 굵기 상태 확인
   */
  static async getCurrentBoldState(): Promise<boolean> {
    try {
      const stateResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const boldButton = document.querySelector('.se-bold-toolbar-button');
            if (boldButton) {
              const isSelected = boldButton.classList.contains('se-is-selected');
              console.log('현재 굵기 상태:', isSelected ? '켜짐' : '꺼짐');
              return { success: true, isBold: isSelected };
            }
            return { success: false };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      return stateResult?.result?.isBold || false;
    } catch (error) {
      console.warn('굵기 상태 확인 실패:', error);
      return false;
    }
  }

  /**
   * 네이버 블로그에서 굵기 설정 (상태 확인 후 필요시에만 토글)
   */
  static async setBoldState(targetBold: boolean): Promise<boolean> {
    console.log(`🔥 굵기 상태 설정: ${targetBold ? '켜기' : '끄기'}`);
    
    try {
      // 현재 굵기 상태 확인
      const currentBold = await this.getCurrentBoldState();
      
      // 이미 원하는 상태면 토글하지 않음
      if (currentBold === targetBold) {
        console.log(`✅ 이미 원하는 굵기 상태 (${targetBold ? '켜짐' : '꺼짐'})`);
        return true;
      }
      
      console.log(`🔄 굵기 상태 변경: ${currentBold ? '켜짐' : '꺼짐'} → ${targetBold ? '켜짐' : '꺼짐'}`);
      
      // 굵기 버튼 클릭 (토글)
      const boldSelectors = [
        '.se-bold-toolbar-button',
        'button[data-name="bold"]',
        'button[data-log="prt.bold"]'
      ];
      
      for (const selector of boldSelectors) {
        const result = await window.electronAPI.playwrightClickInFrames(selector);
        if (result.success) {
          console.log(`✅ 굵기 토글 완료`);
          await window.electronAPI.playwrightWaitTimeout(300);
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 굵기 설정 실패: ${error}`);
    }
    
    return false;
  }

  /**
   * 굵게 처리 (setBoldState(true)로 대체)
   */
  static async applyBold(): Promise<boolean> {
    return await this.setBoldState(true);
  }

  /**
   * 서식 적용 (글씨 크기 + 굵게)
   */
  static async applyFormatting(formatInfo: { size: string; bold: boolean }): Promise<void> {
    console.log(`🎨 서식 적용: 크기 ${formatInfo.size}${formatInfo.bold ? ' + 굵게' : ''}`);
    
    // 1. 글씨 크기 변경
    await this.changeFontSize(formatInfo.size);
    
    // 2. 굵게 처리 (필요한 경우)
    if (formatInfo.bold) {
      await this.applyBold();
    }
  }

  /**
   * Step2에서 편집된 HTML 내용을 문단별로 파싱 (개선된 버전)
   */
  static parseContentByParagraphs(htmlContent: string): Array<{
    segments: Array<{
      text: string;
      fontSize: string;
      isBold: boolean;
    }>;
    isTable?: boolean;
    tableData?: { rows: number; cols: number; data: string[][] };
  }> {
    console.log('🔍 Step2 HTML 구조 분석 시작...');
    
    const paragraphs: Array<{
      segments: Array<{
        text: string;
        fontSize: string;
        isBold: boolean;
      }>;
      isTable?: boolean;
      tableData?: { rows: number; cols: number; data: string[][] };
    }> = [];
    
    // 1. 먼저 표 처리
    const tableRegex = /<div class="se-component se-table[^>]*">[\s\S]*?<table class="se-table-content[^>]*">([\s\S]*?)<\/table>[\s\S]*?<\/div>/g;
    let tableMatch;
    let processedContent = htmlContent;
    
    while ((tableMatch = tableRegex.exec(htmlContent)) !== null) {
      const tableContent = tableMatch[1];
      console.log('📊 표 발견');
      
      const tableData = this.parseTableData(tableContent);
      if (tableData) {
        paragraphs.push({
          segments: [],
          isTable: true,
          tableData
        });
        
        // 표를 처리된 콘텐츠에서 제거 (중복 처리 방지)
        processedContent = processedContent.replace(tableMatch[0], '');
      }
    }
    
    // 2. 일반 문단 처리
    const paragraphRegex = /<p[^>]*class="se-text-paragraph[^>]*"[^>]*>(.*?)<\/p>/g;
    let match;
    
    while ((match = paragraphRegex.exec(processedContent)) !== null) {
      const pContent = match[1];
      
      // 빈 문단 건너뛰기
      if (!pContent.trim() || pContent.trim() === '&nbsp;') {
        continue;
      }
      
      console.log(`📝 문단 분석: ${pContent.substring(0, 50)}...`);
      
      const segments: Array<{
        text: string;
        fontSize: string;
        isBold: boolean;
      }> = [];
      
      // span 태그들 찾기
      const spanRegex = /<span[^>]*class="[^"]*se-ff-nanumgothic[^"]*"[^>]*>(.*?)<\/span>/g;
      let spanMatch;
      
      if (spanMatch = spanRegex.exec(pContent)) {
        const spanOuter = spanMatch[0];
        const spanInnerHTML = spanMatch[1];
        
        // 폰트 크기 추출
        const fontSizeMatch = spanOuter.match(/se-fs(\d+)/);
        let fontSize = fontSizeMatch ? fontSizeMatch[1] + 'px' : '15px';
        
        // 굵기 확인
        const isBold = spanOuter.includes('font-weight: bold') || spanOuter.includes('font-weight:bold');
        
        // 중첩된 span 태그 확인
        const nestedSpanRegex = /<span[^>]*>(.*?)<\/span>/g;
        let nestedMatch;
        
        if (spanInnerHTML.includes('<span')) {
          // 중첩된 span이 있는 경우
          while ((nestedMatch = nestedSpanRegex.exec(spanInnerHTML)) !== null) {
            const nestedSpanOuter = nestedMatch[0];
            let nestedText = nestedMatch[1];
            
            // 중첩된 span의 폰트 크기 우선 적용
            const nestedFontSizeMatch = nestedSpanOuter.match(/se-fs(\d+)/);
            if (nestedFontSizeMatch) {
              fontSize = nestedFontSizeMatch[1] + 'px';
            }
            
            // 중첩된 span의 굵기 우선 적용
            const nestedBold = nestedSpanOuter.includes('font-weight: bold') || nestedSpanOuter.includes('font-weight:bold');
            
            nestedText = nestedText
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            
            if (nestedText.trim()) {
              segments.push({
                text: nestedText.trim(),
                fontSize,
                isBold: nestedBold || isBold
              });
            }
          }
        } else {
          // 중첩되지 않은 경우
          let text = spanInnerHTML
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
          
          if (text.trim()) {
            segments.push({
              text: text.trim(),
              fontSize,
              isBold
            });
          }
        }
      } else {
        // span이 없는 일반 텍스트
        const text = pContent
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        if (text) {
          segments.push({
            text,
            fontSize: '15px',
            isBold: false
          });
        }
      }
      
      // 세그먼트가 있는 경우만 문단 추가
      if (segments.length > 0) {
        paragraphs.push({ segments });
        console.log(`📝 문단 파싱 완료: ${segments.length}개 세그먼트`);
        segments.forEach(seg => console.log(`  - "${seg.text}" (${seg.fontSize}${seg.isBold ? ', 굵게' : ''})`));
      }
    }
    
    console.log(`✅ 총 ${paragraphs.length}개 문단 파싱 완료`);
    return paragraphs;
  }

  /**
   * 표 헤더 행 선택 (여러 방식 시도) - 백업 파일에서 완전 복사
   */
  static async selectTableHeaderRow(): Promise<boolean> {
    console.log('🎯 표 헤더 행 선택...');
    
    try {
      // 방법 1: 드래그 선택으로 첫 번째 행 전체 선택
      const dragSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const table = document.querySelector('.se-table-container table') || document.querySelector('table');
            if (!table) return { success: false, message: '표를 찾을 수 없음' };
            
            const firstRow = table.querySelector('tr:first-child');
            if (!firstRow) return { success: false, message: '첫 번째 행을 찾을 수 없음' };
            
            const firstCell = firstRow.querySelector('td:first-child');
            const lastCell = firstRow.querySelector('td:last-child');
            
            if (firstCell && lastCell) {
              // 드래그 시뮬레이션
              const rect1 = firstCell.getBoundingClientRect();
              const rect2 = lastCell.getBoundingClientRect();
              
              // 마우스 다운 이벤트 (첫 번째 셀)
              firstCell.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                clientX: rect1.left + 5,
                clientY: rect1.top + 5
              }));
              
              // 마우스 무브 이벤트 (마지막 셀로)
              document.dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true,
                clientX: rect2.right - 5,
                clientY: rect2.top + 5
              }));
              
              // 마우스 업 이벤트 (마지막 셀)
              lastCell.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                clientX: rect2.right - 5,
                clientY: rect2.top + 5
              }));
              
              console.log('드래그 선택 완료');
              return { success: true, method: 'drag' };
            }
            
            return { success: false, message: '셀을 찾을 수 없음' };
          } catch (error) {
            return { success: false, message: error.message };
          }
        })()
      `);
      
      if (dragSelectResult?.result?.success) {
        console.log('✅ 드래그로 헤더 행 선택 완료');
        await window.electronAPI.playwrightWaitTimeout(500);
        return true;
      }
      
      // 방법 2: 행 번호 클릭 (네이버 블로그에 행 번호가 있는 경우)
      const rowNumberSelectors = [
        '.se-table-container table tr:first-child th:first-child',
        '.se-table-container table tr:first-child .se-table-row-header'
      ];
      
      for (const selector of rowNumberSelectors) {
        const result = await window.electronAPI.playwrightClickInFrames(selector);
        if (result.success) {
          console.log('✅ 행 번호 클릭으로 헤더 행 선택 완료');
          return true;
        }
      }
      
      // 방법 3: 첫 번째 셀 클릭 후 Shift+End로 행 전체 선택
      const firstCellSelectors = [
        '.se-table-container table tr:first-child td:first-child',
        'table tbody tr:first-child td:first-child',
        'table tr:first-child td:first-child'
      ];
      
      for (const selector of firstCellSelectors) {
        const cellResult = await window.electronAPI.playwrightClickInFrames(selector);
        if (cellResult.success) {
          console.log('✅ 첫 번째 셀 클릭 완료, 행 전체 선택 시도...');
          
          // Shift+End 키 조합으로 행 전체 선택 시도
          const shiftSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                const cell = document.querySelector('${selector}');
                if (cell) {
                  cell.focus();
                  
                  // Shift + End 키 이벤트
                  const shiftEndEvent = new KeyboardEvent('keydown', {
                    key: 'End',
                    code: 'End',
                    shiftKey: true,
                    bubbles: true
                  });
                  cell.dispatchEvent(shiftEndEvent);
                  
                  return { success: true };
                }
                return { success: false };
              } catch (error) {
                return { success: false, message: error.message };
              }
            })()
          `);
          
          if (shiftSelectResult?.result?.success) {
            console.log('✅ Shift+End로 행 전체 선택 완료');
            return true;
          }
          
          // 단순 첫 번째 셀만 선택된 상태로 진행
          console.log('✅ 첫 번째 셀 선택 완료 (단일 셀)');
          return true;
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ 헤더 행 선택 실패: ${error}`);
    }
    
    return false;
  }

  /**
   * 표 셀 배경색 변경 (정확한 hex 코드 입력) - 백업 파일에서 완전 복사
   */
  static async changeTableCellBackgroundColor(color: string = '#e0e0e0'): Promise<boolean> {
    console.log(`🎨 표 셀 배경색 변경: ${color}`);
    
    try {
      // 1. 셀 배경색 버튼 클릭
      const cellBgButton = '.se-cell-background-color-toolbar-button';
      const buttonResult = await window.electronAPI.playwrightClickInFrames(cellBgButton);
      
      if (!buttonResult.success) {
        // 대체 셀렉터 시도
        const altSelectors = [
          'button[data-name="cell-background-color"]',
          '.se-property-toolbar-color-picker-button[data-name="cell-background-color"]'
        ];
        
        let altSuccess = false;
        for (const altSelector of altSelectors) {
          const altResult = await window.electronAPI.playwrightClickInFrames(altSelector);
          if (altResult.success) {
            console.log(`✅ 대체 셀 배경색 버튼 클릭 완료: ${altSelector}`);
            altSuccess = true;
            break;
          }
        }
        
        if (!altSuccess) {
          console.warn('⚠️ 셀 배경색 버튼을 찾을 수 없음');
          return false;
        }
      } else {
        console.log('✅ 셀 배경색 버튼 클릭 완료');
      }
      
      await window.electronAPI.playwrightWaitTimeout(500);
      
      // 2. 방법 1: 색상 팔레트에서 선택 시도
      const colorSelector = `.se-color-palette[data-color="${color}"]`;
      const colorResult = await window.electronAPI.playwrightClickInFrames(colorSelector);
      
      if (colorResult.success) {
        console.log(`✅ 팔레트에서 배경색 설정 완료: ${color}`);
        return true;
      }
      
      // 3. 방법 2: 더보기 → hex 입력 방식
      console.log('🔍 팔레트에서 색상을 찾지 못함, 더보기로 직접 입력 시도...');
      
      // 더보기 버튼 클릭
      const moreButtonResult = await window.electronAPI.playwrightClickInFrames('.se-color-picker-more-button');
      
      if (moreButtonResult.success) {
        console.log('✅ 더보기 버튼 클릭 완료');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // hex 입력 필드에 색상 코드 입력
        const hexInputResult = await window.electronAPI.playwrightEvaluateInFrames(`
          (function() {
            try {
              const hexInput = document.querySelector('.se-selected-color-hex');
              if (hexInput) {
                hexInput.click();
                hexInput.focus();
                hexInput.value = '${color}';
                
                // 이벤트 발생
                const events = ['input', 'change', 'keyup'];
                events.forEach(eventType => {
                  const event = new Event(eventType, { bubbles: true });
                  hexInput.dispatchEvent(event);
                });
                
                return { success: true };
              }
              return { success: false, message: 'hex 입력 필드를 찾을 수 없음' };
            } catch (error) {
              return { success: false, message: error.message };
            }
          })()
        `);
        
        if (hexInputResult?.result?.success) {
          console.log(`✅ hex 코드 입력 완료: ${color}`);
          await window.electronAPI.playwrightWaitTimeout(300);
          
          // 확인 버튼 클릭
          const applyButtonResult = await window.electronAPI.playwrightClickInFrames('.se-color-picker-apply-button');
          
          if (applyButtonResult.success) {
            console.log('✅ 색상 적용 확인 버튼 클릭 완료');
            return true;
          } else {
            console.warn('⚠️ 확인 버튼 클릭 실패');
          }
        } else {
          console.warn('⚠️ hex 코드 입력 실패');
        }
      } else {
        console.warn('⚠️ 더보기 버튼 클릭 실패');
      }
      
    } catch (error) {
      console.warn(`⚠️ 셀 배경색 변경 실패: ${error}`);
    }
    
    return false;
  }

  /**
   * 개별 헤더 셀에 스타일 적용 - 백업 파일에서 완전 복사
   */
  static async applyHeaderCellStyle(cellIndex: number, color: string = '#e0e0e0'): Promise<boolean> {
    console.log(`🎯 헤더 셀 ${cellIndex + 1} 스타일 적용...`);
    
    try {
      // 특정 헤더 셀 선택
      const cellSelectors = [
        `.se-table-container table tr:first-child td:nth-child(${cellIndex + 1})`,
        `table tbody tr:first-child td:nth-child(${cellIndex + 1})`,
        `table tr:first-child td:nth-child(${cellIndex + 1})`
      ];
      
      for (const selector of cellSelectors) {
        const cellResult = await window.electronAPI.playwrightClickInFrames(selector);
        if (cellResult.success) {
          console.log(`✅ 헤더 셀 ${cellIndex + 1} 선택 완료`);
          await window.electronAPI.playwrightWaitTimeout(200);
          
          // 배경색 변경
          const bgChanged = await this.changeTableCellBackgroundColor(color);
          await window.electronAPI.playwrightWaitTimeout(200);
          
          // 굵게 처리
          const boldApplied = await this.applyBold();
          await window.electronAPI.playwrightWaitTimeout(200);
          
          console.log(`✅ 헤더 셀 ${cellIndex + 1} 스타일 적용 완료 (배경: ${bgChanged}, 굵게: ${boldApplied})`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ 헤더 셀 ${cellIndex + 1} 스타일 적용 실패: ${error}`);
      return false;
    }
  }

  /**
   * 표 헤더 스타일 적용 (배경색 + 굵게) - 백업 파일에서 완전 복사
   */
  static async applyTableHeaderStyle(): Promise<boolean> {
    console.log('🎨 표 헤더 스타일 적용...');
    
    try {
      // 방법 1: 전체 행 선택 후 한 번에 적용
      const headerSelected = await this.selectTableHeaderRow();
      
      if (headerSelected) {
        console.log('✅ 헤더 행 전체 선택 완료, 스타일 적용 중...');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // 배경색 변경
        const bgChanged = await this.changeTableCellBackgroundColor('#e0e0e0');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // 텍스트 굵게 처리
        const boldApplied = await this.applyBold();
        
        console.log(`✅ 헤더 스타일 일괄 적용 완료 (배경: ${bgChanged}, 굵게: ${boldApplied})`);
        return true;
      }
      
      // 방법 2: 전체 행 선택 실패 시 개별 셀 적용
      console.log('⚠️ 헤더 행 전체 선택 실패, 개별 셀 스타일 적용으로 변경...');
      
      // 표의 첫 번째 행에서 셀 개수 확인
      const cellCountResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const firstRow = document.querySelector('.se-table-container table tr:first-child') || 
                            document.querySelector('table tr:first-child');
            if (firstRow) {
              const cells = firstRow.querySelectorAll('td');
              return { success: true, cellCount: cells.length };
            }
            return { success: false, cellCount: 0 };
          } catch (error) {
            return { success: false, cellCount: 0 };
          }
        })()
      `);
      
      const cellCount = cellCountResult?.result?.cellCount || 3; // 기본값 3개
      console.log(`📊 헤더 행 셀 개수: ${cellCount}`);
      
      // 각 셀에 개별적으로 스타일 적용
      let successCount = 0;
      for (let i = 0; i < cellCount; i++) {
        const cellSuccess = await this.applyHeaderCellStyle(i, '#e0e0e0');
        if (cellSuccess) {
          successCount++;
        }
        await window.electronAPI.playwrightWaitTimeout(300);
      }
      
      console.log(`✅ 헤더 스타일 개별 적용 완료: ${successCount}/${cellCount} 셀 성공`);
      return successCount > 0;
      
    } catch (error) {
      console.warn(`⚠️ 헤더 스타일 적용 실패: ${error}`);
      return false;
    }
  }

  /**
   * 네이버 블로그에 표 추가 (원하는 크기로 조정) - temp_original에서 완전 복사
   */
  static async addTable(rows: number = 3, cols: number = 3): Promise<boolean> {
    console.log(`📊 표 추가: ${rows}행 ${cols}열`);
    
    try {
      // 1단계: 표 추가 버튼 클릭 (기본 3x3 생성)
      const tableButtonResult = await window.electronAPI.playwrightClickInFrames('.se-table-toolbar-button');
      
      if (!tableButtonResult.success) {
        console.warn('⚠️ 표 추가 버튼 클릭 실패');
        return false;
      }
      
      console.log('✅ 기본 3x3 표 생성 완료');
      await window.electronAPI.playwrightWaitTimeout(1000);
      
      // 2단계: 필요한 경우 행 추가 (3행에서 target까지)
      if (rows > 3) {
        const rowsToAdd = rows - 3;
        console.log(`📏 ${rowsToAdd}개 행 추가 중...`);
        
        for (let i = 0; i < rowsToAdd; i++) {
          // 마지막 행의 "행 추가" 버튼 클릭
          const addRowResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 행 컨트롤바에서 마지막 행의 "행 추가" 버튼 찾기
                const rowControlbar = document.querySelector('.se-cell-controlbar-row');
                if (rowControlbar) {
                  const lastRowItem = rowControlbar.lastElementChild;
                  if (lastRowItem) {
                    const addButton = lastRowItem.querySelector('.se-cell-add-button');
                    if (addButton) {
                      addButton.click();
                      console.log('행 추가 버튼 클릭');
                      return { success: true };
                    }
                  }
                }
                return { success: false, error: '행 추가 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `);
          
          if (addRowResult?.result?.success) {
            console.log(`✅ 행 ${i + 1} 추가 완료`);
            await window.electronAPI.playwrightWaitTimeout(500);
          } else {
            console.warn(`⚠️ 행 ${i + 1} 추가 실패`);
          }
        }
      }
      
      // 3단계: 필요한 경우 열 추가 (3열에서 target까지)
      if (cols > 3) {
        const colsToAdd = cols - 3;
        console.log(`📏 ${colsToAdd}개 열 추가 중...`);
        
        for (let i = 0; i < colsToAdd; i++) {
          // 마지막 열의 "열 추가" 버튼 클릭
          const addColResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 열 컨트롤바에서 마지막 열의 "열 추가" 버튼 찾기
                const colControlbar = document.querySelector('.se-cell-controlbar-column');
                if (colControlbar) {
                  const lastColItem = colControlbar.lastElementChild;
                  if (lastColItem) {
                    const addButton = lastColItem.querySelector('.se-cell-add-button');
                    if (addButton) {
                      addButton.click();
                      console.log('열 추가 버튼 클릭');
                      return { success: true };
                    }
                  }
                }
                return { success: false, error: '열 추가 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `);
          
          if (addColResult?.result?.success) {
            console.log(`✅ 열 ${i + 1} 추가 완료`);
            await window.electronAPI.playwrightWaitTimeout(500);
          } else {
            console.warn(`⚠️ 열 ${i + 1} 추가 실패`);
          }
        }
      }
      
      console.log(`✅ ${rows}행 ${cols}열 표 생성 완료`);
      return true;
      
    } catch (error) {
      console.warn(`⚠️ 표 추가 실패: ${error}`);
      return false;
    }
  }

  /**
   * 표 셀에 텍스트 입력 (정확한 네이버 구조 기반) - temp_original에서 완전 복사
   */
  static async inputTableCell(text: string, rowIndex: number, colIndex: number): Promise<boolean> {
    console.log(`📝 표 셀 입력: (${rowIndex}, ${colIndex}) - "${text}"`);
    
    try {
      // 표 셀 클릭 및 텍스트 입력
      const inputResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            // 네이버 블로그 표 구조에 맞는 셀 찾기
            const table = document.querySelector('.se-table-content');
            if (!table) {
              return { success: false, error: '표를 찾을 수 없음' };
            }
            
            const rows = table.querySelectorAll('tr.se-tr');
            if (rows.length <= ${rowIndex}) {
              return { success: false, error: '행 인덱스 초과: ${rowIndex}' };
            }
            
            const targetRow = rows[${rowIndex}];
            const cells = targetRow.querySelectorAll('td.se-cell');
            if (cells.length <= ${colIndex}) {
              return { success: false, error: '열 인덱스 초과: ${colIndex}' };
            }
            
            const targetCell = cells[${colIndex}];
            
            // 셀 클릭
            targetCell.click();
            targetCell.focus();
            
            // 셀 내부의 span.__se-node 요소 찾기
            const spanElement = targetCell.querySelector('span.__se-node');
            if (spanElement) {
              // 기존 내용 지우고 새 텍스트 입력
              spanElement.textContent = '${text.replace(/'/g, "\\'")}';
              spanElement.innerText = '${text.replace(/'/g, "\\'")}';
              
              // 이벤트 발생
              spanElement.focus();
              const events = ['input', 'change', 'keyup', 'blur'];
              events.forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                spanElement.dispatchEvent(event);
              });
              
              return { success: true };
            } else {
              return { success: false, error: 'span.__se-node 요소를 찾을 수 없음' };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      if (inputResult?.result?.success) {
        console.log(`✅ 표 셀 입력 완료: "${text}"`);
        await window.electronAPI.playwrightWaitTimeout(200);
        return true;
      } else {
        console.warn(`⚠️ 표 셀 입력 실패: ${inputResult?.result?.error}`);
        return false;
      }
    } catch (error) {
      console.warn(`⚠️ 표 셀 입력 실패: ${error}`);
      return false;
    }
  }

  /**
   * Step2 표 데이터 파싱
   */
  static parseTableData(tableContent: string): { rows: number; cols: number; data: string[][] } | null {
    try {
      console.log('📊 표 내용 파싱 시작...');
      
      // tr 태그별로 행 찾기
      const rowRegex = /<tr[^>]*class="se-tr"[^>]*>(.*?)<\/tr>/g;
      const rows: string[][] = [];
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        
        // td 태그별로 셀 찾기
        const cellRegex = /<td[^>]*>(.*?)<\/td>/g;
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellContent = cellMatch[1];
          
          // 셀 내부의 텍스트 추출 (span 태그 내부)
          const textRegex = /<span[^>]*__se-node[^>]*>(.*?)<\/span>/g;
          const textMatch = textRegex.exec(cellContent);
          const cellText = textMatch ? textMatch[1].trim() : '';
          
          cells.push(cellText);
        }
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      
      if (rows.length > 0) {
        const tableData = {
          rows: rows.length,
          cols: rows[0].length,
          data: rows
        };
        
        console.log(`✅ 표 파싱 완료: ${tableData.rows}행 ${tableData.cols}열`);
        console.log('📋 표 데이터:', tableData.data);
        
        return tableData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 표 파싱 실패:', error);
      return null;
    }
  }
}