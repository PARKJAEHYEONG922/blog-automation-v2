import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import WorkSummary from './WorkSummary';
import ImageGenerator from './ImageGenerator';
import NaverPublishUI from '@/03-publish/platforms/NaverPublishUI';
import { ContentProcessor } from '@/02-generation/services/content-processor';
import { BlogWritingService } from '@/shared/services/content/blog-writing-service';
import Button from '@/shared/components/ui/Button';
import '@/shared/types/electron.types';
import { useDialog } from '@/app/DialogContext';
import { useWorkflow } from '@/app/WorkflowContext';

const Step2Generation: React.FC = () => {
  const { showAlert } = useDialog();
  const { workflowData, prevStep, reset } = useWorkflow();

  // WorkflowContext에서 필요한 데이터 추출
  const setupData = workflowData;
  const content = workflowData.generatedContent || '';
  const onGoBack = prevStep;
  const onReset = reset;

  // AI 모델 상태
  const [aiModelStatus, setAiModelStatus] = useState({
    writing: '미설정',
    image: '미설정'
  });

  // 모델 상태 새로고침 함수
  const refreshModelStatus = useCallback(async () => {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings) {
        const { writing, image } = llmSettings.appliedSettings;

        setAiModelStatus({
          writing: writing?.provider && writing?.model ?
            `${writing.provider} ${writing.model}` : '미설정',
          image: image?.provider && image?.model ?
            `${image.provider} ${image.model}` : '미설정'
        });
      }
    } catch (error) {
      console.error('모델 상태 확인 실패:', error);
    }
  }, []);

  // 초기화 시 모델 상태 로드
  useEffect(() => {
    refreshModelStatus();
  }, [refreshModelStatus]);

  // AI 설정 변경 이벤트 리스너
  useEffect(() => {
    const handleSettingsChanged = () => {
      refreshModelStatus();
    };

    window.addEventListener('app-llm-settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('app-llm-settings-changed', handleSettingsChanged);
    };
  }, [refreshModelStatus]);

  const editorRef = useRef<HTMLDivElement>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [charCount, setCharCount] = useState(0);
  const [charCountWithSpaces, setCharCountWithSpaces] = useState(0);
  const [currentFontSize, setCurrentFontSize] = useState('15px');
  
  // v2와 동일한 폰트 크기 옵션
  const fontSizes = [
    { name: '대제목 (24px)', size: '24px', weight: 'bold' },
    { name: '소제목 (19px)', size: '19px', weight: 'bold' },
    { name: '강조 (16px)', size: '16px', weight: 'bold' },
    { name: '일반 (15px)', size: '15px', weight: 'normal' }
  ];
  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [images, setImages] = useState<{[key: string]: string}>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageAIInfo, setImageAIInfo] = useState<string>('확인 중...');
  const [activeTab, setActiveTab] = useState<'original' | 'edited'>('edited');
  const [imagePrompts, setImagePrompts] = useState<any[]>([]);
  
  // 이미지 프롬프트 재생성 관련 상태
  const [isRegeneratingPrompts, setIsRegeneratingPrompts] = useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);
  
  // 수정된 글 가져오기 관련 상태
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);
  
  // 발행 플랫폼 선택 상태
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  
  // 이미지 변경 콜백 메모이제이션
  const handleImagesChange = useCallback((newImages: { [key: string]: string }) => {
    setImages(newImages);
  }, []);
  
  // 컴포넌트 마운트 시 스크롤을 최상단으로 이동
  useEffect(() => {
    const scrollableContainer = document.querySelector('main > div');
    const mainElement = document.querySelector('main');
    
    if (scrollableContainer) {
      scrollableContainer.scrollTop = 0;
    } else if (mainElement) {
      mainElement.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, []);


  // v2 Step3와 완전히 동일한 마크다운 처리 함수들

  // 이미지 번호 매기기 함수
  const addImageNumbers = (content: string): string => {
    let numberedContent = content;
    let imageCount = 1;
    
    // (이미지)를 (이미지1), (이미지2) 등으로 변경
    numberedContent = numberedContent.replace(/\(이미지\)/g, () => {
      return `(이미지${imageCount++})`;
    });
    
    return numberedContent;
  };
  
  // 마크다운 테이블을 네이버 블로그 테이블로 변환
  const convertMarkdownTable = (tableLines: string[]): string => {
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
  };
  
  // 긴 텍스트를 28자 기준으로 재귀적으로 자르는 함수
  const breakLongText = (text: string): string[] => {
    // 해시태그가 포함된 줄은 자르지 않음 (태그들을 한 줄에 유지)
    if (text.includes('#')) {
      return [text];
    }
    
    // 마크다운 제거하여 실제 텍스트 길이 계산
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    if (plainText.length <= 28) {
      return [text]; // 28자 이하면 그대로 반환
    }
    
    // 15-28자 구간에서 자를 위치 찾기
    let cutPosition = -1;
    
    // 1순위: 마침표
    for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
      if (plainText[i] === '.') {
        cutPosition = i + 1;
        break;
      }
    }
    
    // 2순위: 쉼표 (마침표를 못 찾은 경우만)
    if (cutPosition === -1) {
      for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
        if (plainText[i] === ',') {
          cutPosition = i + 1;
          break;
        }
      }
    }
    
    // 3순위: 접속사 (마침표, 쉼표를 못 찾은 경우만)
    if (cutPosition === -1) {
      for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
        const remaining = plainText.substring(i);
        if (remaining.startsWith('그리고') || remaining.startsWith('하지만') || 
            remaining.startsWith('또한') || remaining.startsWith('따라서') ||
            remaining.startsWith('그런데') || remaining.startsWith('그러나') ||
            remaining.startsWith('그래서') || remaining.startsWith('또는') ||
            remaining.startsWith('그러면') || remaining.startsWith('그럼') ||
            remaining.startsWith('이제') || remaining.startsWith('이때') ||
            remaining.startsWith('반면') || remaining.startsWith('한편') ||
            remaining.startsWith('예를 들어') || remaining.startsWith('특히') ||
            remaining.startsWith('특별히')) {
          cutPosition = i;
          break;
        }
      }
    }
    
    // 4순위: 공백 (다른 구분자를 못 찾은 경우만)
    if (cutPosition === -1) {
      for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
        if (plainText[i] === ' ') {
          cutPosition = i;
        }
      }
    }
    
    if (cutPosition > 0) {
      // 원본 텍스트(마크다운 포함)에서 해당 위치로 자르기
      let realCutPosition = 0;
      let plainCount = 0;
      let i = 0;
      
      while (i < text.length && plainCount < cutPosition) {
        if (text.substring(i, i + 2) === '**') {
          // 마크다운 태그는 건너뛰기
          realCutPosition = i + 2;
          i += 2;
        } else {
          // 일반 문자는 카운트
          plainCount++;
          realCutPosition = i + 1;
          i++;
        }
      }
      
      // 마크다운 태그 중간에서 자르는 것 방지
      let markdownCount = 0;
      for (let j = 0; j < realCutPosition; j++) {
        if (text.substring(j, j + 2) === '**') {
          markdownCount++;
          j++; // ** 두 글자이므로 하나 더 건너뛰기
        }
      }
      
      // 홀수 개의 ** 태그가 있으면 마크다운 내부이므로 조정
      if (markdownCount % 2 === 1) {
        // 다음 ** 태그 뒤로 이동
        while (realCutPosition < text.length - 1) {
          if (text.substring(realCutPosition, realCutPosition + 2) === '**') {
            realCutPosition += 2;
            break;
          }
          realCutPosition++;
        }
      }
      
      const firstPart = text.substring(0, realCutPosition).trim();
      const secondPart = text.substring(realCutPosition).trim();
      
      // 재귀적으로 두 번째 부분도 처리
      const restParts = breakLongText(secondPart);
      
      return [firstPart, ...restParts];
    } else {
      // 자를 위치를 못 찾으면 그대로 반환
      return [text];
    }
  };
  
  // v2와 완전히 동일한 마크다운 처리 메인 함수
  const processMarkdown = (content: string): string => {
    
    // 먼저 콘텐츠 정리
    const cleanedContent = cleanAIGeneratedContent(content);
    
    // 이미지 플레이스홀더에 번호 매기기
    const numberedContent = addImageNumbers(cleanedContent);
    
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
          result.push(convertMarkdownTable(tableLines));
          i = j;
          continue;
        }
      }
      
      // 일반 텍스트 처리
      if (line.trim().match(/^#\s+/) && !line.trim().startsWith('## ')) {
        // 단일 # 제목은 제거 (# 다음에 공백이 있는 마크다운 제목만)
        // 해시태그들 (#태그1 #태그2)은 공백 없이 연결되므로 제거되지 않음
      } else if (line.trim().startsWith('## ')) {
        const text = line.substring(line.indexOf('## ') + 3);
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs24" style="color: rgb(0, 0, 0); font-weight: bold;">${text}</span></p>`);
      } else if (line.trim().startsWith('### ')) {
        const text = line.substring(line.indexOf('### ') + 4);
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs19" style="color: rgb(0, 0, 0); font-weight: bold;">${text}</span></p>`);
      } else if (line.trim() === '') {
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">&nbsp;</span></p>`);
      } else if (line.trim().match(/^(\d+\.|[-•*]\s+|✓\s+|[①-⑳]\s+|[가-힣]\.\s+)/)) {
        // 모든 리스트 항목 처리 - 줄바꿈 금지
        let text = line.trim();
        // **강조** 처리만 적용하고 문장별 개행은 하지 않음
        text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="se-ff-nanumgothic se-fs16" style="color: rgb(0, 0, 0); font-weight: bold;">$1</span>');
        result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${text}</span></p>`);
      } else {        
        // 일반 텍스트 처리 (28자 이상이면 재귀적으로 자르기)
        const processedLines = breakLongText(line.trim());
        for (const textLine of processedLines) {
          let processedLine = textLine.replace(/\*\*([^*]+)\*\*/g, '<span class="se-ff-nanumgothic se-fs16" style="color: rgb(0, 0, 0); font-weight: bold;">$1</span>');
          result.push(`<p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">${processedLine}</span></p>`);
        }
      }
      
      i++;
    }
    
    const finalResult = result.join('');
    return finalResult;
  };

  // 이미지 AI 설정 정보 가져오기
  useEffect(() => {
    const loadImageAIInfo = async () => {
      try {
        const llmSettings = await window.electronAPI?.getLLMSettings?.();
        if (llmSettings?.appliedSettings?.image) {
          const { provider, model } = llmSettings.appliedSettings.image;
          if (provider && model) {
            setImageAIInfo(`✅ ${provider} ${model}`);
          } else {
            setImageAIInfo('❌ 미설정');
          }
        } else {
          setImageAIInfo('❌ 미설정');
        }
      } catch (error) {
        console.error('이미지 AI 설정 확인 실패:', error);
        setImageAIInfo('❌ 확인 실패');
      }
    };
    
    loadImageAIInfo();
  }, []);

  const generateImagePrompts = async () => {
    if (imagePrompts.length === 0) {
      showAlert({ type: 'error', message: '이미지 프롬프트가 없습니다. 1단계에서 이미지 프롬프트 생성이 실패했을 수 있습니다.' });
      return;
    }

    setIsGeneratingImages(true);

    try {
      console.log(`🎨 이미지 생성 시작: ${imagePrompts.length}개 프롬프트 사용`);

      // 1단계에서 생성된 각 프롬프트로 이미지 생성
      const generatedImages: {[key: string]: string} = {};

      for (let i = 0; i < imagePrompts.length; i++) {
        const imagePrompt = imagePrompts[i];
        const imageKey = `이미지${i + 1}`;

        console.log(`🖼️ 이미지 ${i + 1} 생성 중... 프롬프트: ${imagePrompt.prompt.substring(0, 50)}...`);

        const imageUrl = await window.electronAPI.generateImage(imagePrompt.prompt);
        generatedImages[imageKey] = imageUrl;

        console.log(`✅ 이미지 ${i + 1} 생성 완료`);
      }

      setImages(generatedImages);
      console.log(`🎉 모든 이미지 생성 완료: ${Object.keys(generatedImages).length}개`);

    } catch (error) {
      console.error('❌ 이미지 생성 실패:', error);
      showAlert({ type: 'error', message: `이미지 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const replaceImagesInContent = () => {
    let finalContent = editedContent;
    
    imagePositions.forEach((imageKey, index) => {
      const imageUrl = images[imageKey];
      if (imageUrl) {
        // 첫 번째 (이미지)를 실제 이미지로 교체
        finalContent = finalContent.replace('(이미지)', `![${imageKey}](${imageUrl})`);
      }
    });
    
    return finalContent;
  };

  const handlePublish = () => {
    if (!selectedPlatform) {
      showAlert({ type: 'warning', message: '발행할 플랫폼을 선택해주세요.' });
      return;
    }

    const finalContent = replaceImagesInContent();

    if (selectedPlatform === 'naver') {
      // v2의 네이버 블로그 발행 로직 재사용
      window.electronAPI.publishToBlog(finalContent);
    } else {
      showAlert({ type: 'info', message: `${getPlatformName(selectedPlatform)} 발행 기능은 곧 구현될 예정입니다.` });
    }
  };
  
  // 플랫폼 이름 반환 함수
  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case 'naver': return '네이버 블로그';
      case 'tistory': return '티스토리';
      case 'wordpress': return '워드프레스';
      case 'google': return '구글 블로그';
      default: return '선택된 플랫폼';
    }
  };

  // v2와 동일한 글자 수 계산
  const updateCharCount = () => {
    if (editorRef.current) {
      const textContent = editorRef.current.innerText || '';
      const textContentNoSpaces = textContent.replace(/\s+/g, '');
      
      setCharCount(textContentNoSpaces.length);
      setCharCountWithSpaces(textContent.length);
    }
  };

  // v2와 동일한 콘텐츠 변경 처리
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditedContent(newContent);
      updateCharCount();
    }
  };

  // v2와 동일한 원본 복원 처리
  const restoreOriginal = () => {
    if (originalContent) {
      const processedContent = processMarkdown(originalContent);
      setEditedContent(processedContent);
      setIsInitialLoad(true); // 복원 시에는 다시 초기화 허용
    }
  };

  // v2와 동일한 클립보드 복사
  const copyToClipboard = async (): Promise<boolean> => {
    if (!editorRef.current) {
      console.error('에디터 참조를 찾을 수 없습니다');
      throw new Error('에디터 참조를 찾을 수 없습니다');
    }

    try {
      // 먼저 포커스를 주어 Document focus 문제 해결
      editorRef.current.focus();
      
      // 약간의 지연을 두어 포커스가 완전히 적용되도록 함
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // 최신 Clipboard API 사용 시도
      try {
        const htmlContent = editorRef.current.innerHTML;
        const textContent = editorRef.current.textContent || '';
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' })
          })
        ]);
        
        selection?.removeAllRanges();
        console.log('✅ HTML 형식으로 클립보드에 복사되었습니다!');
        return true;
      } catch (clipboardError) {
        console.warn('최신 Clipboard API 실패, 구형 방법 시도:', clipboardError);
        
        // 구형 execCommand 방법으로 폴백
        const success = document.execCommand('copy');
        selection?.removeAllRanges();
        
        if (success) {
          console.log('✅ 구형 방법으로 클립보드에 복사되었습니다!');
          return true;
        } else {
          throw new Error('복사 명령 실패');
        }
      }
    } catch (error) {
      console.error('❌ 복사 실패:', error);
      throw error;
    }
  };

  // v2와 동일한 폰트 크기 변경 처리
  const handleFontSizeChange = (newSize: string) => {
    applyFontSizeToSelection(newSize);
    setCurrentFontSize(newSize);
  };

  // v2와 동일한 선택된 텍스트에 폰트 크기 적용
  const applyFontSizeToSelection = (fontSize: string) => {
    if (!editorRef.current) return;
    
    const fontInfo = fontSizes.find(f => f.size === fontSize);
    if (!fontInfo) return;

    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // 선택된 텍스트가 있는 경우만 처리
    if (selection.toString().length > 0) {
      // execCommand 사용하되 즉시 정리
      document.execCommand('fontSize', false, '7'); // 임시 크기
      
      // 생성된 font 태그들을 span으로 교체
      const fontTags = editorRef.current.querySelectorAll('font[size="7"]');
      
      fontTags.forEach(fontTag => {
        const selectedText = fontTag.textContent || '';
        
        // 새로운 span 생성
        const newSpan = document.createElement('span');
        newSpan.className = `se-ff-nanumgothic se-fs${fontSize.replace('px', '')}`;
        newSpan.style.color = 'rgb(0, 0, 0)';
        
        // font-weight 설정
        if (fontInfo.weight === 'bold') {
          newSpan.style.fontWeight = 'bold';
        } else {
          newSpan.style.fontWeight = 'normal';
        }
        
        newSpan.textContent = selectedText;
        
        // font 태그를 새 span으로 교체
        fontTag.parentNode?.replaceChild(newSpan, fontTag);
      });
      
      handleContentChange();
    }
  };

  // v2와 동일한 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 폰트 크기 단축키
    if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const sizes = ['24px', '19px', '16px', '15px'];
      const newSize = sizes[parseInt(e.key) - 1];
      handleFontSizeChange(newSize);
    }
  };

  // v2와 동일한 클릭 이벤트 처리
  const handleClick = () => {
    updateCharCount();
  };

  // v2와 동일한 초기 콘텐츠 로딩
  useEffect(() => {
    if (content) {
      // 원본 콘텐츠 저장
      setOriginalContent(content);
      
      // 자동편집 콘텐츠 생성 (네이버 블로그용 HTML) - v2와 동일한 방식
      const processedContent = processMarkdown(content);
      setEditedContent(processedContent);
      
      // 이미지 위치 감지 (원본 마크다운에서)
      const imageInfo = ContentProcessor.processImages(content);
      setImagePositions(imageInfo.imagePositions);
    }
  }, [content]);

  // 편집된 콘텐츠가 변경될 때 에디터에 반영 (초기 로딩 시에만)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (editedContent && editorRef.current && isInitialLoad) {
      editorRef.current.innerHTML = editedContent;
      // DOM 업데이트 완료 후 글자 수 계산
      setTimeout(() => {
        updateCharCount();
      }, 100);
      setIsInitialLoad(false);
    }
  }, [editedContent, isInitialLoad]);

  // activeTab이 'edited'로 변경될 때도 에디터에 콘텐츠 반영
  useEffect(() => {
    if (activeTab === 'edited' && editedContent && editorRef.current) {
      editorRef.current.innerHTML = editedContent;
      // 약간의 지연 후 글자 수 업데이트 (DOM 업데이트 완료 후)
      setTimeout(() => {
        updateCharCount();
      }, 100);
    }
  }, [activeTab]);

  // 1단계에서 전달된 이미지 프롬프트들 초기화
  useEffect(() => {
    console.log('🔍 useEffect - setupData.imagePrompts:', setupData.imagePrompts);
    console.log('🔍 useEffect - Array.isArray?', Array.isArray(setupData.imagePrompts));
    console.log('🔍 useEffect - length:', setupData.imagePrompts?.length);

    if (setupData.imagePrompts && setupData.imagePrompts.length > 0) {
      console.log(`📋 1단계에서 생성된 이미지 프롬프트 ${setupData.imagePrompts.length}개 로드됨`);
      setImagePrompts(setupData.imagePrompts);
      setImagePromptError(null);
    } else if (setupData.imagePromptGenerationFailed) {
      console.warn('⚠️ 1단계에서 이미지 프롬프트 생성 실패');
      setImagePromptError('1단계에서 이미지 프롬프트 생성에 실패했습니다.');
    } else {
      console.warn('⚠️ imagePrompts가 없거나 빈 배열입니다');
    }
  }, [setupData.imagePrompts, setupData.imagePromptGenerationFailed]);

  // 이미지 프롬프트 재생성 함수
  const regenerateImagePrompts = async () => {
    // 현재 원본 콘텐츠를 사용 (수정된 글이 있다면 그것을, 아니면 초기 콘텐츠를)
    const currentContent = originalContent || content;
    if (!currentContent || isRegeneratingPrompts) return;

    setIsRegeneratingPrompts(true);
    setImagePromptError(null);
    
    try {
      console.log('🔄 이미지 프롬프트 재생성 시작');
      const result = await BlogWritingService.generateImagePrompts(currentContent);
      
      if (result.success && result.imagePrompts && result.imagePrompts.length > 0) {
        console.log(`✅ 이미지 프롬프트 재생성 성공: ${result.imagePrompts.length}개`);
        setImagePrompts(result.imagePrompts);
        setImagePromptError(null);
      } else {
        console.warn('⚠️ 이미지 프롬프트 재생성 실패:', result.error);
        setImagePromptError(result.error || '이미지 프롬프트 재생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 이미지 프롬프트 재생성 중 오류:', error);
      setImagePromptError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsRegeneratingPrompts(false);
    }
  };

  // 수정된 글 가져오기 함수
  const handleRefreshContent = async () => {
    if (isRefreshingContent) return;
    
    setIsRefreshingContent(true);
    
    try {
      console.log('🔄 Claude Web에서 수정된 글 가져오기 시작');
      
      // Claude Web에서 다시 다운로드  
      const newContent = await window.electronAPI.downloadFromClaude();
      
      if (newContent && newContent.trim()) {
        console.log('✅ 수정된 글 가져오기 성공');
        
        // 원본 및 편집 콘텐츠 업데이트
        setOriginalContent(newContent);
        
        // 새로운 콘텐츠로 마크다운 처리
        const processedContent = processMarkdown(newContent);
        setEditedContent(processedContent);
        
        // 이미지 위치 재감지
        const imageInfo = ContentProcessor.processImages(newContent);
        setImagePositions(imageInfo.imagePositions);
        
        // 기존 이미지와 프롬프트 초기화 (새로운 글이므로)
        setImages({});
        setImagePrompts([]);
        
        // 이미지 프롬프트 오류 상태 설정 (재생성 필요)
        const hasImageTags = newContent.match(/\(이미지\)|\[이미지\]/g);
        const expectedImageCount = hasImageTags ? hasImageTags.length : 0;
        
        if (expectedImageCount > 0) {
          setImagePromptError('새로운 글로 업데이트되었습니다. 이미지 프롬프트를 재생성해주세요.');
        } else {
          setImagePromptError(null);
        }
        
        // 편집기 초기화 플래그 설정
        setIsInitialLoad(true);
        
        console.log(`📊 새 글 통계: ${newContent.length}자, 예상 이미지: ${expectedImageCount}개`);
        
      } else {
        throw new Error('Claude Web에서 빈 콘텐츠가 반환되었습니다.');
      }
      
    } catch (error) {
      console.error('❌ 수정된 글 가져오기 실패:', error);
      showAlert({ type: 'error', message: `수정된 글 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\nClaude Web에서 마크다운을 다시 복사해보세요.` });
    } finally {
      setIsRefreshingContent(false);
    }
  };

  // 콘텐츠 통계는 편집기에서 실시간 계산하므로 제거

  // v2와 동일한 CSS 스타일
  const sectionStyles = `
    .section-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .section-icon.blue {
      background-color: #dbeafe;
      color: #1d4ed8;
    }
    
    .section-icon.purple {
      background-color: #ede9fe;
      color: #7c3aed;
    }
    
    .section-title {
      margin: 0;
      font-weight: 600;
      color: #1f2937;
    }
  `;

  return (
    <div className="max-w-6xl mx-auto min-h-screen bg-gray-50 p-6">
      <style>{sectionStyles}</style>
      {/* 작업 요약 */}
      <WorkSummary 
        setupData={setupData}
        charCount={charCount}
        charCountWithSpaces={charCountWithSpaces}
        imageCount={imagePositions.length}
        imageAIInfo={imageAIInfo}
        onRefreshContent={handleRefreshContent}
        isRefreshingContent={isRefreshingContent}
      />

      {/* 콘텐츠 편집기 - v2 Step3 스타일 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-base">
              📝
            </div>
            <h2 className="text-base font-semibold text-gray-900">콘텐츠 편집</h2>
          </div>
          {/* 헤더 오른쪽에 글자 수 표시 */}
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
            📊 글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        </div>
        
        {/* v2 Step3와 완전 동일한 편집기 UI */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '12px'
        }}>
          {/* 탭 버튼들 */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setActiveTab('edited')}
              style={{
                backgroundColor: activeTab === 'edited' ? '#3b82f6' : 'transparent',
                color: activeTab === 'edited' ? 'white' : '#6b7280',
                borderTop: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderLeft: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderRight: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📝 자동편집 콘텐츠
            </button>
            <button
              onClick={() => setActiveTab('original')}
              style={{
                backgroundColor: activeTab === 'original' ? '#3b82f6' : 'transparent',
                color: activeTab === 'original' ? 'white' : '#6b7280',
                borderTop: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderLeft: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderRight: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📄 원본 콘텐츠
            </button>
          </div>

          {/* 기능 버튼 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTab === 'edited' && (
              <>
                <select
                  value={currentFontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {fontSizes.map((font) => (
                    <option key={font.size} value={font.size}>
                      {font.name}
                    </option>
                  ))}
                </select>
                
                {/* v2와 동일한 강제 적용 버튼 */}
                <button
                  onClick={() => handleFontSizeChange(currentFontSize)}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="현재 폰트 크기로 선택 영역 통일"
                >
                  🔄
                </button>

                <button
                  onClick={restoreOriginal}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 원본 복원
                </button>
                
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  📋 복사
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 글자 수 표시 */}
        {activeTab === 'edited' && (
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        )}

        {/* v2와 완전 동일한 편집기 */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0 8px 8px 8px',
          backgroundColor: '#ffffff',
          minHeight: '400px'
        }}>
          {activeTab === 'edited' ? (
            <div
              ref={editorRef}
              id="step3-editor"
              contentEditable
              style={{
                width: '100%',
                minHeight: '400px',
                maxHeight: '600px',
                padding: '16px',
                border: 'none',
                borderRadius: '0 8px 8px 8px',
                fontSize: '15px',
                lineHeight: '1.8',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: 'white',
                position: 'relative',
                zIndex: 1,
                overflowY: 'auto',
                outline: 'none'
              }}
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              suppressContentEditableWarning={true}
            />
          ) : (
            <div 
              style={{
                padding: '20px',
                fontSize: '15px',
                lineHeight: '1.7',
                height: '500px',
                maxHeight: '500px',
                overflowY: 'auto',
                color: '#374151',
                backgroundColor: '#f9fafb',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid #e5e7eb'
              }}
            >
              {originalContent || '원본 콘텐츠가 없습니다.'}
            </div>
          )}
        </div>

        {/* v2와 동일한 CSS 스타일 */}
        <style>{`
          .se-text-paragraph {
            margin: 0;
            padding: 0;
            line-height: 1.8;
          }
          .se-text-paragraph-align-left {
            text-align: left;
          }
          .se-text-paragraph-align-center {
            text-align: center;
          }
          .se-ff-nanumgothic {
            font-family: "Nanum Gothic", "나눔고딕", "돋움", Dotum, Arial, sans-serif;
          }
          .se-fs15 {
            font-size: 15px !important;
          }
          .se-fs16 {
            font-size: 16px !important;
          }
          .se-fs19 {
            font-size: 19px !important;
          }
          .se-fs24 {
            font-size: 24px !important;
          }
          .se-component {
            margin: 16px 0;
          }
          .se-table {
            width: 100%;
          }
          .se-table-content {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
          }
          .se-cell {
            border: 1px solid #ddd;
            padding: 8px;
            vertical-align: top;
          }
          .se-tr {
            border: none;
          }
          .se-module-text {
            margin: 0;
            padding: 0;
          }
          #step3-editor:focus {
            outline: 2px solid #3b82f6;
            outline-offset: -2px;
          }
        `}</style>

        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
          💡 <strong>편집 팁:</strong> 텍스트 선택 후 폰트 크기 변경 | 네이버 블로그 완전 호환 방식 | Ctrl+1~4로 폰트 크기 단축키
        </div>
      </div>

      {/* 이미지 프롬프트 재생성 섹션 (오류 시에만 표시) */}
      {(imagePromptError || (imagePositions.length > 0 && imagePrompts.length === 0)) && (
        <div className="section-card" style={{padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
          <div className="section-header" style={{marginBottom: '16px'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-icon" style={{
                width: '32px', 
                height: '32px', 
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}>⚠️</div>
              <h2 className="section-title" style={{fontSize: '16px', margin: '0', lineHeight: '1', color: '#dc2626'}}>
                이미지 프롬프트 생성 오류
              </h2>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#7f1d1d', 
              marginBottom: '8px',
              backgroundColor: '#fef7f7',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              {imagePromptError || '이미지 프롬프트가 생성되지 않았습니다. 글에는 이미지 태그가 있지만 프롬프트가 생성되지 않았습니다.'}
            </div>
            
            <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
              💡 <strong>해결 방법:</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>API 설정에서 다른 AI 제공자로 변경 후 재생성 시도</li>
                <li>현재 설정 그대로 재생성 시도 (일시적 오류일 경우)</li>
                <li>수동으로 이미지 업로드하여 사용</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                onClick={regenerateImagePrompts}
                disabled={isRegeneratingPrompts}
                loading={isRegeneratingPrompts}
                variant="danger"
                className="flex items-center gap-2"
              >
                🔄 이미지 프롬프트 재생성
              </Button>
              
              <span style={{ fontSize: '12px', color: '#7f1d1d' }}>
                {isRegeneratingPrompts ? '프롬프트 재생성 중...' : 'API 설정을 변경한 후 재생성하면 더 성공 가능성이 높습니다'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 생성 섹션 */}
      <ImageGenerator
        imagePositions={imagePositions}
        imagePrompts={imagePrompts}
        onImagesChange={handleImagesChange}
        aiModelStatus={aiModelStatus}
      />


      {/* 발행 플랫폼 선택 섹션 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-base">
            🚀
          </div>
          <h2 className="text-base font-semibold text-gray-900">발행 플랫폼 선택</h2>
        </div>
        
        <div className="flex items-center space-x-4 mb-3">
          <label className="text-sm font-medium text-gray-700 min-w-[100px]">
            발행할 블로그:
          </label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer min-w-[200px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          >
            <option value="" disabled>플랫폼을 선택해주세요</option>
            <option value="naver">🟢 네이버 블로그</option>
            <option value="tistory">🟠 티스토리</option>
            <option value="wordpress">🔵 워드프레스</option>
            <option value="google">🔴 구글 블로그</option>
          </select>
        </div>
        
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <span>💡</span>
          <span>네이버 블로그 발행 기능이 구현되어 있습니다. 다른 플랫폼은 순차적으로 구현 예정입니다.</span>
        </div>
      </div>

      {/* 선택된 플랫폼별 발행 컴포넌트 */}
      {selectedPlatform === 'naver' && (
        <NaverPublishUI
          data={setupData}
          editedContent={editedContent}
          imageUrls={images}
          onComplete={(result) => {
            console.log('네이버 발행 완료:', result);
          }}
          copyToClipboard={async () => {
            try {
              // editorRef (실제 DOM 요소)를 사용하여 복사
              if (editorRef.current) {
                // HTML 형식으로 복사하기 위해 선택 영역 생성
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                selection?.removeAllRanges();
                selection?.addRange(range);
                
                // 복사 실행
                const success = document.execCommand('copy');
                
                // 선택 해제
                selection?.removeAllRanges();
                
                if (success) {
                  console.log('✅ HTML 형식으로 클립보드에 복사되었습니다! (editorRef 사용)');
                  return true;
                } else {
                  throw new Error('복사 명령 실행 실패');
                }
              } else {
                throw new Error('에디터 참조를 찾을 수 없습니다');
              }
            } catch (err) {
              console.error('복사 실패:', err);
              // 대체 방법: editedContent로 텍스트 복사
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = editedContent;
              const textContent = tempDiv.innerText || '';
              await navigator.clipboard.writeText(textContent);
              console.log('⚠️ 텍스트 형식으로 복사되었습니다.');
              return false;
            }
          }}
        />
      )}

      {selectedPlatform && selectedPlatform !== 'naver' && (
        <div className="section-card" style={{padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
              🚧 {getPlatformName(selectedPlatform)} 발행 기능 준비 중
            </div>
            <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
              해당 플랫폼의 발행 기능은 곧 구현될 예정입니다.
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="mt-8 flex justify-between items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        {/* 왼쪽: 이전으로 가기 */}
        <Button 
          onClick={onGoBack} 
          variant="secondary"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors duration-200"
        >
          <span>←</span>
          <span>이전으로 가기</span>
        </Button>
        
        {/* 가운데: 발행 버튼 (다른 플랫폼용) */}
        <div className="flex space-x-3">
          {selectedPlatform && selectedPlatform !== 'naver' && (Object.keys(images).length === imagePositions.length || imagePositions.length === 0) && (
            <Button 
              onClick={handlePublish}
              variant="publish"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors duration-200 shadow-lg shadow-emerald-500/25"
            >
              <span>📤</span>
              <span>{getPlatformName(selectedPlatform)}에 발행하기</span>
            </Button>
          )}
        </div>
        
        {/* 오른쪽: 처음부터 다시 */}
        <Button 
          onClick={onReset}
          variant="danger"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors duration-200"
        >
          <span>🔄</span>
          <span>처음부터 다시</span>
        </Button>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Step2Generation;