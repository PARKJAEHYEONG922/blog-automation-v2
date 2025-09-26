import React from 'react';

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

interface DocumentUploadSectionProps {
  savedWritingStyles: SavedDocument[];
  savedSeoGuides: SavedDocument[];
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
  onToggleWritingStyle: (doc: SavedDocument) => void;
  onToggleSeoGuide: (doc: SavedDocument) => void;
  onFileUpload: (type: 'writingStyle' | 'seoGuide', file: File) => void;
  onOpenDeleteDialog: (type: 'writingStyle' | 'seoGuide', docId: string, docName: string) => void;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  savedWritingStyles,
  savedSeoGuides,
  selectedWritingStyles,
  selectedSeoGuide,
  onToggleWritingStyle,
  onToggleSeoGuide,
  onFileUpload,
  onOpenDeleteDialog,
}) => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '2px solid #e9ecef',
      borderRadius: '16px',
      padding: '25px',
      marginBottom: '40px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h3 style={{ color: '#495057', fontSize: '20px', marginBottom: '8px' }}>📚 문서 업로드</h3>
        <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
          블로그 글 생성에 사용할 참고 문서들을 업로드하세요
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '25px' }}>
        {/* 말투 문서 */}
        <div style={{ flex: '1' }}>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '8px', fontSize: '16px' }}>✍️ 나만의 말투 문서</h4>
            <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '16px' }}>
              평소 블로그 글 스타일 참고용 (최대 2개)
            </p>
          
            <input
              type="file"
              accept=".txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload('writingStyle', file);
              }}
              style={{
                padding: '8px',
                border: '2px dashed #dee2e6',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                width: '100%',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            />

            {savedWritingStyles.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {savedWritingStyles.map(doc => {
                    const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
                    return (
                      <div key={doc.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#e8f5e8' : '#f8f9fa',
                        border: isSelected ? '2px solid #28a745' : '1px solid #dee2e6',
                        borderRadius: '15px',
                        padding: '4px 10px',
                        fontSize: '12px'
                      }}>
                        <span
                          onClick={() => onToggleWritingStyle(doc)}
                          style={{ cursor: 'pointer', color: '#495057', marginRight: '6px' }}
                        >
                          {isSelected ? '✅ ' : ''}{doc.name}
                        </span>
                        <button
                          onClick={() => onOpenDeleteDialog('writingStyle', doc.id, doc.name)}
                          style={{
                            background: 'none', border: 'none', color: '#dc3545',
                            cursor: 'pointer', fontSize: '12px', padding: '0'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                {selectedWritingStyles.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#6c757d' }}>
                    선택: {selectedWritingStyles.length}/2
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEO 가이드 */}
        <div style={{ flex: '1' }}>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '8px', fontSize: '16px' }}>📊 네이버 SEO 가이드</h4>
            <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '16px' }}>
              SEO 최적화 가이드 (1개 선택)
            </p>
          
            <input
              type="file"
              accept=".txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload('seoGuide', file);
              }}
              style={{
                padding: '8px',
                border: '2px dashed #dee2e6',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                width: '100%',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            />

            {savedSeoGuides.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {savedSeoGuides.map(doc => {
                    const isSelected = selectedSeoGuide?.id === doc.id;
                    return (
                      <div key={doc.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#e3f2fd' : '#f8f9fa',
                        border: isSelected ? '2px solid #2196f3' : '1px solid #dee2e6',
                        borderRadius: '15px',
                        padding: '4px 10px',
                        fontSize: '12px'
                      }}>
                        <span
                          onClick={() => onToggleSeoGuide(doc)}
                          style={{ cursor: 'pointer', color: '#495057', marginRight: '6px' }}
                        >
                          {isSelected ? '📘 ' : '📄 '}{doc.name}
                        </span>
                        <button
                          onClick={() => onOpenDeleteDialog('seoGuide', doc.id, doc.name)}
                          style={{
                            background: 'none', border: 'none', color: '#dc3545',
                            cursor: 'pointer', fontSize: '12px', padding: '0'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                {selectedSeoGuide && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#6c757d' }}>
                    선택: {selectedSeoGuide.name}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadSection;