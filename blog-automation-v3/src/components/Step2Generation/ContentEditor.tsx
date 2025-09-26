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
    <div className="content-section" style={{ marginBottom: '24px' }}>
      {/* 탭 헤더와 글씨 크기 컨트롤 */}
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
            onClick={() => onTabChange('edited')}
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
            onClick={() => onTabChange('original')}
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

        {/* 글씨 크기 및 편집 버튼 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 글씨 크기 선택 */}
          <select
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              cursor: 'pointer'
            }}
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

      {activeTab === 'edited' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          {/* 글자 수 표시 */}
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0 8px 8px 8px',
        backgroundColor: '#ffffff',
        minHeight: '400px'
      }}>
        {activeTab === 'edited' ? (
          // v2 Step3과 동일한 contentEditable div 편집기
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
              fontSize: `${fontSize}px`,
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
          // 원본 콘텐츠 (읽기 전용)
          <div 
            className="original-content"
            style={{
              padding: '20px',
              fontSize: `${fontSize}px`,
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
        /* 편집기 포커스 스타일 */
        #step3-editor:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }
      `}</style>

      {activeTab === 'edited' && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
          💡 <strong>편집 팁:</strong> 텍스트 선택 후 폰트 크기 변경 | 네이버 블로그 완전 호환 방식 | Ctrl+1~4로 폰트 크기 단축키
        </div>
      )}
    </div>
  );
};

export default ContentEditor;