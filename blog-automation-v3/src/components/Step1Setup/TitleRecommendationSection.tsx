import React from 'react';

interface TitleRecommendationSectionProps {
  generatedTitles: string[];
  selectedTitle: string;
  isGeneratingTitles: boolean;
  isGenerating: boolean;
  mainKeyword: string;
  onGenerateTitles: () => void;
  onSelectTitle: (title: string) => void;
  onStartGeneration: () => void;
}

const TitleRecommendationSection: React.FC<TitleRecommendationSectionProps> = ({
  generatedTitles,
  selectedTitle,
  isGeneratingTitles,
  isGenerating,
  mainKeyword,
  onGenerateTitles,
  onSelectTitle,
  onStartGeneration,
}) => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '15px'
      }}>
        <h4 style={{ color: '#495057', margin: 0, fontSize: '16px' }}>
          🎯 AI 추천 제목 
          {generatedTitles.length > 0 && <span style={{ color: '#28a745', fontWeight: 'normal' }}>({generatedTitles.length}개 생성됨)</span>}
        </h4>
        
        {/* 제목 생성 버튼 - 오른쪽 배치 */}
        <button
          onClick={onGenerateTitles}
          disabled={isGeneratingTitles || !mainKeyword.trim()}
          style={{
            backgroundColor: isGeneratingTitles ? '#6c757d' : (generatedTitles.length > 0 ? '#28a745' : '#007bff'),
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: isGeneratingTitles ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: !mainKeyword.trim() ? 0.5 : 1,
            transition: 'all 0.3s ease',
            minWidth: '140px',
            justifyContent: 'center'
          }}
        >
          {isGeneratingTitles ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              생성 중...
            </>
          ) : generatedTitles.length > 0 ? (
            <>
              🔄 재생성
            </>
          ) : (
            <>
              ✨ 제목 생성
            </>
          )}
        </button>
      </div>
      
      {/* 제목이 생성되기 전 안내 메시지 */}
      {generatedTitles.length === 0 && !isGeneratingTitles && (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          color: '#6c757d',
          fontSize: '14px',
          backgroundColor: '#fff',
          border: '2px dashed #dee2e6',
          borderRadius: '8px'
        }}>
          📝 메인키워드를 입력하고 "제목 생성" 버튼을 클릭해주세요
        </div>
      )}
      
      {/* 제목 생성 중 표시 */}
      {isGeneratingTitles && (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          color: '#007bff',
          fontSize: '14px',
          backgroundColor: '#fff',
          border: '2px solid #007bff',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #007bff',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            margin: '0 auto 12px auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          AI가 매력적인 제목 10개를 생성하고 있습니다...
        </div>
      )}
      
      {/* 제목 선택 드롭다운 */}
      {generatedTitles.length > 0 && !isGeneratingTitles && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              사용할 제목 선택 *
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => onSelectTitle(e.target.value)}
              style={{
                width: '100%',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">제목을 선택해주세요...</option>
              {generatedTitles.map((title, index) => (
                <option key={index} value={title}>
                  {index + 1}. {title}
                </option>
              ))}
            </select>
          </div>
          
          {/* 선택된 제목 표시 */}
          {selectedTitle && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #c3e6cb',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold', marginBottom: '4px' }}>
                ✅ 선택된 제목
              </div>
              <div style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                {selectedTitle}
              </div>
            </div>
          )}
          
          {/* 글 생성 버튼 */}
          {selectedTitle && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={onStartGeneration}
                disabled={isGenerating}
                style={{
                  backgroundColor: isGenerating ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#218838';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    글 생성 중...
                  </>
                ) : (
                  <>
                    🚀 선택한 제목으로 글 생성하기
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TitleRecommendationSection;