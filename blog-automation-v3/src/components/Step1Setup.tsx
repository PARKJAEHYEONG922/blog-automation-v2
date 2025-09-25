import React, { useState } from 'react';

interface Step1Props {
  onComplete: (data: {
    writingStyle: string;
    seoGuide: string; 
    topic: string;
  }) => void;
}

const Step1Setup: React.FC<Step1Props> = ({ onComplete }) => {
  const [writingStyle, setWritingStyle] = useState('');
  const [seoGuide, setSeoGuide] = useState('');
  const [topic, setTopic] = useState('');

  const handleFileUpload = (type: 'writingStyle' | 'seoGuide', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === 'writingStyle') {
        setWritingStyle(content);
      } else {
        setSeoGuide(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (writingStyle && seoGuide && topic) {
      onComplete({ writingStyle, seoGuide, topic });
    } else {
      alert('모든 항목을 입력해주세요!');
    }
  };

  return (
    <div className="step1-container">
      <h2>📝 1단계: 기본 설정</h2>
      
      {/* 말투 문서 업로드 */}
      <div className="upload-section">
        <h3>✍️ 나만의 말투 문서</h3>
        <p className="description">
          평소 블로그에 쓰는 글들을 복사해서 텍스트 파일로 만든 후 업로드하세요.
        </p>
        <input
          type="file"
          accept=".txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload('writingStyle', file);
          }}
        />
        {writingStyle && (
          <div className="file-preview">
            <p>✅ 말투 문서 업로드됨 ({writingStyle.length}자)</p>
            <textarea 
              value={writingStyle.slice(0, 300) + '...'}
              readOnly
              rows={3}
            />
          </div>
        )}
      </div>

      {/* SEO 가이드 업로드 */}
      <div className="upload-section">
        <h3>📊 네이버 SEO 가이드</h3>
        <p className="description">
          네이버 블로그 SEO 최적화 가이드 문서를 업로드하세요.
        </p>
        <input
          type="file"
          accept=".txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload('seoGuide', file);
          }}
        />
        {seoGuide && (
          <div className="file-preview">
            <p>✅ SEO 가이드 업로드됨 ({seoGuide.length}자)</p>
            <textarea 
              value={seoGuide.slice(0, 300) + '...'}
              readOnly
              rows={3}
            />
          </div>
        )}
      </div>

      {/* 주제 입력 */}
      <div className="topic-section">
        <h3>🎯 블로그 주제</h3>
        <p className="description">
          어떤 주제로 글을 작성하고 싶은지 입력하세요.
        </p>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 강아지 산책 훈련 방법"
          rows={3}
        />
      </div>

      <button 
        className="next-button"
        onClick={handleSubmit}
        disabled={!writingStyle || !seoGuide || !topic}
      >
        다음 단계로 →
      </button>
    </div>
  );
};

export default Step1Setup;