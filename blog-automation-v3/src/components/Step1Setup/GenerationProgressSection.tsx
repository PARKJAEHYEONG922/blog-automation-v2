import React from 'react';

interface GenerationProgressSectionProps {
  isGenerating: boolean;
  generationStep: string;
}

const GenerationProgressSection: React.FC<GenerationProgressSectionProps> = ({
  isGenerating,
  generationStep,
}) => {
  if (!isGenerating) return null;

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '2px solid #007bff',
      borderRadius: '16px',
      padding: '25px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '4px solid #007bff',
        borderTop: '4px solid transparent',
        borderRadius: '50%',
        margin: '0 auto 16px auto',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{ color: '#007bff', fontSize: '16px', margin: 0, fontWeight: 'bold' }}>
        {generationStep}
      </p>
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#1565c0'
      }}>
        💡 선택된 제목과 키워드로 AI가 최적화된 블로그 글을 생성하고 있습니다
      </div>
    </div>
  );
};

export default GenerationProgressSection;