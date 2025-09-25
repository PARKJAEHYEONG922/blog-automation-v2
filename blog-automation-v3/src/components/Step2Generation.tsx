import React, { useState } from 'react';

interface Step2Props {
  setupData: {
    writingStyle: string;
    seoGuide: string;
    topic: string;
  };
  onComplete: (content: string) => void;
  onBack: () => void;
}

const Step2Generation: React.FC<Step2Props> = ({ setupData, onComplete, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [uploadedContent, setUploadedContent] = useState<string>('');

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenerationStep('클로드 웹 브라우저 열기...');
    
    try {
      // Playwright로 클로드 웹 자동화
      await window.electronAPI.openClaudeWeb();
      setGenerationStep('문서 업로드 중...');
      
      // 말투 문서 + SEO 가이드 + 주제를 클로드에 전송
      const prompt = `
다음 문서들을 참고해서 블로그 글을 작성해주세요.

## 말투 참고 문서:
${setupData.writingStyle}

## SEO 가이드:
${setupData.seoGuide}

## 주제:
${setupData.topic}

위 말투와 SEO 가이드를 참고해서, 주제에 맞는 블로그 글을 작성해주세요. 
이미지가 필요한 위치에는 (이미지)라고 표시해주세요.
`;
      
      await window.electronAPI.sendToClaudeWeb(prompt);
      setGenerationStep('AI 응답 생성 중...');
      
      // AI 응답 완료 대기
      await window.electronAPI.waitForClaudeResponse();
      setGenerationStep('마크다운 다운로드 중...');
      
      // 다운로드 버튼 클릭
      const content = await window.electronAPI.downloadFromClaude();
      setUploadedContent(content);
      setGenerationStep('완료!');
      
      setTimeout(() => {
        onComplete(content);
      }, 1000);
      
    } catch (error) {
      console.error('생성 실패:', error);
      setGenerationStep('오류 발생: ' + error);
      setIsGenerating(false);
    }
  };

  const handleManualUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setUploadedContent(content);
      onComplete(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="step2-container">
      <h2>🤖 2단계: AI 글 생성</h2>
      
      <div className="generation-options">
        {/* 자동 생성 */}
        <div className="auto-generation">
          <h3>🚀 자동 생성</h3>
          <p>클로드 웹에 자동으로 연결해서 글을 생성합니다.</p>
          
          {!isGenerating ? (
            <button 
              className="generate-button"
              onClick={handleStartGeneration}
            >
              자동으로 글 생성하기
            </button>
          ) : (
            <div className="generation-progress">
              <div className="loading-spinner"></div>
              <p>{generationStep}</p>
            </div>
          )}
        </div>

        <div className="divider">또는</div>

        {/* 수동 업로드 */}
        <div className="manual-upload">
          <h3>📁 수동 업로드</h3>
          <p>클로드 웹에서 직접 생성한 마크다운 파일을 업로드하세요.</p>
          
          <input
            type="file"
            accept=".md,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleManualUpload(file);
            }}
          />
        </div>
      </div>

      {uploadedContent && (
        <div className="content-preview">
          <h3>📄 미리보기</h3>
          <textarea
            value={uploadedContent.slice(0, 500) + '...'}
            readOnly
            rows={8}
          />
          <p>길이: {uploadedContent.length}자</p>
        </div>
      )}

      <div className="step-buttons">
        <button onClick={onBack}>← 이전 단계</button>
      </div>
    </div>
  );
};

export default Step2Generation;