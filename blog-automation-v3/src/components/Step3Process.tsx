import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

interface Step3Props {
  content: string;
  onReset: () => void;
}

const Step3Process: React.FC<Step3Props> = ({ content, onReset }) => {
  const [processedContent, setProcessedContent] = useState<string>('');
  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [images, setImages] = useState<{[key: string]: string}>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  useEffect(() => {
    // 마크다운 파싱 및 이미지 위치 찾기
    const imageRegex = /\(이미지\)/g;
    const positions: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      positions.push(`이미지${positions.length + 1}`);
    }
    
    setImagePositions(positions);
    setProcessedContent(content);
  }, [content]);

  const generateImagePrompts = async () => {
    setIsGeneratingImages(true);
    
    try {
      // API를 통해 이미지 프롬프트 생성
      const response = await window.electronAPI.generateImagePrompts({
        content: content,
        imageCount: imagePositions.length
      });
      
      // 각 프롬프트로 이미지 생성
      const generatedImages: {[key: string]: string} = {};
      
      for (let i = 0; i < response.prompts.length; i++) {
        const prompt = response.prompts[i];
        const imageKey = `이미지${i + 1}`;
        
        const imageUrl = await window.electronAPI.generateImage(prompt);
        generatedImages[imageKey] = imageUrl;
      }
      
      setImages(generatedImages);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const replaceImagesInContent = () => {
    let finalContent = processedContent;
    
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
    const finalContent = replaceImagesInContent();
    // v2의 발행 로직 재사용
    window.electronAPI.publishToBlog(finalContent);
  };

  return (
    <div className="step3-container">
      <h2>🎨 3단계: 이미지 생성 및 완성</h2>
      
      {/* 콘텐츠 미리보기 */}
      <div className="content-section">
        <h3>📄 생성된 콘텐츠</h3>
        <div 
          className="content-preview"
          dangerouslySetInnerHTML={{ __html: marked(processedContent) }}
        />
      </div>

      {/* 이미지 섹션 */}
      <div className="image-section">
        <h3>🖼️ 이미지 생성 ({imagePositions.length}개)</h3>
        
        {imagePositions.length > 0 ? (
          <>
            {!isGeneratingImages && Object.keys(images).length === 0 && (
              <button 
                className="generate-images-button"
                onClick={generateImagePrompts}
              >
                이미지 자동 생성하기
              </button>
            )}
            
            {isGeneratingImages && (
              <div className="generating-images">
                <div className="loading-spinner"></div>
                <p>이미지 생성 중... ({Object.keys(images).length}/{imagePositions.length})</p>
              </div>
            )}
            
            <div className="images-grid">
              {imagePositions.map((imageKey, index) => (
                <div key={imageKey} className="image-item">
                  <h4>{imageKey}</h4>
                  {images[imageKey] ? (
                    <img src={images[imageKey]} alt={imageKey} />
                  ) : (
                    <div className="image-placeholder">
                      {isGeneratingImages ? '생성 중...' : '대기 중...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>이미지가 필요하지 않은 글입니다.</p>
        )}
      </div>

      {/* 최종 완성본 */}
      {Object.keys(images).length === imagePositions.length && imagePositions.length > 0 && (
        <div className="final-content">
          <h3>✨ 최종 완성본</h3>
          <div 
            className="final-preview"
            dangerouslySetInnerHTML={{ __html: marked(replaceImagesInContent()) }}
          />
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="action-buttons">
        <button onClick={onReset}>🔄 처음부터 다시</button>
        
        {(Object.keys(images).length === imagePositions.length || imagePositions.length === 0) && (
          <button 
            className="publish-button"
            onClick={handlePublish}
          >
            📤 블로그에 발행하기
          </button>
        )}
      </div>
    </div>
  );
};

export default Step3Process;