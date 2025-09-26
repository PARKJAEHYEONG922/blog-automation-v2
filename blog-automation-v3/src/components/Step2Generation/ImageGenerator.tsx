import React from 'react';

interface ImageGeneratorProps {
  imagePositions: string[];
  images: {[key: string]: string};
  isGeneratingImages: boolean;
  onGenerateImages: () => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  imagePositions,
  images,
  isGeneratingImages,
  onGenerateImages
}) => {
  return (
    <div className="image-section">
      <h3>🖼️ 이미지 생성 ({imagePositions.length}개)</h3>
      
      {imagePositions.length > 0 ? (
        <>
          {!isGeneratingImages && Object.keys(images).length === 0 && (
            <button 
              className="generate-images-button"
              onClick={onGenerateImages}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '20px'
              }}
            >
              이미지 자동 생성하기
            </button>
          )}
          
          {isGeneratingImages && (
            <div className="generating-images" style={{
              textAlign: 'center',
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #3b82f6',
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                margin: '0 auto 12px auto',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ margin: 0, color: '#1e40af' }}>
                이미지 생성 중... ({Object.keys(images).length}/{imagePositions.length})
              </p>
            </div>
          )}
          
          <div className="images-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {imagePositions.map((imageKey, index) => (
              <div key={imageKey} className="image-item" style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#fafafa'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {imageKey}
                </h4>
                {images[imageKey] ? (
                  <img 
                    src={images[imageKey]} 
                    alt={imageKey} 
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '6px'
                    }}
                  />
                ) : (
                  <div className="image-placeholder" style={{
                    width: '100%',
                    height: '200px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    {isGeneratingImages ? '생성 중...' : '대기 중...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          margin: 0
        }}>
          이미지가 필요하지 않은 글입니다.
        </p>
      )}
    </div>
  );
};

export default ImageGenerator;