import React, { useState } from 'react';

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

interface ManualUploadSectionProps {
  selectedTitle: string;
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
  blogContent: string;
  mainKeyword: string;
  subKeywords: string;
  onFileUploaded: (content: string) => void;
}

const ManualUploadSection: React.FC<ManualUploadSectionProps> = ({
  selectedTitle,
  selectedWritingStyles,
  selectedSeoGuide,
  blogContent,
  mainKeyword,
  subKeywords,
  onFileUploaded,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <div style={{ 
        marginBottom: '12px', 
        fontSize: '12px', 
        color: '#6c757d',
        fontStyle: 'italic'
      }}>
        또는
      </div>
      <label style={{
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
      }}
      onMouseEnter={(e) => {
        const target = e.target as HTMLLabelElement;
        target.style.backgroundColor = '#2563eb';
        target.style.transform = 'translateY(-2px)';
        target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
      }}
      onMouseLeave={(e) => {
        const target = e.target as HTMLLabelElement;
        target.style.backgroundColor = '#3b82f6';
        target.style.transform = 'translateY(0)';
        target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
      }}>
        📄 직접 글 업로드
        <input
          type="file"
          accept=".md,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const content = event.target?.result as string;
                onFileUploaded(content);
              };
              reader.readAsText(file);
            }
          }}
        />
      </label>
      
      {/* 접이식 업로드 주의사항 */}
      <div style={{ marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: '0 auto',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          📋 업로드 주의사항 {showGuide ? '▲' : '▼'}
        </button>
        
        {showGuide && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400e',
            textAlign: 'left',
            maxWidth: '500px',
            margin: '12px auto 0 auto'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: '#b45309' }}>
              ⚠️ 직접 업로드 시 반드시 확인하세요!
            </div>
            
            <div style={{ lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>1️⃣ 파일 형식:</strong> <code>.md</code> 파일만 업로드 가능합니다.
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <strong>2️⃣ Claude 아티팩트 사용:</strong><br />
                • Claude에서 글 작성 후 아티팩트 우측 상단의 다운로드 버튼 클릭<br />
                • <strong>"Markdown(으)로 다운로드"</strong> 선택해서 .md 파일 저장
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <strong>3️⃣ 이미지 태그 필수:</strong><br />
                • 글 작성 시 Claude에게 <strong>"이미지가 들어갈 위치에 (이미지) 태그를 넣어달라"</strong>고 요청<br />
                • 예시: "설명 텍스트... (이미지) ...다음 내용..."
              </div>
              
              <div style={{ 
                backgroundColor: '#fff8dc', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                fontSize: '12px'
              }}>
                💡 <strong>팁:</strong> Claude에게 "블로그 글을 작성하되, 이미지가 필요한 부분에 (이미지) 태그를 넣어주세요"라고 요청하면 자동으로 적절한 위치에 태그를 넣어줍니다.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualUploadSection;