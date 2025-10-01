import React, { useRef, useState, useEffect } from 'react';
import { marked } from 'marked';

interface ContentEditorProps {
  originalContent: string;
  editableContent: string;
  activeTab: 'original' | 'edited';
  fontSize: number;
  isEditing: boolean;
  onTabChange: (tab: 'original' | 'edited') => void;
  onFontSizeChange: (size: number) => void;
  onContentChange: (content: string) => void;
  onEditingChange: (editing: boolean) => void;
  onResetContent: () => void;
  onEditComplete: () => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  originalContent,
  editableContent,
  activeTab,
  fontSize,
  isEditing,
  onTabChange,
  onFontSizeChange,
  onContentChange,
  onEditingChange,
  onResetContent,
  onEditComplete
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [charCount, setCharCount] = useState(0);
  const [charCountWithSpaces, setCharCountWithSpaces] = useState(0);

  // editableContent가 변경될 때 editorRef에 내용 설정
  useEffect(() => {
    if (editorRef.current && editableContent) {
      editorRef.current.innerHTML = editableContent;
      updateCharCount();
    }
  }, [editableContent]);

  // 글자 수 계산 함수
  const updateCharCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const textWithoutSpaces = text.replace(/\s/g, '');
      setCharCount(textWithoutSpaces.length);
      setCharCountWithSpaces(text.length);
    }
  };

  // 편집기 내용 변경 처리
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onContentChange(newContent);
      updateCharCount();
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 폰트 크기 단축키
    if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const sizes = [15, 16, 19, 24];
      const newSize = sizes[parseInt(e.key) - 1];
      onFontSizeChange(newSize);
      
      // 선택된 텍스트에 폰트 크기 적용
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        document.execCommand('fontSize', false, '1');
        // 방금 적용된 font 태그를 찾아서 스타일로 변경
        const fontElements = editorRef.current?.querySelectorAll('font[size="1"]');
        fontElements?.forEach(el => {
          const span = document.createElement('span');
          span.style.fontSize = `${newSize}px`;
          span.innerHTML = el.innerHTML;
          el.parentNode?.replaceChild(span, el);
        });
      }
    }
  };

  // 클릭 이벤트 처리
  const handleClick = () => {
    updateCharCount();
  };

  // 클립보드로 복사
  const copyToClipboard = async () => {
    if (editorRef.current) {
      try {
        const content = editorRef.current.innerHTML;
        await navigator.clipboard.writeText(content);
        // 성공 메시지는 부모 컴포넌트에서 처리
      } catch (error) {
        console.error('복사 실패:', error);
      }
    }
  };

  return (
    <div className="content-section mb-6">
      {/* 탭 헤더와 글씨 크기 컨트롤 */}
      <div className="flex justify-between items-center mb-4 border-b-2 border-gray-200 pb-3">
        {/* 탭 버튼들 */}
        <div className="flex space-x-1">
          <button
            onClick={() => onTabChange('edited')}
            className={`
              px-5 py-3 text-sm font-semibold rounded-t-lg border-t border-l border-r transition-all duration-200
              ${activeTab === 'edited' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-transparent text-gray-600 border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            📝 자동편집 콘텐츠
          </button>
          <button
            onClick={() => onTabChange('original')}
            className={`
              px-5 py-3 text-sm font-semibold rounded-t-lg border-t border-l border-r transition-all duration-200
              ${activeTab === 'original' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-transparent text-gray-600 border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            📄 원본 콘텐츠
          </button>
        </div>

        {/* 글씨 크기 및 편집 버튼 */}
        <div className="flex space-x-2 items-center">
          {/* 글씨 크기 선택 */}
          <select
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm cursor-pointer focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
          >
            <option value={15}>15px</option>
            <option value={16}>16px</option>
            <option value={19}>19px</option>
            <option value={24}>24px</option>
          </select>

          {/* 기능 버튼들 */}
          {activeTab === 'edited' && (
            <>
              <button
                onClick={onResetContent}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
              >
                <span>🔄</span>
                <span>원본 복원</span>
              </button>
              
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
              >
                <span>📋</span>
                <span>복사</span>
              </button>
            </>
          )}

        </div>
      </div>

      {activeTab === 'edited' && (
        <div className="flex justify-between items-center mb-2">
          {/* 글자 수 표시 */}
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
            글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="border border-gray-200 rounded-r-xl rounded-b-xl bg-white min-h-96 shadow-sm">
        {activeTab === 'edited' ? (
          // v2 Step3과 동일한 contentEditable div 편집기
          <div
            ref={editorRef}
            id="step3-editor"
            contentEditable
            className="w-full min-h-96 max-h-150 p-4 border-none rounded-r-xl rounded-b-xl bg-white relative z-10 overflow-y-auto outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset transition-all duration-200"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.8',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            suppressContentEditableWarning={true}
          />
        ) : (
          // 원본 콘텐츠 (읽기 전용)
          <div 
            className="original-content p-5 h-125 max-h-125 overflow-y-auto text-gray-700 bg-gray-50 font-mono whitespace-pre-wrap break-words border border-gray-200 rounded-r-xl rounded-b-xl"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.7'
            }}
          >
            {originalContent || '원본 콘텐츠가 없습니다.'}
          </div>
        )}
      </div>

      {/* v2 Step3과 동일한 CSS 스타일 */}
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
        /* 네이버 블로그 표 스타일 */
        .se-component {
          margin: 16px auto;
          text-align: center;
        }
        .se-table {
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }
        .se-table-content {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
          margin: 0 auto;
        }
        .se-cell {
          border: 1px solid #ddd;
          padding: 8px;
          vertical-align: top;
          text-align: center;
        }
        .se-tr {
          border: none;
        }
        .se-module-text {
          margin: 0;
          padding: 0;
        }
        /* 편집기 포커스 스타일 */
        #step3-editor:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }
      `}</style>

      {activeTab === 'edited' && (
        <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span>💡</span>
            <span><strong>편집 팁:</strong> 텍스트 선택 후 폰트 크기 변경 | 네이버 블로그 완전 호환 방식 | Ctrl+1~4로 폰트 크기 단축키</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;