import React, { useState, useEffect, useRef } from 'react';
import Button from '@/shared/components/ui/Button';
import { ContentProcessor } from '@/02-generation/services/content-processor';

interface ContentEditorSectionProps {
  originalContent: string;
  editedContent: string;
  onContentChange: (content: string) => void;
  charCount: number;
  charCountWithSpaces: number;
  editorRef: React.RefObject<HTMLDivElement>;
}

const ContentEditorSection: React.FC<ContentEditorSectionProps> = ({
  originalContent,
  editedContent,
  onContentChange,
  charCount,
  charCountWithSpaces,
  editorRef
}) => {
  const [currentFontSize, setCurrentFontSize] = useState('15px');
  const [activeTab, setActiveTab] = useState<'original' | 'edited'>('edited');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // v2와 동일한 폰트 크기 옵션
  const fontSizes = [
    { name: '대제목 (24px)', size: '24px', weight: 'bold' },
    { name: '소제목 (19px)', size: '19px', weight: 'bold' },
    { name: '강조 (16px)', size: '16px', weight: 'bold' },
    { name: '일반 (15px)', size: '15px', weight: 'normal' }
  ];

  // v2와 동일한 콘텐츠 변경 처리
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onContentChange(newContent);
    }
  };

  // v2와 동일한 원본 복원 처리
  const restoreOriginal = () => {
    if (originalContent) {
      const processedContent = ContentProcessor.processMarkdown(originalContent);
      onContentChange(processedContent);
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

  // 편집된 콘텐츠가 변경될 때 에디터에 반영 (초기 로딩 시에만)
  useEffect(() => {
    if (editedContent && editorRef.current && isInitialLoad) {
      editorRef.current.innerHTML = editedContent;
      setIsInitialLoad(false);
    }
  }, [editedContent, isInitialLoad]);

  // activeTab이 'edited'로 변경될 때도 에디터에 콘텐츠 반영
  useEffect(() => {
    if (activeTab === 'edited' && editedContent && editorRef.current) {
      editorRef.current.innerHTML = editedContent;
    }
  }, [activeTab, editedContent]);

  return (
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
  );
};

export default ContentEditorSection;
