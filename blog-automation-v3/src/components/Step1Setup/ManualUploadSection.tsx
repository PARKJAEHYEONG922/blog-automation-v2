import React from 'react';

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
  if (!selectedTitle) return null;

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
        backgroundColor: '#6c757d',
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
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        const target = e.target as HTMLLabelElement;
        target.style.backgroundColor = '#5a6268';
        target.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const target = e.target as HTMLLabelElement;
        target.style.backgroundColor = '#6c757d';
        target.style.transform = 'translateY(0)';
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
    </div>
  );
};

export default ManualUploadSection;